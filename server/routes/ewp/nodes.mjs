import { Router } from "swiftify"
import { getAddress, recoverTypedDataAddress } from "viem"
import { Node } from "../../models/index.mjs"

const router = new Router()

router.post("/nodes/updates", async (request, reply) => {
  request.log.debug(
    {
      publisherAddress: request.body?.typedData?.message?.publisherAddress,
      profileVersion: request.body?.typedData?.message?.profileVersion,
    },
    "POST /nodes/updates endpoint accessed",
  )

  const { typedData, signature } = request.body || {}

  // 1. Basic Payload Validation
  if (!typedData || !signature || !typedData.message) {
    request.log.warn("Invalid payload structure in POST /nodes/updates")
    return reply.code(400).send({ error: "INVALID_PAYLOAD" })
  }

  const {
    publisherAddress,
    url,
    title,
    description,
    profileVersion,
    timestamp,
  } = typedData.message

  // 2. Recover Signer and Validate Signature
  let signerAddress
  try {
    signerAddress = await recoverTypedDataAddress({
      ...typedData,
      signature,
    })
  } catch (e) {
    request.log.warn(
      "Signature recovery failed in POST /nodes/updates:",
      e.message,
    )
    return reply.code(400).send({ error: "INVALID_SIGNATURE" })
  }

  if (getAddress(signerAddress) !== getAddress(publisherAddress)) {
    request.log.warn("Signature mismatch in POST /nodes/updates")
    return reply.code(400).send({ error: "INVALID_SIGNATURE" })
  }

  // 3. Validate Timestamp (within 1 hour)
  const currentTime = Math.floor(Date.now() / 1000)
  if (Math.abs(currentTime - timestamp) > 3600) {
    request.log.warn("Invalid timestamp in POST /nodes/updates")
    return reply.code(400).send({ error: "INVALID_TIMESTAMP" })
  }

  // 4. Find the node and check the version
  const nodeToUpdate = await Node.query().findOne({
    address: getAddress(publisherAddress),
  })

  if (nodeToUpdate) {
    if (profileVersion > nodeToUpdate.profile_version) {
      // 5. Update the node if the new version is higher
      await nodeToUpdate.$query().patch({
        url,
        title,
        description,
        profile_version: profileVersion,
      })

      request.log.info(
        {
          nodeAddress: publisherAddress,
          oldVersion: nodeToUpdate.profile_version,
          newVersion: profileVersion,
          updatedFields: { url, title, description },
        },
        "Node profile updated successfully in POST /nodes/updates",
      )
    } else {
      request.log.debug(
        {
          nodeAddress: publisherAddress,
          currentVersion: nodeToUpdate.profile_version,
          receivedVersion: profileVersion,
        },
        "Node profile update skipped - version not higher",
      )
    }
  } else {
    request.log.debug(
      {
        nodeAddress: publisherAddress,
      },
      "Node not found in POST /nodes/updates - silently ignoring",
    )
  }
  // If node doesn't exist, we silently ignore. The connection process is responsible for creating nodes.

  // 6. Always return 204 on valid signature to acknowledge receipt
  return reply.code(204).send()
})

export default router.plugin()
