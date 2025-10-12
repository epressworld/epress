import test from "ava"
import { getAddress } from "viem"
import { Node } from "../../../server/models/index.mjs"
import {
  generateSignature,
  generateTestAccount,
  TEST_ACCOUNT_NODE_B,
} from "../../setup.mjs"

const buildTypedData = (node, version, timestamp) => ({
  domain: { name: "epress world", version: "1", chainId: 1 },
  types: {
    NodeProfileUpdate: [
      { name: "publisherAddress", type: "address" },
      { name: "url", type: "string" },
      { name: "title", type: "string" },
      { name: "description", type: "string" },
      { name: "profileVersion", type: "uint256" },
      { name: "timestamp", type: "uint256" },
    ],
  },
  primaryType: "NodeProfileUpdate",
  message: {
    publisherAddress: getAddress(node.address),
    url: node.url,
    title: node.title,
    description: node.description || "",
    profileVersion: version,
    timestamp: timestamp,
  },
})

test("POST /ewp/nodes/updates - should update node profile with a higher version", async (t) => {
  const { app } = t.context
  const nodeToUpdate = await Node.query().insert({
    address: getAddress(TEST_ACCOUNT_NODE_B.address),
    url: "http://nodeb.local",
    title: "Old Title",
    description: "Old Description",
    is_self: false,
    profile_version: 0,
  })

  const newTimestamp = Math.floor(Date.now() / 1000)
  const newVersion = 1
  const updatedInfo = {
    ...nodeToUpdate,
    title: "New Title",
    description: "New Description",
  }

  const typedData = buildTypedData(updatedInfo, newVersion, newTimestamp)
  const signature = await generateSignature(
    TEST_ACCOUNT_NODE_B,
    typedData,
    "typedData",
  )

  const response = await app.inject({
    method: "POST",
    url: "/ewp/nodes/updates",
    payload: { typedData, signature },
  })

  t.is(response.statusCode, 204, "Should return 204 No Content")

  const nodeInDb = await Node.query().findById(nodeToUpdate.address)
  t.is(nodeInDb.title, "New Title", "Title should be updated")
  t.is(nodeInDb.description, "New Description", "Description should be updated")
  t.is(
    nodeInDb.profile_version,
    newVersion,
    "Profile version should be updated",
  )
})

test("POST /ewp/nodes/updates - should not update node profile with a lower or equal version", async (t) => {
  const { app } = t.context
  const testAccount = generateTestAccount()
  const nodeToUpdate = await Node.query().insert({
    address: getAddress(testAccount.address),
    url: "http://nodec.local",
    title: "Original Title",
    description: "Original Description",
    is_self: false,
    profile_version: 5,
  })

  const newTimestamp = Math.floor(Date.now() / 1000)
  const sameVersion = 5
  const updatedInfo = { ...nodeToUpdate, title: "Attempted Title" }

  const typedData = buildTypedData(updatedInfo, sameVersion, newTimestamp)
  const signature = await generateSignature(testAccount, typedData, "typedData")

  const response = await app.inject({
    method: "POST",
    url: "/ewp/nodes/updates",
    payload: { typedData, signature },
  })

  t.is(response.statusCode, 204, "Should return 204 No Content")

  const nodeInDb = await Node.query().findById(nodeToUpdate.address)
  t.is(nodeInDb.title, "Original Title", "Title should not be updated")
  t.is(nodeInDb.profile_version, 5, "Profile version should not change")
})

test("POST /ewp/nodes/updates - should return 400 for invalid signature", async (t) => {
  const { app } = t.context
  const nodeToUpdate = await Node.query().findOne({ is_self: true })
  const typedData = buildTypedData(
    nodeToUpdate,
    1,
    Math.floor(Date.now() / 1000),
  )

  const response = await app.inject({
    method: "POST",
    url: "/ewp/nodes/updates",
    payload: { typedData, signature: "0xinvalid" },
  })
  const responseBody = JSON.parse(response.body)

  t.is(response.statusCode, 400, "Should return 400 Bad Request")
  t.is(responseBody.error, "INVALID_SIGNATURE")
})
