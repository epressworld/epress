import { Router } from "solidify.js"
import { getAddress, recoverTypedDataAddress } from "viem"
import { Node } from "../../models/index.mjs"

const router = new Router()

router.patch("/nodes/:address", async (request, reply) => {
  const { address } = request.params

  request.log.debug(
    {
      addressParam: address,
      publisherAddress: request.body?.typedData?.message?.publisherAddress,
      timestamp: request.body?.typedData?.message?.timestamp,
    },
    "PATCH /nodes/:address endpoint accessed",
  )

  const { typedData, signature } = request.body || {}

  // 1. Basic Payload Validation
  if (!typedData || !signature || !typedData.message) {
    request.log.warn("Invalid payload structure in PATCH /nodes/:address")
    return reply.code(400).send({ error: "INVALID_PAYLOAD" })
  }

  const { publisherAddress, url, title, description, timestamp } =
    typedData.message

  // 2. Validate address parameter matches publisherAddress
  try {
    if (getAddress(address) !== getAddress(publisherAddress)) {
      request.log.warn(
        "Address parameter does not match publisherAddress in PATCH /nodes/:address",
      )
      return reply.code(400).send({ error: "ADDRESS_MISMATCH" })
    }
  } catch (e) {
    request.log.warn(
      "Invalid address format in PATCH /nodes/:address:",
      e.message,
    )
    return reply.code(400).send({ error: "INVALID_ADDRESS" })
  }

  // 3. Recover Signer and Validate Signature
  let signerAddress
  try {
    signerAddress = await recoverTypedDataAddress({
      ...typedData,
      signature,
    })
  } catch (e) {
    request.log.warn(
      "Signature recovery failed in PATCH /nodes/:address:",
      e.message,
    )
    return reply.code(400).send({ error: "INVALID_SIGNATURE" })
  }

  if (getAddress(signerAddress) !== getAddress(publisherAddress)) {
    request.log.warn("Signature mismatch in PATCH /nodes/:address")
    return reply.code(400).send({ error: "INVALID_SIGNATURE" })
  }

  // 4. Find the node and check timestamp against updated_at
  const nodeToUpdate = await Node.query().findOne({
    address: getAddress(publisherAddress),
  })

  if (nodeToUpdate) {
    // Convert updated_at to Unix timestamp (seconds)
    const nodeUpdatedAtTimestamp = Math.floor(
      new Date(nodeToUpdate.updated_at).getTime() / 1000,
    )

    if (timestamp > nodeUpdatedAtTimestamp) {
      // 5. Update the node if the new timestamp is more recent
      await nodeToUpdate.$query().patch({
        url,
        title,
        description,
        updated_at: timestamp * 1000,
      })

      request.log.info(
        {
          nodeAddress: publisherAddress,
          oldTimestamp: nodeUpdatedAtTimestamp,
          newTimestamp: timestamp,
          updatedFields: { url, title, description },
        },
        "Node profile updated successfully in PATCH /nodes/:address",
      )
    } else {
      request.log.debug(
        {
          nodeAddress: publisherAddress,
          nodeUpdatedAt: nodeUpdatedAtTimestamp,
          receivedTimestamp: timestamp,
        },
        "Node profile update skipped - timestamp not newer",
      )
    }
  } else {
    request.log.debug(
      {
        nodeAddress: publisherAddress,
      },
      "Node not found in PATCH /nodes/:address - silently ignoring",
    )
  }
  // If node doesn't exist, we silently ignore. The connection process is responsible for creating nodes.

  // 6. Always return 204 on valid signature to acknowledge receipt
  return reply.code(204).send()
})

export default router.plugin()
