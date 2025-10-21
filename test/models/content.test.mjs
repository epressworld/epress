import test from "ava"
import "../setup.mjs"
import path from "node:path" // Import path for path concatenation
import { Readable } from "node:stream"
import fs from "fs-extra" // Import fs-extra for file operations
import { Content, Publication } from "../../server/models/index.mjs"
import { TEST_ETHEREUM_ADDRESS_NODE_A } from "../setup.mjs"

test.beforeEach(async () => {
  await Publication.query().delete()
  await Content.query().delete()
})

// --- Modify existing tests to use new object input structure ---

test("create: should create POST content with body (new input structure)", async (t) => {
  const contentText = "This is test post content"
  const input = { type: "post", body: contentText }

  const result = await Content.create(input)

  t.truthy(result, "Should return created content")
  t.is(result.type, "POST", "Type should be post")
  t.is(result.body, contentText, "Body should match input text")
  t.is(result.mimetype, "text/markdown", "Mimetype should be text/markdown")
  t.is(
    result.size,
    Buffer.byteLength(contentText, "utf8"),
    "Size should match text length",
  )
  t.truthy(result.content_hash, "Should have content hash")
  t.falsy(result.filename, "Filename should be null (text content)")
  t.falsy(result.local_path, "Local path should be null (text content)")

  const savedContent = await Content.query()
    .where("content_hash", result.content_hash)
    .first()
  t.truthy(savedContent, "Content should be saved to database")
  t.is(savedContent.body, contentText, "Saved content should match input")
})

test("create: should create FILE content with file and body (new input structure)", async (t) => {
  const filename = "test-image.jpg"
  const mimetype = "image/jpeg"
  const fileContent = "fake image data content"

  const mockFile = {
    filename,
    mimetype,
    createReadStream: () => {
      const stream = new Readable()
      stream.push(fileContent)
      stream.push(null)
      return stream
    },
  }

  const input = { type: "file", file: mockFile }

  const result = await Content.create(input)

  t.truthy(result, "Should return created content")
  t.is(result.type, "FILE", "Type should be file")
  t.is(result.filename, filename, "Filename should match")
  t.is(result.mimetype, mimetype, "Mimetype should match")
  t.is(result.size, fileContent.length, "Size should match file content length")
  t.truthy(result.content_hash, "Should have content hash")
  t.truthy(result.local_path, "Should have local path")

  const savedContent = await Content.query()
    .where("content_hash", result.content_hash)
    .first()
  t.truthy(savedContent, "Content should be saved to database")
  t.is(savedContent.filename, filename, "Saved filename should match")
})

// --- New validation tests for new input structure ---

test("create: should throw error if input is not an object", async (t) => {
  const error = await t.throwsAsync(async () => {
    await Content.create("just a string") // Old calling method, expect to throw error
  })

  t.is(
    error.code,
    "VALIDATION_FAILED",
    "Should throw VALIDATION_FAILED error code",
  )
})

test("create: should throw error if type is missing", async (t) => {
  const error = await t.throwsAsync(async () => {
    await Content.create({ body: "test" })
  })

  t.is(
    error.code,
    "VALIDATION_FAILED",
    "Should throw VALIDATION_FAILED error code",
  )
})

test("create: should throw error if type is invalid", async (t) => {
  const error = await t.throwsAsync(async () => {
    await Content.create({ type: "invalid", body: "test" })
  })

  t.is(
    error.code,
    "VALIDATION_FAILED",
    "Should throw VALIDATION_FAILED error code",
  )
})

test("create: should throw error if POST type is missing body", async (t) => {
  const error = await t.throwsAsync(async () => {
    await Content.create({ type: "post" })
  })

  t.is(
    error.code,
    "VALIDATION_FAILED",
    "Should throw VALIDATION_FAILED error code",
  )
})

test("create: should handle FILE type with missing mimetype in file object", async (t) => {
  const filename = "test-image7.jpg"
  const fileContent = "fake image data content 7" // Use different content to avoid hash collision
  const mockFile = {
    filename,
    // Missing mimetype
    createReadStream: () => {
      const stream = new Readable()
      stream.push(fileContent)
      stream.push(null)
      return stream
    },
  }

  const result = await Content.create({
    type: "file",
    file: mockFile,
  })

  t.truthy(result, "Should return created content")
  t.is(result.type, "FILE", "Type should be file")
  t.is(result.filename, filename, "Filename should match")
  t.is(result.mimetype, undefined, "Mimetype should be undefined")
})

test("create: should handle FILE type with missing filename in file object", async (t) => {
  const mimetype = "image/jpeg"
  const fileContent = "fake image data content 8" // Use different content to avoid hash collision
  const mockFile = {
    // Missing filename
    mimetype,
    createReadStream: () => {
      const stream = new Readable()
      stream.push(fileContent)
      stream.push(null)
      return stream
    },
  }

  const result = await Content.create({
    type: "file",
    file: mockFile,
  })

  t.truthy(result, "Should return created content")
  t.is(result.type, "FILE", "Type should be file")
  t.is(result.filename, undefined, "Filename should be undefined")
  t.is(result.mimetype, mimetype, "Mimetype should match")
})

// --- Re-add missing edge case tests ---

test("create: should handle empty string body for POST type", async (t) => {
  const error = await t.throwsAsync(async () => {
    await Content.create({ type: "post", body: "" })
  })

  t.is(
    error.code,
    "VALIDATION_FAILED",
    "Empty string body should throw VALIDATION_FAILED error code",
  )
})

test("create: should handle null body for POST type", async (t) => {
  const error = await t.throwsAsync(async () => {
    await Content.create({ type: "post", body: null })
  })

  t.is(
    error.code,
    "VALIDATION_FAILED",
    "Null body should throw VALIDATION_FAILED error code",
  )
})

test("create: should handle undefined body for POST type", async (t) => {
  const error = await t.throwsAsync(async () => {
    await Content.create({ type: "post", body: undefined })
  })

  t.is(
    error.code,
    "VALIDATION_FAILED",
    "Undefined body should throw VALIDATION_FAILED error code",
  )
})

test("create: should handle case-insensitive type input", async (t) => {
  const contentText = "Test case-insensitive type input"
  const input = { type: "Post", body: contentText } // Use 'Post' instead of 'post'

  const result = await Content.create(input)

  t.is(
    result.type,
    "POST",
    "Type should be automatically converted to uppercase",
  )
  t.is(result.body, contentText, "Body should be saved correctly")
})

// --- Clean up orphaned content tests ---

test.serial(
  "cleanupOrphanedContents: should preserve content with publication reference",
  async (t) => {
    // Clear database to ensure clean test environment
    await Content.query().delete()
    await Publication.query().delete()

    // Create Content with Publication reference
    const content = await Content.create({
      type: "post",
      body: "test post with publication",
    })

    // Create Publication reference
    await Publication.query().insert({
      content_hash: content.content_hash,
      author_address: TEST_ETHEREUM_ADDRESS_NODE_A,
      signature: "test-sig",
    })

    // Verify content exists and has Publication reference
    const contentCheck = await Content.query()
      .where("content_hash", content.content_hash)
      .first()
    t.truthy(contentCheck, "Content should exist")

    const publicationCheck = await Publication.query()
      .where("content_hash", content.content_hash)
      .first()
    t.truthy(publicationCheck, "Publication reference should exist")

    // Run cleanup method
    const result = await Content.cleanupOrphanedContents()

    // Verify result
    t.is(result.totalProcessed, 0, "Should process 0 orphaned contents")
    t.is(result.deletedCount, 0, "Should delete 0 content records")
    t.is(result.fileDeletedCount, 0, "Should delete 0 files")

    // Verify content still exists
    const remainingContent = await Content.query()
      .where("content_hash", content.content_hash)
      .first()
    t.truthy(
      remainingContent,
      "Content with Publication reference should still exist",
    )

    // Clean up test data
    await Publication.query()
      .where("content_hash", content.content_hash)
      .delete()
    await Content.query().where("content_hash", content.content_hash).delete()
  },
)

test.serial(
  "cleanupOrphanedContents: should NOT delete content with publication reference",
  async (t) => {
    // Clear database to ensure clean test environment
    await Content.query().delete()
    await Publication.query().delete()

    // Create Content with Publication reference
    const linkedContent = await Content.create({
      type: "post",
      body: "linked content that should NOT be deleted",
    })

    // Create Publication reference
    await Publication.query().insert({
      content_hash: linkedContent.content_hash,
      author_address: TEST_ETHEREUM_ADDRESS_NODE_A,
      signature: "test-sig",
    })

    // Also create an orphaned content for comparison
    const orphanedContent = await Content.create({
      type: "post",
      body: "orphaned content that should be deleted",
    })

    // Verify initial state
    const linkedContentCheck = await Content.query()
      .where("content_hash", linkedContent.content_hash)
      .first()
    t.truthy(
      linkedContentCheck,
      "Content with Publication reference should exist",
    )

    const orphanedContentCheck = await Content.query()
      .where("content_hash", orphanedContent.content_hash)
      .first()
    t.truthy(orphanedContentCheck, "Orphaned content should exist")

    // Run cleanup method
    const result = await Content.cleanupOrphanedContents()

    // Verify result
    t.is(result.totalProcessed, 1, "Should process 1 orphaned content")
    t.is(result.deletedCount, 1, "Should delete 1 content record")
    t.is(result.fileDeletedCount, 0, "Should delete 0 files")

    // Key verification: Content with Publication reference should still exist
    const remainingLinkedContent = await Content.query()
      .where("content_hash", linkedContent.content_hash)
      .first()
    t.truthy(
      remainingLinkedContent,
      "Content with Publication reference should still exist",
    )

    // Verify orphaned content was deleted
    const deletedOrphanedContent = await Content.query()
      .where("content_hash", orphanedContent.content_hash)
      .first()
    t.falsy(deletedOrphanedContent, "Orphaned content should be deleted")

    // Clean up test data
    await Publication.query()
      .where("content_hash", linkedContent.content_hash)
      .delete()
    await Content.query()
      .where("content_hash", linkedContent.content_hash)
      .delete()
  },
)

test.serial(
  "cleanupOrphanedContents: should delete orphaned content without publication reference",
  async (t) => {
    // Clear database to ensure clean test environment
    await Content.query().delete()
    await Publication.query().delete()

    // Create orphaned Content (no Publication reference)
    const orphanedContent = await Content.create({
      type: "post",
      body: "orphaned post",
    })

    // Verify content exists and has no Publication reference
    const contentCheck = await Content.query()
      .where("content_hash", orphanedContent.content_hash)
      .first()
    t.truthy(contentCheck, "Orphaned content should exist")

    const publicationCheck = await Publication.query()
      .where("content_hash", orphanedContent.content_hash)
      .first()
    t.falsy(
      publicationCheck,
      "Orphaned content should not have Publication reference",
    )

    // Run cleanup method
    const result = await Content.cleanupOrphanedContents()

    // Verify result
    t.is(result.totalProcessed, 1, "Should process 1 orphaned content")
    t.is(result.deletedCount, 1, "Should delete 1 content record")
    t.is(result.fileDeletedCount, 0, "Should delete 0 files")

    // Verify orphaned content was deleted
    const deletedContent = await Content.query()
      .where("content_hash", orphanedContent.content_hash)
      .first()
    t.falsy(deletedContent, "Orphaned content should be deleted")
  },
)

test.serial(
  "cleanupOrphanedContents: should delete orphaned FILE content and physical files",
  async (t) => {
    // Clear database to ensure clean test environment
    await Content.query().delete()
    await Publication.query().delete()

    // Create orphaned FILE Content
    const orphanedFile = await Content.create({
      type: "file",
      body: "orphaned file description",
      file: {
        filename: "orphaned-file.jpg",
        mimetype: "image/jpeg",
        createReadStream: () => {
          const stream = new Readable()
          stream.push("orphaned file content")
          stream.push(null)
          return stream
        },
      },
    })

    // Verify orphaned file exists
    const orphanedFilePath = path.join(
      process.cwd(),
      "data",
      "uploads",
      orphanedFile.local_path,
    )
    t.true(await fs.pathExists(orphanedFilePath), "Orphaned file should exist")

    // Run cleanup method
    const result = await Content.cleanupOrphanedContents()

    // Verify result
    t.is(result.totalProcessed, 1, "Should process 1 orphaned content")
    t.is(result.deletedCount, 1, "Should delete 1 content record")
    t.is(result.fileDeletedCount, 1, "Should delete 1 file")

    // Verify orphaned content was deleted
    const deletedContent = await Content.query()
      .where("content_hash", orphanedFile.content_hash)
      .first()
    t.falsy(deletedContent, "Orphaned FILE Content should be deleted")

    // Verify physical file was deleted
    t.false(
      await fs.pathExists(orphanedFilePath),
      "Orphaned physical file should be deleted",
    )
  },
)

test.serial(
  "cleanupOrphanedContents: should handle mixed content types correctly",
  async (t) => {
    // Clear database to ensure clean test environment
    await Content.query().delete()
    await Publication.query().delete()

    // Create content with Publication reference
    const linkedPost = await Content.create({
      type: "post",
      body: "linked post for mixed test",
    })
    const linkedFile = await Content.create({
      type: "file",
      body: "linked file for mixed test",
      file: {
        filename: "linked-mixed.jpg",
        mimetype: "image/jpeg",
        createReadStream: () => {
          const stream = new Readable()
          stream.push("linked content for mixed test")
          stream.push(null)
          return stream
        },
      },
    })

    // Create orphaned content
    const orphanedPost = await Content.create({
      type: "post",
      body: "orphaned post for mixed test",
    })
    const orphanedFile = await Content.create({
      type: "file",
      body: "orphaned file for mixed test",
      file: {
        filename: "orphaned-mixed.jpg",
        mimetype: "image/jpeg",
        createReadStream: () => {
          const stream = new Readable()
          stream.push("orphaned content for mixed test")
          stream.push(null)
          return stream
        },
      },
    })

    // Create Publication reference
    await Publication.query().insert({
      content_hash: linkedPost.content_hash,
      author_address: TEST_ETHEREUM_ADDRESS_NODE_A,
      signature: "sig1",
    })
    await Publication.query().insert({
      content_hash: linkedFile.content_hash,
      author_address: TEST_ETHEREUM_ADDRESS_NODE_A,
      signature: "sig2",
    })

    // Run cleanup method
    const result = await Content.cleanupOrphanedContents()

    // Verify result
    t.is(result.totalProcessed, 2, "Should process 2 orphaned contents")
    t.is(result.deletedCount, 2, "Should delete 2 content records")
    t.is(result.fileDeletedCount, 1, "Should delete 1 file")

    // Verify result - Only check content we created
    const ourContentHashes = [
      linkedPost.content_hash,
      orphanedPost.content_hash,
      linkedFile.content_hash,
      orphanedFile.content_hash,
    ]
    const remainingContents = await Content.query().whereIn(
      "content_hash",
      ourContentHashes,
    )

    // Should only keep 2 referenced contents
    t.is(remainingContents.length, 2, "Should only keep 2 referenced contents")

    const remainingHashes = remainingContents.map((c) => c.content_hash)
    t.true(
      remainingHashes.includes(linkedPost.content_hash),
      "Referenced POST should be kept",
    )
    t.true(
      remainingHashes.includes(linkedFile.content_hash),
      "Referenced FILE should be kept",
    )
    t.false(
      remainingHashes.includes(orphanedPost.content_hash),
      "Orphaned POST should be deleted",
    )
    t.false(
      remainingHashes.includes(orphanedFile.content_hash),
      "Orphaned FILE should be deleted",
    )

    // Clean up test data
    await Publication.query()
      .whereIn("content_hash", [
        linkedPost.content_hash,
        linkedFile.content_hash,
      ])
      .delete()
    await Content.query()
      .whereIn("content_hash", [
        linkedPost.content_hash,
        linkedFile.content_hash,
      ])
      .delete()
  },
)
