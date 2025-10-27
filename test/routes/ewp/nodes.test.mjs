import test from "ava"
import { getAddress } from "viem"
import { Node } from "../../../server/models/index.mjs"
import {
  generateSignature,
  generateTestAccount,
  TEST_ACCOUNT_NODE_B,
} from "../../setup.mjs"

const buildTypedData = (node, timestamp) => ({
  domain: { name: "epress world", version: "1", chainId: 1 },
  types: {
    NodeProfileUpdate: [
      { name: "publisherAddress", type: "address" },
      { name: "url", type: "string" },
      { name: "title", type: "string" },
      { name: "description", type: "string" },
      { name: "timestamp", type: "uint256" },
    ],
  },
  primaryType: "NodeProfileUpdate",
  message: {
    publisherAddress: getAddress(node.address),
    url: node.url,
    title: node.title,
    description: node.description || "",
    timestamp: timestamp,
  },
})

test("PATCH /ewp/nodes/:address - should update node profile with a newer timestamp", async (t) => {
  const { app } = t.context

  // Create a node with an older updated_at timestamp
  const oldTimestamp = Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
  const nodeToUpdate = await Node.query().insert({
    address: getAddress(TEST_ACCOUNT_NODE_B.address),
    url: "http://nodeb.local",
    title: "Old Title",
    description: "Old Description",
    is_self: false,
    updated_at: new Date(oldTimestamp * 1000).toISOString(),
  })

  const newTimestamp = Math.floor(Date.now() / 1000)
  const updatedInfo = {
    ...nodeToUpdate,
    title: "New Title",
    description: "New Description",
  }

  const typedData = buildTypedData(updatedInfo, newTimestamp)
  const signature = await generateSignature(
    TEST_ACCOUNT_NODE_B,
    typedData,
    "typedData",
  )

  const response = await app.inject({
    method: "PATCH",
    url: `/ewp/nodes/${getAddress(TEST_ACCOUNT_NODE_B.address)}`,
    payload: { typedData, signature },
  })

  t.is(response.statusCode, 204, "Should return 204 No Content")

  const nodeInDb = await Node.query().findById(nodeToUpdate.address)
  t.is(nodeInDb.title, "New Title", "Title should be updated")
  t.is(nodeInDb.description, "New Description", "Description should be updated")

  // Verify that updated_at was updated
  const updatedAtTimestamp = Math.floor(
    new Date(nodeInDb.updated_at).getTime() / 1000,
  )
  t.is(
    updatedAtTimestamp,
    typedData.message.timestamp,
    "updated_at should be equale to typedData.message.timestamp",
  )
})

test("PATCH /ewp/nodes/:address - should not update node profile with an older or equal timestamp", async (t) => {
  const { app } = t.context
  const testAccount = generateTestAccount()

  const currentTimestamp = Math.floor(Date.now() / 1000)
  const nodeToUpdate = await Node.query().insert({
    address: getAddress(testAccount.address),
    url: "http://nodec.local",
    title: "Original Title",
    description: "Original Description",
    is_self: false,
    updated_at: new Date(currentTimestamp * 1000).toISOString(),
  })

  // Try to update with an older timestamp
  const olderTimestamp = currentTimestamp - 100
  const updatedInfo = { ...nodeToUpdate, title: "Attempted Title" }

  const typedData = buildTypedData(updatedInfo, olderTimestamp)
  const signature = await generateSignature(testAccount, typedData, "typedData")

  const response = await app.inject({
    method: "PATCH",
    url: `/ewp/nodes/${getAddress(testAccount.address)}`,
    payload: { typedData, signature },
  })

  t.is(response.statusCode, 204, "Should return 204 No Content")

  const nodeInDb = await Node.query().findById(nodeToUpdate.address)
  t.is(nodeInDb.title, "Original Title", "Title should not be updated")

  // Verify that updated_at was not changed
  const updatedAtTimestamp = Math.floor(
    new Date(nodeInDb.updated_at).getTime() / 1000,
  )
  t.is(updatedAtTimestamp, currentTimestamp, "updated_at should not change")
})

test("PATCH /ewp/nodes/:address - should return 400 for invalid signature", async (t) => {
  const { app } = t.context
  const nodeToUpdate = await Node.query().findOne({ is_self: true })
  const typedData = buildTypedData(nodeToUpdate, Math.floor(Date.now() / 1000))

  const response = await app.inject({
    method: "PATCH",
    url: `/ewp/nodes/${getAddress(nodeToUpdate.address)}`,
    payload: { typedData, signature: "0xinvalid" },
  })
  const responseBody = JSON.parse(response.body)

  t.is(response.statusCode, 400, "Should return 400 Bad Request")
  t.is(responseBody.error, "INVALID_SIGNATURE")
})

test("PATCH /ewp/nodes/:address - should return 400 when address parameter does not match publisherAddress", async (t) => {
  const { app } = t.context
  const testAccount = generateTestAccount()
  const differentAccount = generateTestAccount()

  const nodeToUpdate = await Node.query().insert({
    address: getAddress(testAccount.address),
    url: "http://noded.local",
    title: "Test Title",
    description: "Test Description",
    is_self: false,
  })

  const timestamp = Math.floor(Date.now() / 1000)
  const typedData = buildTypedData(nodeToUpdate, timestamp)
  const signature = await generateSignature(testAccount, typedData, "typedData")

  // Use a different address in the URL path
  const response = await app.inject({
    method: "PATCH",
    url: `/ewp/nodes/${getAddress(differentAccount.address)}`,
    payload: { typedData, signature },
  })
  const responseBody = JSON.parse(response.body)

  t.is(response.statusCode, 400, "Should return 400 Bad Request")
  t.is(responseBody.error, "ADDRESS_MISMATCH")
})

test("PATCH /ewp/nodes/:address - should handle non-existent node gracefully", async (t) => {
  const { app } = t.context
  const testAccount = generateTestAccount()

  const timestamp = Math.floor(Date.now() / 1000)
  const fakeNode = {
    address: getAddress(testAccount.address),
    url: "http://nonexistent.local",
    title: "Fake Title",
    description: "Fake Description",
  }

  const typedData = buildTypedData(fakeNode, timestamp)
  const signature = await generateSignature(testAccount, typedData, "typedData")

  const response = await app.inject({
    method: "PATCH",
    url: `/ewp/nodes/${getAddress(testAccount.address)}`,
    payload: { typedData, signature },
  })

  t.is(
    response.statusCode,
    204,
    "Should return 204 No Content even for non-existent node",
  )
})
