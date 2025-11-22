import { GraphQLError } from "graphql"
import mercurius from "mercurius"
import { SiweMessage } from "siwe"
import { graphql } from "solidify.js"

const { ErrorWithProps } = mercurius

const authMutations = {
  signInWithEthereum: {
    type: graphql.type("NonNull", graphql.type("String")),
    args: {
      message: { type: graphql.type("NonNull", graphql.type("String")) },
      signature: { type: graphql.type("NonNull", graphql.type("String")) },
    },
    resolve: async (_parent, { message, signature }, context) => {
      const { request } = context
      const _selfNode = await request.config.getSelfNode()

      const startTime = Date.now()

      try {
        request.log.debug(
          {
            messageLength: message.length,
            signatureLength: signature.length,
          },
          "SIWE authentication started",
        )

        // 1. 解析 SIWE 消息
        const siweMessage = new SiweMessage(message)

        // 2. 验证消息和签名
        let verificationResult
        try {
          verificationResult = await siweMessage.verify({ signature })
        } catch (verifyError) {
          request.log.warn(
            {
              error: verifyError.message,
            },
            "SIWE signature verification failed",
          )
          throw new ErrorWithProps("Invalid signature or message.", {
            code: "INVALID_SIGNATURE",
          })
        }

        const { success, data } = verificationResult

        if (!success) {
          request.log.warn("SIWE verification returned unsuccessful result")
          throw new ErrorWithProps("Invalid signature or message.", {
            code: "INVALID_SIGNATURE",
          })
        }

        const { address, nonce } = data
        request.log.debug({ address }, "SIWE message verified successfully")

        // --- NEW: Verify nonce JWT ---
        try {
          // Verify the nonce JWT using Fastify's JWT plugin
          // This will automatically check expiry, signature, and audience
          const decodedNonce = await context.app.jwt.verify(
            Buffer.from(nonce, "base64").toString("utf8"),
          )

          // 验证 nonce JWT 的 audience
          if (decodedNonce.aud !== "nonce") {
            request.log.warn(
              {
                expected: "nonce",
                actual: decodedNonce.aud,
              },
              "Nonce JWT audience mismatch",
            )
            throw new ErrorWithProps("Invalid nonce JWT audience.", {
              code: "INVALID_NONCE",
            })
          }

          // 验证 nonce JWT 的地址匹配
          if (decodedNonce.sub !== address) {
            request.log.warn(
              {
                expected: address,
                actual: decodedNonce.sub,
              },
              "Nonce JWT address mismatch",
            )
            throw new ErrorWithProps("Invalid nonce JWT address.", {
              code: "INVALID_NONCE",
            })
          }
        } catch (nonceVerifyError) {
          request.log.error(
            {
              error: nonceVerifyError.message,
              address,
            },
            "Nonce JWT verification failed",
          )
          throw new ErrorWithProps("Invalid or expired nonce.", {
            code: "EXPIRED_NONCE",
          })
        }
        // --- END NEW ---

        // --- 修正后的步骤 4: 验证签名者是否为本节点所有者 ---
        const selfNode = await request.config.getSelfNode()
        if (!selfNode) {
          request.log.error("Self node not configured")
          throw new ErrorWithProps(
            "Self node not configured. Authentication failed.",
            { code: "UNAUTHENTICATED" },
          )
        }

        if (address.toLowerCase() !== selfNode.address.toLowerCase()) {
          request.log.warn(
            {
              signerAddress: address,
              expectedAddress: selfNode.address,
            },
            "Unauthenticated: Signer is not the node owner",
          )
          throw new ErrorWithProps(
            "Unauthenticated: Signer is not the node owner.",
            { code: "UNAUTHENTICATED" },
          )
        }

        // 5. 生成 JWT token (using Fastify's JWT plugin)
        // Get JWT expiration from request config cache
        const jwtExpiresIn = await request.config.getSetting(
          "jwt_expires_in",
          "24h",
        )

        const token = await context.app.jwt.sign(
          {
            aud: "client",
            sub: address,
            iss: selfNode.address,
          },
          { expiresIn: jwtExpiresIn },
        )

        const duration = Date.now() - startTime
        request.log.info(
          {
            address,
            duration: `${duration}ms`,
            success: true,
          },
          "SIWE authentication successful",
        )
        return token
      } catch (error) {
        const duration = Date.now() - startTime
        request.log.error(
          {
            error: error.message,
            duration: `${duration}ms`,
            success: false,
          },
          "SIWE authentication failed",
        )

        // 如果已经是 ErrorWithProps，直接重新抛出
        if (error.extensions?.code) {
          throw error
        }

        // 对于其他错误，根据错误类型进行分类
        if (error.message?.includes("Invalid signature")) {
          throw new ErrorWithProps("Invalid signature or message.", {
            code: "INVALID_SIGNATURE",
          })
        }

        if (error.message?.includes("Invalid or expired nonce")) {
          throw new ErrorWithProps("Invalid or expired nonce.", {
            code: "EXPIRED_NONCE",
          })
        }

        // 对于 SIWE 消息解析错误或其他认证失败
        request.log.error(
          {
            error: error.message,
            stack: error.stack,
          },
          "SIWE authentication failed",
        )
        throw new ErrorWithProps("Authentication failed.", {
          code: "UNAUTHENTICATED",
        })
      }
    },
  },
  generateIntegrationToken: {
    type: graphql.type("NonNull", graphql.type("String")),
    args: {
      scope: {
        type: graphql.type(
          "NonNull",
          graphql.type("List", graphql.type("String")),
        ),
      },
      expiresIn: { type: graphql.type("String") },
    },
    resolve: async (_parent, { scope, expiresIn = "24h" }, context) => {
      const { request, user } = context

      request.log.debug(
        {
          scope,
          expiresIn,
          user: user?.sub,
        },
        "Generating integration token",
      )

      // 验证用户已登录且是客户端 JWT
      if (!user || user.aud !== "client") {
        throw new ErrorWithProps("Client authentication required.", {
          code: "UNAUTHENTICATED",
        })
      }

      // 生成集成 JWT，sub 必须是节点所有者地址
      const selfNode = await request.config.getSelfNode()
      if (!selfNode) {
        throw new GraphQLError("Node not configured", {
          extensions: {
            code: "INTERNAL_SERVER_ERROR",
          },
        })
      }

      const token = await context.app.jwt.sign(
        {
          aud: "integration",
          sub: selfNode.address,
          iss: selfNode.address,
          scope: scope,
        },
        { expiresIn },
      )

      request.log.info(
        {
          scope,
          expiresIn,
          user: user.sub,
        },
        "Integration token generated successfully",
      )

      return token
    },
  },
}

export { authMutations }
