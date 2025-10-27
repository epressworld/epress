import { Router } from "swiftify"
import { Connection, Node, Publication } from "../../models/index.mjs"

const router = new Router()

router.post("/replications", async (request, reply) => {
  const { typedData, signature } = request.body || {}
  request.log.info({ typedData, signature }, "Received replcation request")

  // 1. Basic Payload Validation
  if (!typedData || !signature) {
    return reply.code(400).send({ error: "INVALID_PAYLOAD" })
  }
  const { contentHash, publisherAddress, timestamp } = typedData.message

  // 2. Authorization: Check if the publisher is followed by the self node
  const selfNode = await Node.query().findOne({ is_self: true })

  const publisherNode = await Node.query().findOne({
    address: publisherAddress,
  })

  if (!publisherNode) {
    return reply.code(401).send({ error: "NOT_FOLLOWING" }) // Publisher node not even known
  }

  const connection = await Connection.query().findOne({
    follower_address: selfNode.address,
    followee_address: publisherNode.address,
  })

  if (!connection) {
    return reply.code(401).send({ error: "NOT_FOLLOWING" })
  }

  // 4. Pre-check: See if replication already exists
  const existingPublication = await Publication.query()
    .where({
      content_hash: contentHash,
      author_address: publisherNode.address,
    })
    .whereBetween("created_at", [
      new Date(Number(timestamp) * 1000),
      new Date((Number(timestamp) + 1) * 1000),
    ])
    .first()

  if (existingPublication) {
    return reply.code(409).send({ error: "REPLICATION_ALREADY_EXISTS" })
  }

  // Check X-Epress-Profile-Updated header and trigger async profile update if needed
  const profileUpdatedHeader = request.headers["x-epress-profile-updated"]
  if (profileUpdatedHeader) {
    const remoteUpdatedAt = new Date(profileUpdatedHeader)
    try {
      const syncResult = await publisherNode.sync.profile(remoteUpdatedAt)
      if (syncResult.success) {
        if (syncResult.skipped) {
          request.log.debug(
            {
              nodeAddress: syncResult.nodeAddress,
              oldUpdatedAt: syncResult.oldUpdatedAt,
              newUpdatedAt: syncResult.newUpdatedAt,
              reason: syncResult.reason,
            },
            "Profile sync not needed",
          )
        } else {
          request.log.info(
            {
              nodeAddress: syncResult.nodeAddress,
              newUpdatedAt: syncResult.newUpdatedAt,
              syncedData: syncResult.syncedData,
            },
            "Profile sync completed successfully",
          )
        }
      }
    } catch (syncError) {
      request.log.error(
        {
          nodeAddress: syncError.nodeAddress,
          localUpdatedAt: syncError.localUpdatedAt,
          remoteUpdatedAt: syncError.remoteUpdatedAt,
          error: syncError.message,
          originalError: syncError.originalError?.message,
        },
        "Profile sync failed",
      )
      // 不中断复制流程，继续处理
    }
  }

  try {
    // 5. 构造 typedData 并使用 publisherNode.sync.publication 方法同步内容
    const syncTypedData = Publication.createStatementOfSource(
      contentHash,
      publisherNode.address,
      typedData.message.timestamp,
    )

    const syncResult = await publisherNode.sync.publication(
      syncTypedData,
      signature,
    )
    request.log.debug(syncResult, "/replcations sync result")

    if (!syncResult.success) {
      if (syncResult.error.includes("Content hash mismatch")) {
        return reply.code(400).send({ error: "CONTENT_HASH_MISMATCH" })
      } else if (syncResult.error.includes("Content description missing")) {
        return reply.code(400).send({ error: "CONTENT_DESCRIPTION_MISSING" })
      } else if (syncResult.error.includes("Invalid signature")) {
        return reply.code(400).send({ error: "INVALID_SIGNATURE" })
      } else {
        return reply.code(500).send({ error: "INTERNAL_ERROR" })
      }
    }

    if (syncResult.skipped) {
      return reply.code(409).send({ error: "REPLICATION_ALREADY_EXISTS" })
    }

    // 6. Success
    return reply.code(201).send({ status: "replicated" })
  } catch (error) {
    request.log.error({ err: error, contentHash }, "Replication failed")
    return reply.code(500).send({ error: "INTERNAL_ERROR" })
  }
})

export default router.plugin()
