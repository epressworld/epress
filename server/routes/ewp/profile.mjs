import { Router } from "solidify.js"
import { Node } from "../../models/index.mjs"

const router = new Router()

router.get("/profile", async (request, reply) => {
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
      created_at: new Date(selfNode.created_at).toISOString(),
      updated_at: new Date(selfNode.updated_at).toISOString(),
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
        code: error.code,
        errno: error.errno,
        success: false,
      },
      "Profile endpoint failed",
    )

    reply.code(500).send({ error: "INTERNAL_ERROR" })
  }
})

export default router.plugin()
