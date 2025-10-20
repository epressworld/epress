import crypto from "node:crypto"
import mercurius from "mercurius"
import { SiweMessage } from "siwe"
import { graphql } from "swiftify"
import { getAddress, isAddress } from "viem"

const { ErrorWithProps } = mercurius

// Exported for testing purposes
export async function generateNonceJwt({ app, address, expiresIn = "3m" }) {
  const actualNonce = crypto.randomBytes(32).toString("hex")
  // 使用 app.jwt 来签名，并返回 Base64 编码的 JWT
  return Buffer.from(
    await app.jwt.sign(
      {
        aud: "nonce",
        sub: address,
        nonce: actualNonce,
      },
      { expiresIn },
    ),
    "utf8",
  ).toString("base64")
}

const getSiweMessageQuery = {
  getSiweMessage: {
    type: graphql.type("NonNull", graphql.type("String")),
    args: {
      address: { type: graphql.type("NonNull", graphql.type("String")) },
    },
    resolve: async (_parent, { address }, context) => {
      const { request } = context

      request.log.debug({ address }, "Generating SIWE message")

      if (!isAddress(address)) {
        throw new ErrorWithProps("Invalid Ethereum address format.", {
          code: "VALIDATION_FAILED",
        })
      }
      const selfNode = await request.config.getSelfNode()

      const siweMessage = new SiweMessage({
        domain: new URL(selfNode.url).hostname,
        address: getAddress(address),
        statement: "Sign in with your Ethereum account to epress.",
        uri: selfNode.url,
        version: "1",
        chainId: 1,
        nonce: await generateNonceJwt({
          app: context.app,
          address,
        }), // 调用新函数生成 Nonce
        issuedAt: new Date().toISOString(),
      })

      const message = siweMessage.prepareMessage()

      request.log.info(
        {
          address,
          domain: selfNode.url,
        },
        "SIWE message generated successfully",
      )

      return message
    },
  },
}

export { getSiweMessageQuery }
