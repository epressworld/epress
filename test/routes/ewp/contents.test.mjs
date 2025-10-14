import test from "ava"
import "../../setup.mjs"
import crypto from "node:crypto"
import { createReadStream } from "node:fs"
import fs from "node:fs/promises"
import { Content, Node, Publication } from "../../../server/models/index.mjs"
import { extractFileNameFromContentDisposition } from "../../../server/utils/helper.mjs"

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

// New tests for 100% coverage

test.serial(
  "GET /contents/:content_hash should return 503 if node is not configured",
  async (t) => {
    // Mock the request to override getSelfNode
    const selfNode = await Node.query().findOne({ is_self: true })
    await selfNode.$query().delete()

    const response = await t.context.app.inject({
      method: "GET",
      url: `/ewp/contents/0xsomehash`,
    })

    t.is(response.statusCode, 503, "should return 503 Service Unavailable")
    t.deepEqual(response.json(), { error: "Node not configured" })
    await Node.query().insert(selfNode)
  },
)

test("GET /contents/:content_hash should return CONTENT_NOT_FOUND if publication exists but content does not", async (t) => {
  const fakeHash = `0x${"a".repeat(66)}`

  await Publication.query().insert({
    content_hash: fakeHash,
    author_address: t.context.selfNode.address,
    signature: "0x123",
  })

  const response = await t.context.app.inject({
    method: "GET",
    url: `/ewp/contents/${fakeHash}`,
  })

  t.is(response.statusCode, 404, "should return 404 Not Found")
  t.deepEqual(response.json(), { error: "CONTENT_NOT_FOUND" })
})

test("GET /contents/:content_hash should return INTERNAL_ERROR if FILE type has no local_path", async (t) => {
  const content = await Content.query().insertAndFetch({
    content_hash: `0x${"b".repeat(66)}`,
    type: "FILE",
    mimetype: "image/png",
    filename: "test.png",
    local_path: null, // Missing local_path
  })

  await Publication.query().insert({
    content_hash: content.content_hash,
    author_address: t.context.selfNode.address,
    signature: "0x123",
  })

  const response = await t.context.app.inject({
    method: "GET",
    url: `/ewp/contents/${content.content_hash}`,
  })

  t.is(response.statusCode, 500, "should return 500 Internal Server Error")
  t.deepEqual(response.json(), { error: "INTERNAL_ERROR" })
})

test("GET /contents/:content_hash should return CONTENT_NOT_FOUND (404) if file does not exist on disk", async (t) => {
  const nonExistentPath = `non_existent_file_${Date.now()}.png`

  const content = await Content.query().insertAndFetch({
    content_hash: `0x${"c".repeat(66)}`,
    type: "FILE",
    mimetype: "image/png",
    filename: "missing.png",
    local_path: nonExistentPath,
  })

  await Publication.query().insert({
    content_hash: content.content_hash,
    author_address: t.context.selfNode.address,
    signature: "0x123",
  })

  const response = await t.context.app.inject({
    method: "GET",
    url: `/ewp/contents/${content.content_hash}`,
  })

  t.is(response.statusCode, 404, "should return 404 Not Found")
  t.deepEqual(response.json(), { error: "CONTENT_NOT_FOUND" })
})

test("GET /contents/:content_hash should support Range request with valid range", async (t) => {
  const testContent = Buffer.from("0123456789abcdef") // 16 bytes
  const fileName = `range_test_${Date.now()}.bin`
  const filePath = `/tmp/${fileName}`

  await fs.writeFile(filePath, testContent)

  const content = await Content.create({
    type: "FILE",
    file: {
      filename: fileName,
      mimetype: "application/octet-stream",
      createReadStream: () => createReadStream(filePath),
    },
  })

  await Publication.query().insert({
    content_hash: content.content_hash,
    author_address: t.context.selfNode.address,
    signature: "0x123",
  })

  const response = await t.context.app.inject({
    method: "GET",
    url: `/ewp/contents/${content.content_hash}`,
    headers: {
      range: "bytes=0-7",
    },
  })

  t.is(response.statusCode, 206, "should return 206 Partial Content")
  t.is(response.headers["content-range"], "bytes 0-7/16")
  t.is(response.headers["content-length"], "8")
  t.deepEqual(response.rawPayload, Buffer.from("01234567"))

  await fs.unlink(filePath)
})

test("GET /contents/:content_hash should support Range request without end byte", async (t) => {
  const testContent = Buffer.from("ABCDEFGHIJ123456") // 16 bytes - unique content
  const fileName = `range_no_end_${Date.now()}.bin`
  const filePath = `/tmp/${fileName}`

  await fs.writeFile(filePath, testContent)

  const content = await Content.create({
    type: "FILE",
    file: {
      filename: fileName,
      mimetype: "application/octet-stream",
      createReadStream: () => createReadStream(filePath),
    },
  })

  await Publication.query().insert({
    content_hash: content.content_hash,
    author_address: t.context.selfNode.address,
    signature: "0x123",
  })

  const response = await t.context.app.inject({
    method: "GET",
    url: `/ewp/contents/${content.content_hash}`,
    headers: {
      range: "bytes=10-",
    },
  })

  t.is(response.statusCode, 206, "should return 206 Partial Content")
  t.is(response.headers["content-range"], "bytes 10-15/16")
  t.deepEqual(response.rawPayload, Buffer.from("123456"))

  await fs.unlink(filePath)
})

test("GET /contents/:content_hash should return 416 if Range start is beyond file size", async (t) => {
  const testContent = Buffer.from("0123456789") // 10 bytes
  const fileName = `range_invalid_${Date.now()}.bin`
  const filePath = `/tmp/${fileName}`

  await fs.writeFile(filePath, testContent)

  const content = await Content.create({
    type: "FILE",
    file: {
      filename: fileName,
      mimetype: "application/octet-stream",
      createReadStream: () => createReadStream(filePath),
    },
  })

  await Publication.query().insert({
    content_hash: content.content_hash,
    author_address: t.context.selfNode.address,
    signature: "0x123",
  })

  const response = await t.context.app.inject({
    method: "GET",
    url: `/ewp/contents/${content.content_hash}`,
    headers: {
      range: "bytes=20-30",
    },
  })

  t.is(response.statusCode, 416, "should return 416 Range Not Satisfiable")
  t.is(response.headers["content-range"], "bytes */10")

  await fs.unlink(filePath)
})

test("GET /contents/:content_hash should ignore Range header if If-Range does not match", async (t) => {
  const testContent = Buffer.from("XYZ0123456789ABC") // 16 bytes - unique content
  const fileName = `if_range_mismatch_${Date.now()}.bin`
  const filePath = `/tmp/${fileName}`

  await fs.writeFile(filePath, testContent)

  const content = await Content.create({
    type: "FILE",
    file: {
      filename: fileName,
      mimetype: "application/octet-stream",
      createReadStream: () => createReadStream(filePath),
    },
  })

  await Publication.query().insert({
    content_hash: content.content_hash,
    author_address: t.context.selfNode.address,
    signature: "0x123",
  })

  const response = await t.context.app.inject({
    method: "GET",
    url: `/ewp/contents/${content.content_hash}`,
    headers: {
      range: "bytes=0-7",
      "if-range": "Wed, 01 Jan 2020 00:00:00 GMT", // Mismatched date
    },
  })

  t.is(response.statusCode, 200, "should return 200 OK with full content")
  t.is(response.headers["content-length"], "16")
  t.deepEqual(response.rawPayload, testContent)

  await fs.unlink(filePath)
})

test("GET /contents/:content_hash should honor Range header if If-Range matches", async (t) => {
  const testContent = Buffer.from("QWE0123456789RTY") // 16 bytes - unique content
  const fileName = `if_range_match_${Date.now()}.bin`
  const filePath = `/tmp/${fileName}`

  await fs.writeFile(filePath, testContent)
  const stats = await fs.stat(filePath)
  const lastModified = stats.mtime.toUTCString()

  const content = await Content.create({
    type: "FILE",
    file: {
      filename: fileName,
      mimetype: "application/octet-stream",
      createReadStream: () => createReadStream(filePath),
    },
  })

  await Publication.query().insert({
    content_hash: content.content_hash,
    author_address: t.context.selfNode.address,
    signature: "0x123",
  })

  const response = await t.context.app.inject({
    method: "GET",
    url: `/ewp/contents/${content.content_hash}`,
    headers: {
      range: "bytes=0-7",
      "if-range": lastModified,
    },
  })

  t.is(response.statusCode, 206, "should return 206 Partial Content")
  t.is(response.headers["content-range"], "bytes 0-7/16")
  t.deepEqual(response.rawPayload, Buffer.from("QWE01234"))

  await fs.unlink(filePath)
})

test("GET /contents/:content_hash should handle FILE without filename (use 'download' as default)", async (t) => {
  const testContent = Buffer.from("no filename content here")
  const fileName = `will_remove_name_${Date.now()}.bin`
  const filePath = `/tmp/${fileName}`

  await fs.writeFile(filePath, testContent)

  const content = await Content.create({
    type: "FILE",
    file: {
      filename: fileName,
      mimetype: "application/octet-stream",
      createReadStream: () => createReadStream(filePath),
    },
  })

  // Get the created content with id
  const createdContent = await Content.query().findOne({
    content_hash: content.content_hash,
  })

  // Manually update to remove filename
  await Content.query()
    .findById(createdContent.content_hash)
    .patch({ filename: null })

  await Publication.query().insert({
    content_hash: content.content_hash,
    author_address: t.context.selfNode.address,
    signature: "0x123",
  })

  const response = await t.context.app.inject({
    method: "GET",
    url: `/ewp/contents/${content.content_hash}`,
  })

  t.is(response.statusCode, 200)
  t.true(response.headers["content-disposition"].includes("download"))

  await fs.unlink(filePath)
})

test("GET /contents/:content_hash should handle FILE with empty description", async (t) => {
  const testContent = Buffer.from("test")
  const fileName = `empty_desc_${Date.now()}.bin`
  const filePath = `/tmp/${fileName}`

  await fs.writeFile(filePath, testContent)

  const content = await Content.create({
    type: "FILE",
    file: {
      filename: fileName,
      mimetype: "text/plain",
      createReadStream: () => createReadStream(filePath),
    },
  })

  await Publication.query().insert({
    content_hash: content.content_hash,
    author_address: t.context.selfNode.address,
    signature: "0x123",
    description: "", // Empty description
  })

  const response = await t.context.app.inject({
    method: "GET",
    url: `/ewp/contents/${content.content_hash}`,
  })

  t.is(response.statusCode, 200)
  t.is(response.headers["content-description"], "")

  await fs.unlink(filePath)
})

test("GET /contents/:content_hash should handle FILE with non-ASCII filename", async (t) => {
  const testContent = Buffer.from("Chinese filename test 中文")
  const fileName = `测试文件_${Date.now()}.txt`
  const filePath = `/tmp/${fileName}`

  await fs.writeFile(filePath, testContent)

  const content = await Content.create({
    type: "FILE",
    file: {
      filename: fileName,
      mimetype: "text/plain",
      createReadStream: () => createReadStream(filePath),
    },
  })

  await Publication.query().insert({
    content_hash: content.content_hash,
    author_address: t.context.selfNode.address,
    signature: "0x123",
  })

  const response = await t.context.app.inject({
    method: "GET",
    url: `/ewp/contents/${content.content_hash}`,
  })

  t.is(response.statusCode, 200)
  const disposition = response.headers["content-disposition"]
  t.true(
    disposition.includes("filename*=UTF-8''"),
    "should use RFC 5987 encoding for non-ASCII",
  )

  await fs.unlink(filePath)
})

test("GET /contents/:content_hash should handle FILE with special characters in filename", async (t) => {
  const testContent = Buffer.from('Special chars "quotes" test')
  const fileName = `file"with\\quotes_${Date.now()}.txt`
  const filePath = `/tmp/${fileName}`

  await fs.writeFile(filePath, testContent)

  const content = await Content.create({
    type: "FILE",
    file: {
      filename: fileName,
      mimetype: "text/plain",
      createReadStream: () => createReadStream(filePath),
    },
  })

  await Publication.query().insert({
    content_hash: content.content_hash,
    author_address: t.context.selfNode.address,
    signature: "0x123",
  })

  const response = await t.context.app.inject({
    method: "GET",
    url: `/ewp/contents/${content.content_hash}`,
  })

  t.is(response.statusCode, 200)
  const disposition = response.headers["content-disposition"]
  t.true(
    disposition.includes("filename*=UTF-8''"),
    "should use RFC 5987 encoding for special chars",
  )

  await fs.unlink(filePath)
})

test("GET /contents/:content_hash should handle POST content with custom mimetype", async (t) => {
  const customContent = "Custom content type"
  const customMimetype = "text/custom"

  const content = await Content.query().insertAndFetch({
    content_hash: `0x${"d".repeat(66)}`,
    type: "POST",
    body: customContent,
    mimetype: customMimetype,
  })

  await Publication.query().insert({
    content_hash: content.content_hash,
    author_address: t.context.selfNode.address,
    signature: "0x123",
  })

  const response = await t.context.app.inject({
    method: "GET",
    url: `/ewp/contents/${content.content_hash}`,
  })

  t.is(response.statusCode, 200)
  t.is(response.headers["content-type"], customMimetype)
  t.is(response.payload, customContent)
})

test("GET /contents/:content_hash should handle FILE without mimetype (use default)", async (t) => {
  const testContent = Buffer.from("mimetype test content")
  const fileName = `no_mime_${Date.now()}.bin`
  const filePath = `/tmp/${fileName}`

  await fs.writeFile(filePath, testContent)

  const content = await Content.create({
    type: "FILE",
    file: {
      filename: fileName,
      mimetype: "application/octet-stream",
      createReadStream: () => createReadStream(filePath),
    },
  })

  // Get the created content with id
  const createdContent = await Content.query().findOne({
    content_hash: content.content_hash,
  })

  // Remove mimetype
  await Content.query()
    .findById(createdContent.content_hash)
    .patch({ mimetype: null })

  await Publication.query().insert({
    content_hash: content.content_hash,
    author_address: t.context.selfNode.address,
    signature: "0x123",
  })

  const response = await t.context.app.inject({
    method: "GET",
    url: `/ewp/contents/${content.content_hash}`,
  })

  t.is(response.statusCode, 200)
  t.is(response.headers["content-type"], "application/octet-stream")

  await fs.unlink(filePath)
})
