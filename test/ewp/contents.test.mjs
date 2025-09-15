import test from "ava"
import "../setup.mjs"
import crypto from "node:crypto"
import { createReadStream } from "node:fs"
import fs from "node:fs/promises"
import { Content, Node, Publication } from "../../server/models/index.mjs"
import { extractFileNameFromContentDisposition } from "../../server/utils/helper.mjs"

// Base64 encoded small PNG image for file content tests
const SMALL_PNG_BASE64 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
const SMALL_PNG_BUFFER = Buffer.from(SMALL_PNG_BASE64.split(",")[1], "base64")

test.beforeEach(async (t) => {
  t.context.selfNode = await Node.query().findOne({ is_self: true })
})

test("GET /contents/:content_hash should return Markdown content successfully", async (t) => {
  // Arrange: Insert a Markdown content record
  const markdownContent = "# Hello World\n\nThis is a test post."

  const content = await Content.create({
    type: "POST",
    body: markdownContent,
  })

  await Publication.query().insert({
    content_hash: content.content_hash,
    author_address: t.context.selfNode.address,
    signature: "0x123",
  })

  // Act: Send GET request to /contents/:content_hash
  const response = await t.context.app.inject({
    method: "GET",
    url: `/ewp/contents/${content.content_hash}`,
  })

  // Assert
  t.is(response.statusCode, 200, "should return 200 OK")
  t.is(
    response.headers["content-type"],
    "text/markdown",
    "Content-Type should be text/markdown",
  )
  t.is(
    response.payload,
    markdownContent,
    "response body should be the Markdown content",
  )
})

test("GET /contents/:content_hash should return PNG image content successfully", async (t) => {
  // Arrange: Prepare image file and insert content record
  const imageBuffer = SMALL_PNG_BUFFER
  const fileName = "content_test_image.png"
  const filePath = `/tmp/${fileName}`
  const fileDescription = "test file"

  // Write the image buffer to the temporary file within the correct upload directory
  await fs.writeFile(filePath, imageBuffer)

  const content = await Content.create({
    type: "FILE",
    file: {
      filename: fileName,
      mimetype: "image/png",
      createReadStream: () => {
        return createReadStream(filePath)
      },
    },
  })

  await Publication.query().insert({
    content_hash: content.content_hash,
    author_address: t.context.selfNode.address,
    signature: "0x123",
    description: fileDescription,
  })

  // Act: Send GET request to /contents/:content_hash
  const response = await t.context.app.inject({
    method: "GET",
    url: `/ewp/contents/${content.content_hash}`,
  })

  // Assert
  t.is(response.statusCode, 200, "should return 200 OK")
  t.is(
    response.headers["content-type"],
    "image/png",
    "Content-Type should be image/png",
  )
  t.is(
    extractFileNameFromContentDisposition(
      response.headers["content-disposition"],
    ),
    fileName,
    "Content-Disposition should be same",
  )
  t.is(
    response.headers["content-description"],
    encodeURIComponent(fileDescription),
    "Content-Description should be URL-encoded",
  )
  t.deepEqual(
    response.rawPayload,
    imageBuffer,
    "response body should be the PNG image data",
  )

  // Cleanup: Remove the temporary file after the test
  await fs.unlink(filePath)
})

test("GET /contents/:content_hash should return URL-encoded Content-Description for complex strings", async (t) => {
  // Arrange: Prepare content with a complex description
  const complexDescription =
    "This is a test content description with spaces & special chars! Chinese"
  const fileName = "complex_desc_file.png"
  const filePath = `/tmp/${fileName}`
  const imageBuffer = crypto.randomBytes(1024)

  await fs.writeFile(filePath, imageBuffer)

  const content = await Content.create({
    type: "FILE",
    file: {
      filename: fileName,
      mimetype: "image/png",
      createReadStream: () => createReadStream(filePath),
    },
  })

  await Publication.query().insert({
    content_hash: content.content_hash,
    author_address: t.context.selfNode.address,
    signature: "0x123",
    description: complexDescription,
  })

  // Act: Send GET request to /contents/:content_hash
  const response = await t.context.app.inject({
    method: "GET",
    url: `/ewp/contents/${content.content_hash}`,
  })

  // Assert
  t.is(response.statusCode, 200, "should return 200 OK")
  t.is(
    response.headers["content-type"],
    "image/png",
    "Content-Type should be image/png",
  )
  // Assert that the header is URL-encoded
  t.is(
    response.headers["content-description"],
    encodeURIComponent(complexDescription),
    "Content-Description should be URL-encoded",
  )
  t.deepEqual(
    response.rawPayload,
    imageBuffer,
    "response body should be the PNG image data",
  )

  // Cleanup
  await fs.unlink(filePath)
})

test("GET /contents/:content_hash should return 404 if publication is not found", async (t) => {
  // Arrange: Ensure the content does not exist in the database
  const nonExistentHash =
    "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890123456" // A valid format, but non-existent

  // Act: Send GET request for a non-existent content hash
  const response = await t.context.app.inject({
    method: "GET",
    url: `/ewp/contents/${nonExistentHash}`,
  })

  // Assert
  t.is(response.statusCode, 404, "should return 404 Not Found")
  t.deepEqual(
    response.json(),
    {
      error: "PUBLICATION_NOT_FOUND",
    },
    "should return PUBLICATION_NOT_FOUND error",
  )
})

test("GET /contents/:content_hash with timestamp should return correct POST content", async (t) => {
  const markdownContent = "# Timestamp Test Post"
  const content = await Content.create({ type: "POST", body: markdownContent })

  const timestamp = Math.floor(Date.now() / 1000)
  await Publication.query().insert({
    content_hash: content.content_hash,
    author_address: t.context.selfNode.address,
    signature: "0x123",
    created_at: new Date(timestamp * 1000),
  })

  const response = await t.context.app.inject({
    method: "GET",
    url: `/ewp/contents/${content.content_hash}?timestamp=${timestamp}`,
  })

  t.is(response.statusCode, 200, "should return 200 OK")
  t.is(response.payload, markdownContent)
})

test("GET /contents/:content_hash with timestamp should return correct FILE content", async (t) => {
  const imageBuffer =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAwMBAYJ4w+UAAAAASUVORK5CYII="
  const fileName = "timestamp_file.png"
  const filePath = `/tmp/${fileName}`
  const fileDescription = "timestamp file description"

  await fs.writeFile(filePath, imageBuffer)

  const content = await Content.create({
    type: "FILE",
    file: {
      filename: fileName,
      mimetype: "image/png",
      createReadStream: () => createReadStream(filePath),
    },
  })

  const timestamp = Math.floor(Date.now() / 1000)
  await Publication.query().insert({
    content_hash: content.content_hash,
    author_address: t.context.selfNode.address,
    signature: "0x123",
    description: fileDescription,
    created_at: new Date(timestamp * 1000),
  })

  const response = await t.context.app.inject({
    method: "GET",
    url: `/ewp/contents/${content.content_hash}?timestamp=${timestamp}`,
  })

  t.is(response.statusCode, 200, "should return 200 OK")
  t.is(
    response.headers["content-description"],
    encodeURIComponent(fileDescription),
  )

  await fs.unlink(filePath)
})

test("GET /contents/:content_hash should return PUBLICATION_NOT_FOUND if content_hash exists but no matching publication for self node", async (t) => {
  const markdownContent = "# Other Node Post"
  const content = await Content.create({ type: "POST", body: markdownContent })

  // Create a publication for a different author
  await Publication.query().insert({
    content_hash: content.content_hash,
    author_address: "0xOtherNodeAddress", // Not self node
    signature: "0x456",
  })

  const response = await t.context.app.inject({
    method: "GET",
    url: `/ewp/contents/${content.content_hash}`,
  })

  t.is(response.statusCode, 404, "should return 404 Not Found")
  t.deepEqual(response.json(), { error: "PUBLICATION_NOT_FOUND" })
})

test("GET /contents/:content_hash should return INVALID_TIMESTAMP for invalid timestamp parameter", async (t) => {
  const markdownContent = "# Invalid Timestamp Test"
  const content = await Content.create({ type: "POST", body: markdownContent })

  await Publication.query().insert({
    content_hash: content.content_hash,
    author_address: t.context.selfNode.address,
    signature: "0x123",
  })

  const response = await t.context.app.inject({
    method: "GET",
    url: `/ewp/contents/${content.content_hash}?timestamp=invalid`,
  })

  t.is(response.statusCode, 400, "should return 400 Bad Request")
  t.deepEqual(response.json(), { error: "INVALID_TIMESTAMP" })
})
