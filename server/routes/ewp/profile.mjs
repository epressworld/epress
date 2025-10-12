import { Router } from "swiftify"
import { Node } from "../../models/index.mjs"

const router = new Router()

router.get("/profile", async (request, reply) => {
  // 使用 Fastify 内置的 request.log，自动包含请求上下文
  request.log.debug(
    {
      ip: request.ip,
      userAgent: request.headers["user-agent"],
    },
    "Profile endpoint accessed",
  )

  try {
    const selfNode = await Node.query().findOne({ is_self: true })

    if (!selfNode) {
      request.log.error("Self node not found in database")
      return reply.code(404).send({ error: "NODE_NOT_FOUND" })
    }

    const response = {
      address: selfNode.address,
      title: selfNode.title,
      url: selfNode.url,
      description: selfNode.description,
    }

    request.log.info(
      {
        nodeAddress: selfNode.address,
        success: true,
      },
      "Profile endpoint completed successfully",
    )

    reply.send(response)
  } catch (error) {
    request.log.error(
      {
        error: error.message,
        stack: error.stack,
        success: false,
      },
      "Profile endpoint failed",
    )
    if (error.message.includes("no such table")) {
      reply.code(422).send({
        error: "INSTALL_FIRST",
        message:
          "The application is not installed. Please complete the installation process before making requests.",
      })
    } else {
      reply.code(500).send({ error: "INTERNAL_ERROR" })
    }
  }
})

export default router.plugin()
