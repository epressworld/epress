import { fastifyCors } from "@fastify/cors"
import jwt from "@fastify/jwt"
import mercuriusUpload from "mercurius-upload"
import { WebServer } from "swiftify"
import graphqlPlugin from "./graphql/index.mjs"
import ewpRoutes from "./routes/index.mjs"
import "../config/index.mjs"

/**
 * 构建 Fastify 日志配置对象
 * @returns {object} Fastify 日志配置
 */
function createFastifyLoggerConfig() {
  const loggerConfig = {
    level: process.env.EPRESS_DEV_LOG_LEVEL || "info",
    base: {
      pid: process.env.pid,
      hostname: process.env.hostname,
    },
    timestamp: true,
  }

  // 根据配置决定输出方式
  if (process.env.EPRESS_DEV_DEBUG === "true") {
    // 开发模式：彩色控制台输出
    loggerConfig.transport = {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss Z",
        ignore: "pid,hostname",
      },
    }
  } else if (process.env.EPRESS_LOG_FILE) {
    // 生产模式：文件输出
    loggerConfig.transport = {
      target: "pino/file",
      options: {
        destination: process.env.EPRESS_LOG_FILE,
      },
    }
  }

  return loggerConfig
}

let server
export default async function () {
  // Record the server start time
  const serverStartedAt = new Date()

  // 使用统一的日志配置
  const loggerConfig = createFastifyLoggerConfig()

  server = new WebServer({
    pluginTimeout: 30000,
    trustProxy: true,
    logger: loggerConfig, // 使用我们的自定义日志配置
  })

  // Decorate the server instance with the start time
  server.decorate("serverStartedAt", serverStartedAt)

  // 使用 Fastify 内置的 server.log
  server.log.info(
    {
      nodeEnv: process.env.NODE_ENV,
      debugMode: process.env.EPRESS_DEV_DEBUG === "true",
      logLevel: process.env.EPRESS_DEV_LOG_LEVEL || "info",
    },
    "Server initialization started",
  )

  server.register(fastifyCors)

  // Register mercurius-upload for file handling
  server.register(mercuriusUpload)

  // Register JWT plugin FIRST with audience and issuer validation
  server.register(jwt, {
    secret: process.env.EPRESS_AUTH_JWT_SECRET,
    sign: {
      iss: process.env.EPRESS_NODE_ADDRESS,
    },
    verify: {
      allowedIss: process.env.EPRESS_NODE_ADDRESS,
    },
  })

  // Decorate request with permission checking method
  server.decorateRequest("cani", function (permission) {
    // 如果没有用户信息，返回 false
    if (!this.user) {
      return false
    }

    // 如果是客户端 JWT，拥有所有权限
    if (this.user.aud === "client") {
      return true
    }

    // 如果是集成 JWT，检查 scope
    if (this.user.aud === "integration") {
      return (
        this.user.scope &&
        Array.isArray(this.user.scope) &&
        this.user.scope.includes(permission)
      )
    }

    // 其他情况返回 false
    return false
  })

  server.addHook("preHandler", async (request) => {
    try {
      await request.jwtVerify()

      // 首先检查 sub 是否是节点所有者地址
      const userSub = request.user?.sub
      const nodeOwnerAddress = process.env.EPRESS_NODE_ADDRESS

      if (request.user && userSub !== nodeOwnerAddress) {
        request.log.warn(
          {
            userId: userSub,
            expectedSub: nodeOwnerAddress,
          },
          "JWT sub must be node owner address, resetting user",
        )
        request.user = undefined
      } else if (request.user) {
        // sub 验证通过后，检查 aud 字段
        const allowedAudiences = ["client", "nonce", "comment", "integration"]
        const userAud = request.user?.aud

        if (!allowedAudiences.includes(userAud)) {
          request.log.warn(
            {
              userId: userSub,
              audience: userAud,
              allowedAudiences,
            },
            "JWT audience not allowed, resetting user",
          )
          request.user = undefined
        } else {
          request.log.debug(
            {
              userId: userSub,
              audience: userAud,
              issuer: request.user?.iss,
            },
            "JWT verification successful",
          )
        }
      }
    } catch (err) {
      request.user = undefined
      request.log.warn(
        {
          error: err.message,
          path: request.url,
          method: request.method,
          errorType: err.constructor.name,
        },
        "JWT verification failed (optional)",
      )
    }
  })

  // Register GraphQL plugin AFTER JWT
  server.register(graphqlPlugin())

  ewpRoutes(server)

  server.log.info("Server initialization completed")
  return server
}

export { server }
