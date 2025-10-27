import { Router } from "swiftify"
import validator from "validator"
import { getAddress, recoverTypedDataAddress, verifyTypedData } from "viem"
import { Connection, Node } from "../../models/index.mjs"

const router = new Router()

router.post("/connections", async (request, reply) => {
  request.log.debug(
    {
      followeeAddress: request.body?.typedData?.message?.followeeAddress,
      followerUrl: request.body?.typedData?.message?.followerUrl,
    },
    "POST /connections endpoint accessed",
  )

  try {
    const { typedData, signature } = request.body

    // 1. Validate payload structure
    if (
      !typedData ||
      !signature ||
      typeof typedData !== "object" ||
      typeof signature !== "string" ||
      !typedData.domain ||
      !typedData.types ||
      !typedData.primaryType ||
      !typedData.message
    ) {
      request.log.warn("Invalid payload structure in POST /connections")
      return reply.code(400).send({ error: "INVALID_PAYLOAD" })
    }

    const { followeeAddress, followeeUrl, followerUrl, timestamp } =
      typedData.message // Added followeeUrl

    // Basic validation for message fields
    if (
      !followeeAddress ||
      !followeeUrl ||
      !followerUrl ||
      typeof timestamp === "undefined"
    ) {
      // Added followeeUrl
      request.log.warn("Missing required fields in POST /connections message")
      return reply.code(400).send({ error: "INVALID_PAYLOAD" })
    }

    // Get self node's address first (Node B, the receiver)
    const selfNode = await request.config.getSelfNode()

    try {
      const result = await verifyTypedData({
        address: getAddress(selfNode.address), // Expected signer is selfNode (Node B)
        domain: typedData.domain,
        types: typedData.types,
        primaryType: typedData.primaryType,
        message: typedData.message,
        signature: signature,
      })
      if (!result) {
        request.log.warn("Invalid signature verification in POST /connections")
        return reply.code(400).send({ error: "INVALID_SIGNATURE" })
      }
    } catch (cryptoError) {
      // Error verifying typed data signature
      request.log.warn(
        "Signature verification failed in POST /connections:",
        cryptoError.message,
      )
      return reply.code(400).send({ error: "INVALID_SIGNATURE" })
    }

    // 3. Validate timestamp
    const currentTime = Math.floor(Date.now() / 1000)
    const oneHour = 3600
    if (
      timestamp < currentTime - oneHour ||
      timestamp > currentTime + oneHour
    ) {
      request.log.warn("Invalid timestamp in POST /connections")
      return reply.code(400).send({ error: "INVALID_TIMESTAMP" })
    }

    // 4. Validate followerUrl format
    if (
      !validator.isURL(followerUrl, {
        protocols: ["https", "http"],
        require_protocol: true,
        require_tld: false, // 允许localhost等开发环境URL
      })
    ) {
      return reply.code(400).send({ error: "INVALID_URL_FORMAT" })
    }

    // 5. Validate followeeUrl format
    if (
      !validator.isURL(followeeUrl, {
        protocols: ["https", "http"],
        require_protocol: true,
        require_tld: false, // 允许localhost等开发环境URL
      })
    ) {
      return reply.code(400).send({ error: "INVALID_URL_FORMAT" })
    }

    // 6. Fetch followee's profile (Node A) and validate identity
    let followeeProfile
    try {
      const profileResponse = await fetch(`${followeeUrl}/ewp/profile`)
      if (!profileResponse.ok) {
        // Failed to fetch profile
        // If profile fetch fails, it's an issue with the provided followeeUrl or the remote node.
        return reply.code(400).send({ error: "INVALID_URL_FORMAT" }) // Or a more specific error like 'FOLLOWEE_PROFILE_UNREACHABLE'
      }
      followeeProfile = await profileResponse.json()
    } catch {
      // Error fetching followee profile
      return reply.code(400).send({ error: "INVALID_URL_FORMAT" }) // Or 'FOLLOWEE_PROFILE_FETCH_FAILED'
    }

    // Validate that the followeeAddress from typedData matches the address from fetched profile
    if (getAddress(followeeProfile.address) !== getAddress(followeeAddress)) {
      return reply.code(401).send({ error: "FOLLOWEE_IDENTITY_MISMATCH" })
    }

    // 7. Find or create followeeNode (the followee, Node A)
    let followeeNode = await Node.query().findOne({
      address: getAddress(followeeAddress),
    })
    if (followeeNode) {
      // Update existing node details with followeeProfile (Node A's profile)
      await followeeNode.$query().patch({
        url: followeeProfile.url,
        title: followeeProfile.title,
        description: followeeProfile.description,
      })
    } else {
      // Create new node with followeeProfile (Node A's profile)
      followeeNode = await Node.query().insert({
        address: getAddress(followeeAddress),
        url: followeeProfile.url,
        title: followeeProfile.title,
        description: followeeProfile.description,
        is_self: false,
      })
    }

    // 8. Check CONNECTION_ALREADY_EXISTS
    const existingConnection = await Connection.query().findOne({
      follower_address: selfNode.address, // selfNode is Node B (follower)
      followee_address: followeeNode.address, // followeeNode is Node A (followee)
    })

    if (existingConnection) {
      request.log.info("Connection already exists in POST /connections")
      return reply.code(409).send({ error: "CONNECTION_ALREADY_EXISTS" })
    }

    // 9. Create Connection
    await Connection.query().insert({
      follower_address: selfNode.address,
      followee_address: followeeNode.address,
    })

    request.log.info(
      {
        follower_address: selfNode.address,
        followee_address: followeeNode.address,
      },
      "Connection created successfully in POST /connections",
    )

    reply.code(201).send({ status: "created" })
  } catch (error) {
    // Error in POST /connections endpoint
    request.log.error(
      {
        error: error.message,
        stack: error.stack,
      },
      "POST /connections endpoint failed",
    )
    reply.code(500).send({ error: "INTERNAL_ERROR" })
  }
})

router.delete("/connections", async (request, reply) => {
  request.log.debug(
    {
      followeeAddress: request.body?.typedData?.message?.followeeAddress,
      followerAddress: request.body?.typedData?.message?.followerAddress,
    },
    "DELETE /connections endpoint accessed",
  )

  const { typedData, signature } = request.body || {}

  // 1. Validate payload
  if (!typedData || !signature || !typedData.message) {
    request.log.warn("Invalid payload structure in DELETE /connections")
    return reply.code(400).send({ error: "INVALID_PAYLOAD" })
  }

  const { followeeAddress, followerAddress, timestamp } = typedData.message

  // 1.1. Validate required fields in message
  if (!followeeAddress || !followerAddress || timestamp === undefined) {
    request.log.warn("Missing required fields in DELETE /connections message")
    return reply.code(400).send({ error: "INVALID_PAYLOAD" })
  }

  // 1.2. Validate address format
  try {
    getAddress(followeeAddress)
    getAddress(followerAddress)
  } catch {
    request.log.warn("Invalid address format in DELETE /connections")
    return reply.code(400).send({ error: "INVALID_PAYLOAD" })
  }

  // 1.3. Validate timestamp type
  if (typeof timestamp !== "number" || !Number.isInteger(timestamp)) {
    request.log.warn("Invalid timestamp type in DELETE /connections")
    return reply.code(400).send({ error: "INVALID_PAYLOAD" })
  }

  // 2. Validate timestamp
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - timestamp) > 3600) {
    request.log.warn("Invalid timestamp in DELETE /connections")
    return reply.code(400).send({ error: "INVALID_TIMESTAMP" })
  }

  // 3. Verify signature
  const signerAddress = await recoverTypedDataAddress({
    ...typedData,
    signature: signature,
  })

  if (signerAddress.toLowerCase() !== followerAddress.toLowerCase()) {
    request.log.warn("Invalid signature in DELETE /connections")
    return reply.code(400).send({ error: "INVALID_SIGNATURE" })
  }

  // 4. Find and validate node information
  const selfNode = await Node.query().findOne({ is_self: true })

  // 根据 typedData 确定场景和验证逻辑
  const isFollowerSelf =
    followerAddress.toLowerCase() === selfNode.address.toLowerCase()
  const isFolloweeSelf =
    followeeAddress.toLowerCase() === selfNode.address.toLowerCase()

  let followerNode, followeeNode
  let deleteFollowerId, deleteFolloweeId

  if (isFollowerSelf) {
    // 场景1：从被关注者节点发起（Node A 向 Node B 发送请求）
    // 验证：followerAddress 应该是当前节点

    // 查找被关注者节点
    followeeNode = await Node.query().findOne({ address: followeeAddress })
    followerNode = selfNode

    deleteFollowerId = selfNode.address // 关注者节点（当前节点）
    deleteFolloweeId = followeeNode?.address // 被关注者节点
  } else if (isFolloweeSelf) {
    // 场景2：从关注者节点发起（Node B 向 Node A 发送请求）
    // 验证：followeeAddress 应该是当前节点

    // 查找关注者节点
    followerNode = await Node.query().findOne({ address: followerAddress })
    followeeNode = selfNode

    deleteFollowerId = followerNode?.address // 关注者节点
    deleteFolloweeId = selfNode.address // 被关注者节点（当前节点）
  } else {
    // 无效场景：当前节点既不是关注者也不是被关注者
    request.log.warn(
      "Invalid scenario in DELETE /connections - current node not involved",
    )
    return reply.code(400).send({ error: "INVALID_SIGNATURE" })
  }

  // 5. Perform deletion
  if (deleteFollowerId && deleteFolloweeId) {
    const deleteResult = await Connection.query()
      .where({
        follower_address: deleteFollowerId,
        followee_address: deleteFolloweeId,
      })
      .delete()

    request.log.info(
      {
        follower_address: deleteFollowerId,
        followee_address: deleteFolloweeId,
        deleted_count: deleteResult,
      },
      "Connection deleted successfully in DELETE /connections",
    )
  }

  // 6. Return success response
  return reply.code(204).send()
})

export default router.plugin()
