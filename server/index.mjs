import { fastifyCors } from "@fastify/cors"
import jwt from "@fastify/jwt"
import mercuriusUpload from "mercurius-upload"
import { WebServer } from "swiftify"
import "../config/index.mjs"
import graphqlPlugin from "./graphql/index.mjs"
import { Node } from "./models/node.mjs"
import { Setting } from "./models/setting.mjs"
import restfulRoutes from "./routes/index.mjs"

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
  server.addHook("onRequest", async (request) => {
    // Initialize config cache for this request
    request.config = {
      _cache: {},
      async getSelfNode() {
        if (!this._cache.selfNode) {
          const selfNode = await Node.getSelf()
          if (!selfNode) {
            throw new Error("Self node not found")
          }
          this._cache.selfNode = selfNode
        }
        return this._cache.selfNode
      },
      async getSetting(key, defaultValue) {
        if (!(key in this._cache)) {
          this._cache[key] = await Setting.get(key, defaultValue)
        }
        return this._cache[key]
      },
    }
  })

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

  // Get JWT secret from database (or use temporary for pre-install)

  // Register JWT plugin with secret from database or temporary secret
  server.register(jwt, {
    secret: async () => {
      return await Setting.get("jwt_secret")
    },
  })

  // Decorate request with config cache to avoid repeated database queries
  server.decorateRequest("config", null)

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

  // Add preHandler hook to check installation status for GraphQL only
  // EWP routes handle their own installation checks
  server.addHook("preHandler", async (request, reply) => {
    // Skip installation check for install routes
    if (request.url.startsWith("/api/install")) {
      return
    }

    // Check if installed for GraphQL routes only
    if (request.url.startsWith("/api/graphql")) {
      const selfNode = await request.config.getSelfNode()
      if (!selfNode) {
        return reply.code(503).send({
          error: "NOT_INSTALLED",
          message:
            "System is not installed. Please complete installation first.",
        })
      }
    }
  })

  // Add preHandler hook for JWT verification
  server.addHook("preHandler", async (request) => {
    try {
      const selfNode = await request.config.getSelfNode()
      request.log.debug(
        { headers: request.headers, url: request.url },
        "request headers & url",
      )
      await request.jwtVerify({
        allowedIss: selfNode.address,
      })
      request.log.debug({ user: request.user }, "jwtVerify user successfully")

      // 首先检查 sub 是否是节点所有者地址
      const userSub = request.user?.sub
      const nodeOwnerAddress = selfNode?.address

      if (request.user && nodeOwnerAddress && userSub !== nodeOwnerAddress) {
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

  // Register GraphQL plugin AFTER JWT (always register, but queries will check installation)
  server.register(graphqlPlugin())

  // Register EWP routes (always register, but routes will check installation)
  restfulRoutes(server)

  server.log.info("Server initialization completed")
  return server
}

export { server }
