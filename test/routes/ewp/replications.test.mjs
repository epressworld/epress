import crypto from "node:crypto"
import fs from "node:fs/promises"
import path from "node:path"
import test from "ava"
import nock from "nock"
import {
  Connection,
  Content,
  Node,
  Publication,
} from "../../../server/models/index.mjs"
import { hash } from "../../../server/utils/crypto.mjs"
import { generateSignature, generateTestAccount } from "../../setup.mjs"

// Helper to create the typed data for signing
const createStatementOfSourceTypedData = (
  contentHash,
  publisherAddress,
  timestamp,
) =>
  Publication.createStatementOfSource(
    contentHash,
    publisherAddress,
    timestamp || Math.floor(Date.now() / 1000),
  )

test.beforeEach(async (t) => {
  // Get the self node created in global setup
  const selfNode = await Node.query().findOne({ is_self: true })
  t.context.selfNode = selfNode
  t.context.testAccount = generateTestAccount()

  // Insert the external node B
  const followeeNode = await Node.query().insert({
    address: t.context.testAccount.address,
    url: `https://${t.context.testAccount.address}.test.com`,
    title: "Test Node",
    description: "Test Description",
    is_self: false,
  })
  t.context.followeeNode = followeeNode

  // Create a connection: selfNode (A) follows nodeB
  await Connection.query().insert({
    follower_address: selfNode.address,
    followee_address: followeeNode.address,
  })
})

test("Success: should replicate content from a followed node", async (t) => {
  const { app, followeeNode } = t.context

  const mockContent = "# This is a test publication"
  const contentHash = `0x${await hash.sha256(mockContent)}`

  // 1. Mock the reverse GET call from our server to the publisher (Node B)
  const scope = nock(followeeNode.url)
    .get(`/ewp/contents/${contentHash}`)
    .query(true)
    .reply(200, mockContent, { "Content-Type": "text/markdown" })

  // 2. Create and sign the replication request from Node B
  const typedData = createStatementOfSourceTypedData(
    contentHash,
    followeeNode.address,
  )
  const signature = await generateSignature(
    t.context.testAccount,
    typedData,
    "typedData",
  )

  // 3. Send the replication request to our server
  const response = await app.inject({
    method: "POST",
    url: "/ewp/replications",
    payload: {
      typedData,
      signature,
    },
  })
  // 4. Assertions
  t.is(response.statusCode, 201, "Should return 201 Created")
  t.deepEqual(JSON.parse(response.payload), { status: "replicated" })

  // Verify content was saved
  const content = await Content.query().findOne({ content_hash: contentHash })
  t.truthy(content, "Content should be saved to the database")
  t.is(content.body, mockContent)

  // Verify publication was created and linked correctly
  const publication = await Publication.query().findOne({
    content_hash: contentHash,
    author_address: followeeNode.address,
  })
  t.truthy(publication, "Publication should be created")
  t.truthy(publication.signature, "Publication signature should be stored")

  // Verify nock was called
  t.true(scope.isDone(), "Nock should have been called for content fetch")
})

test("Success: should replicate a FILE from a followed node", async (t) => {
  const { app, testAccount, followeeNode } = t.context

  // 1. Prepare mock binary file content (e.g., a PNG image)
  const mockFileBuffer = crypto.randomBytes(1024)
  const mockFileType = "image/png"
  const contentHash = `0x${await hash.sha256(mockFileBuffer)}`
  const timestamp = Math.floor(Date.now() / 1000)

  // 2. Mock reverse GET request to the publisher node (Node B)
  const scope = nock(followeeNode.url)
    .get(`/ewp/contents/${contentHash}`)
    .query(true)
    .reply(200, mockFileBuffer, {
      "Content-Type": mockFileType,
      "Content-Description": "test file",
    })

  // 3. Construct and sign request
  const typedData = createStatementOfSourceTypedData(
    contentHash,
    followeeNode.address,
    timestamp,
  )
  const signature = await generateSignature(testAccount, typedData, "typedData")

  // 4. Send replication request
  const response = await app.inject({
    method: "POST",
    url: "/ewp/replications",
    payload: {
      typedData,
      signature,
    },
  })

  // 5. Assert API response
  t.is(response.statusCode, 201, "Should return 201 Created")
  t.true(scope.isDone(), "Nock should have been called for content fetch")

  // 6. Assert database records
  const content = await Content.query().findOne({ content_hash: contentHash })
  t.truthy(content, "Content should be saved to the database")
  t.is(content.type, "FILE", 'Content type should be "file"')
  t.is(content.mimetype, mockFileType, "MIME type should be correct")
  t.is(
    Number(content.size),
    mockFileBuffer.length,
    "File size should be correct",
  )
  t.truthy(content.local_path, "local_path should be recorded")

  const publication = await Publication.query().findOne({
    content_hash: contentHash,
    author_address: followeeNode.address,
  })
  t.truthy(publication, "Publication should be created")
  t.is(
    publication.description,
    "test file",
    "Publication description should be correct",
  )

  const filePath = path.join(
    process.cwd(),
    "data",
    "uploads",
    content.local_path,
  )
  // 7. Assert file system
  await t.notThrowsAsync(
    fs.access(filePath),
    `File should exist at ${filePath}`,
  )

  const savedFileContent = await fs.readFile(filePath)
  t.deepEqual(
    savedFileContent,
    mockFileBuffer,
    "Saved file content should match the original buffer",
  )

  // Clean up created file
  await fs.unlink(filePath)
})

test("Success: should replicate a FILE with URL-encoded description from a followed node", async (t) => {
  const { app, testAccount, followeeNode } = t.context

  // 1. Prepare mock binary file content
  const mockFileBuffer = crypto.randomBytes(1024)
  const mockFileType = "image/png"
  const fileName = "test.png"
  const contentHash = `0x${await hash.sha256(mockFileBuffer)}`
  const complexDescription =
    "This is a test file description with spaces & special chars! Chinese"
  const encodedDescription = encodeURIComponent(complexDescription)

  // 2. Mock reverse GET request to the publisher node (Node B) with URL-encoded Content-Description header
  const scope = nock(followeeNode.url)
    .get(`/ewp/contents/${contentHash}`)
    .query(true)
    .reply(200, mockFileBuffer, {
      "Content-Type": mockFileType,
      "Content-Description": encodedDescription,
      "content-disposition": `attachment; filename=${fileName}`,
    })

  // 3. Construct and sign request
  const typedData = createStatementOfSourceTypedData(
    contentHash,
    followeeNode.address,
  )
  const signature = await generateSignature(testAccount, typedData, "typedData")

  // 4. Send replication request
  const response = await app.inject({
    method: "POST",
    url: "/ewp/replications",
    payload: {
      typedData,
      signature,
    },
  })

  // 5. Assert API response
  t.is(response.statusCode, 201, "Should return 201 Created")
  t.true(scope.isDone(), "Nock should have been called for content fetch")

  // 6. Assert database records
  const publication = await Publication.query().findOne({
    content_hash: contentHash,
    author_address: followeeNode.address,
  })
  t.truthy(publication, "Publication should be created")
  t.is(
    publication.description,
    complexDescription,
    "Publication description should be correctly URL-decoded",
  )

  const content = await Content.query().findOne({ content_hash: contentHash })

  const filePath = path.join(
    process.cwd(),
    "data",
    "uploads",
    content.local_path,
  )
  // 7. Assert file system
  await t.notThrowsAsync(
    fs.access(filePath),
    `File should exist at ${filePath}`,
  )

  const savedFileContent = await fs.readFile(filePath)
  t.deepEqual(
    savedFileContent,
    mockFileBuffer,
    "Saved file content should match the original buffer",
  )

  // Clean up created file
  await fs.unlink(filePath)
})

test("Failure: should reject replication from an unfollowed node", async (t) => {
  const { app } = t.context

  // Create a new random node C that we do not follow
  const nodeCAccount = generateTestAccount()
  await Node.query().insert({
    address: nodeCAccount.address,
    url: "https://node-c.com",
    title: "Node C",
    is_self: false,
  })

  const mockContent = "# Malicious Content"
  const contentHash = `0x${await hash.sha256(mockContent)}`

  const typedData = createStatementOfSourceTypedData(
    contentHash,
    nodeCAccount.address,
  )
  const signature = await generateSignature(
    nodeCAccount,
    typedData,
    "typedData",
  )

  const response = await app.inject({
    method: "POST",
    url: "/ewp/replications",
    payload: {
      typedData,
      signature,
    },
  })

  t.is(response.statusCode, 401, "Should return 401 Unauthorized")
  t.deepEqual(JSON.parse(response.payload), { error: "NOT_FOLLOWING" })

  const content = await Content.query().findOne({ content_hash: contentHash })
  t.falsy(content, "Content should not be saved")
})

test("Failure: should reject replication if content hash mismatches", async (t) => {
  const { app, testAccount, followeeNode } = t.context

  const originalContent = "# Original Content"
  const wrongContent = "# Modified Content That Does Not Match Hash"
  const contentHash = `0x${await hash.sha256(originalContent)}`

  // Mock the reverse GET to return the WRONG content
  const scope = nock(followeeNode.url)
    .get(`/ewp/contents/${contentHash}`)
    .query(true)
    .reply(200, wrongContent, { "Content-Type": "text/markdown" })

  const typedData = createStatementOfSourceTypedData(
    contentHash,
    followeeNode.address,
  )
  const signature = await generateSignature(testAccount, typedData, "typedData")

  const response = await app.inject({
    method: "POST",
    url: "/ewp/replications",
    payload: {
      typedData,
      signature,
    },
  })

  t.is(response.statusCode, 400, "Should return 400 Bad Request")
  t.deepEqual(JSON.parse(response.payload), { error: "CONTENT_HASH_MISMATCH" })
  t.true(scope.isDone(), "Nock should have been called")
})

test("Failure: should handle error when content fetch fails", async (t) => {
  const { app, testAccount, followeeNode } = t.context

  const mockContent = "# Some Content"
  const contentHash = `0x${await hash.sha256(mockContent)}`

  // Mock the reverse GET to fail
  const scope = nock(followeeNode.url)
    .get(`/ewp/contents/${contentHash}`)
    .query(true)
    .reply(500, { error: "PUBLISHER_ERROR" })

  const typedData = createStatementOfSourceTypedData(
    contentHash,
    followeeNode.address,
  )
  const signature = await generateSignature(testAccount, typedData, "typedData")

  const response = await app.inject({
    method: "POST",
    url: "/ewp/replications",
    payload: {
      typedData,
      signature,
    },
  })

  t.is(response.statusCode, 500, "Should return 500 Internal Server Error")
  t.deepEqual(JSON.parse(response.payload), { error: "INTERNAL_ERROR" }) // As per spec
  t.true(scope.isDone(), "Nock should have been called")
})

test("Failure: should reject replication if content already exists", async (t) => {
  const { app, testAccount, followeeNode } = t.context

  const mockContent = "# Pre-existing Content"
  const contentHash = `0x${await hash.sha256(mockContent)}`

  // Pre-populate the database
  await Content.query().insert({
    content_hash: contentHash,
    type: "post",
    body: mockContent,
  })
  await Publication.query().insert({
    content_hash: contentHash,
    author_address: followeeNode.address,
    signature: "a-pre-existing-signature",
  })

  const typedData = createStatementOfSourceTypedData(
    contentHash,
    followeeNode.address,
  )
  const signature = await generateSignature(testAccount, typedData, "typedData")

  const response = await app.inject({
    method: "POST",
    url: "/ewp/replications",
    payload: {
      typedData,
      signature,
    },
  })

  t.is(response.statusCode, 409, "Should return 409 Conflict")
  t.deepEqual(JSON.parse(response.payload), {
    error: "REPLICATION_ALREADY_EXISTS",
  })
})

test("Failure: should reject replication with invalid signature", async (t) => {
  const { app, followeeNode } = t.context
  const randomAccount = generateTestAccount()

  const mockContent = "# Some Content"
  const contentHash = `0x${await hash.sha256(mockContent)}`

  const typedData = createStatementOfSourceTypedData(
    contentHash,
    followeeNode.address,
  )
  // Sign with the WRONG key
  const signature = await generateSignature(
    randomAccount,
    typedData,
    "typedData",
  )

  const response = await app.inject({
    method: "POST",
    url: "/ewp/replications",
    payload: {
      typedData,
      signature,
    },
  })

  t.is(response.statusCode, 400, "Should return 400 Bad Request")
  t.deepEqual(JSON.parse(response.payload), { error: "INVALID_SIGNATURE" })
})

// --- New test case: Test file missing Content-Description header error handling ---

test("Failure: should reject replication if file content is missing Content-Description header", async (t) => {
  const { app, testAccount, followeeNode } = t.context

  // 1. Prepare mock binary file content (e.g., a PNG image)
  const mockFileBuffer = crypto.randomBytes(1024)
  const mockFileType = "image/png"
  const contentHash = `0x${await hash.sha256(mockFileBuffer)}`

  // 2. Mock reverse GET request to the publisher node (Node B) - Intentionally not include Content-Description header
  const scope = nock(followeeNode.url)
    .get(`/ewp/contents/${contentHash}`)
    .query(true)
    .reply(200, mockFileBuffer, { "Content-Type": mockFileType })
  // Note: Intentionally not include 'Content-Description' header here

  const typedData = createStatementOfSourceTypedData(
    contentHash,
    followeeNode.address,
  )
  const signature = await generateSignature(testAccount, typedData, "typedData")

  // 4. Send replication request
  const response = await app.inject({
    method: "POST",
    url: "/ewp/replications",
    payload: {
      typedData,
      signature,
    },
  })

  // 5. Assertions
  t.is(response.statusCode, 400, "Should return 400 Bad Request")
  t.deepEqual(JSON.parse(response.payload), {
    error: "CONTENT_DESCRIPTION_MISSING",
  })
  t.true(scope.isDone(), "Nock should have been called")

  // 6. Verify no content was saved
  const content = await Content.query().findOne({ content_hash: contentHash })
  t.falsy(content, "Content should not be saved to the database")

  // 7. Verify no publication was created
  const publication = await Publication.query().findOne({
    content_hash: contentHash,
    author_address: followeeNode.address,
  })
  t.falsy(publication, "Publication should not be created")
})

test("Success: should trigger profile sync if X-Epress-Profile-Updated is higher", async (t) => {
  const { app, testAccount, followeeNode } = t.context

  // 1. Set up publisherNode

  const mockContent = "# Content for profile sync test"
  const contentHash = `0x${await hash.sha256(mockContent)}`

  // 2. Mock the reverse GET call for content
  nock(followeeNode.url)
    .get(`/ewp/contents/${contentHash}`)
    .query(true)
    .reply(200, mockContent, { "Content-Type": "text/markdown" })

  // 3. Mock the GET /ewp/profile call that syncProfile will make

  const newUpdated = new Date()
  nock(followeeNode.url).get("/ewp/profile").reply(200, {
    address: followeeNode.address,
    url: followeeNode.url,
    title: "Updated Title",
    description: "Updated Description",
    updated_at: newUpdated.toISOString(),
  })

  // 4. Create and sign the replication request from Node B
  const typedData = createStatementOfSourceTypedData(
    contentHash,
    followeeNode.address,
  )
  const signature = await generateSignature(testAccount, typedData, "typedData")

  // 5. Send the replication request to our server with a higher X-Epress-Profile-Updated header
  const response = await app.inject({
    method: "POST",
    url: "/ewp/replications",
    headers: {
      "X-Epress-Profile-Updated": newUpdated.toISOString(),
    },
    payload: {
      typedData,
      signature,
    },
  })

  // 6. Assertions for replication request
  t.is(response.statusCode, 201, "Should return 201 Created")

  // Wait a bit for the async syncProfile to complete
  await new Promise((resolve) => setTimeout(resolve, 100))

  // 7. Assert that the publisherNode's updated_at has been updated
  const updatedPublisherNode = await Node.query().findById(followeeNode.address)
  t.is(
    new Date(updatedPublisherNode.updated_at).toISOString(),
    newUpdated.toISOString(),
    "Publisher node profile should be updated",
  )
  t.is(
    updatedPublisherNode.title,
    "Updated Title",
    "Publisher node title should be updated",
  )
  t.is(
    updatedPublisherNode.description,
    "Updated Description",
    "Publisher node description should be updated",
  )

  // Verify nock was called for both content fetch and profile fetch
  t.true(nock.isDone(), "All nock mocks should have been called")
})
