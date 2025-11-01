import test from "ava"
import "../setup.mjs"
import { Readable } from "node:stream"
import {
  Content,
  Hashtag,
  Node,
  Publication,
} from "../../server/models/index.mjs"

// ============================================================================
// Hashtag Model Tests
// ============================================================================

test("Hashtag.extractHashtags: Should extract hashtags from text", (t) => {
  const text = "This is a post about #web3 and #blockchain technology #Web3"
  const hashtags = Hashtag.extractHashtags(text)

  t.is(hashtags.length, 2, "Should extract 2 unique hashtags")
  t.true(hashtags.includes("web3"), "Should include 'web3'")
  t.true(hashtags.includes("blockchain"), "Should include 'blockchain'")
})

test.serial("Hashtag.extractHashtags: Should handle Chinese hashtags", (t) => {
  const text = "这是关于#区块链 和#Web3 的内容"
  const hashtags = Hashtag.extractHashtags(text)

  t.is(hashtags.length, 2, "Should extract 2 hashtags")
  t.true(hashtags.includes("区块链"), "Should include Chinese hashtag")
  t.true(hashtags.includes("web3"), "Should include English hashtag")
})

test("Hashtag.extractHashtags: Should handle empty or invalid input", (t) => {
  t.deepEqual(
    Hashtag.extractHashtags(""),
    [],
    "Empty string should return empty array",
  )
  t.deepEqual(
    Hashtag.extractHashtags(null),
    [],
    "Null should return empty array",
  )
  t.deepEqual(
    Hashtag.extractHashtags(undefined),
    [],
    "Undefined should return empty array",
  )
})

test("Hashtag.extractHashtags: Should normalize to lowercase and deduplicate", (t) => {
  const text = "#Web3 #WEB3 #web3 #Web_3"
  const hashtags = Hashtag.extractHashtags(text)

  t.is(hashtags.length, 2, "Should deduplicate case-insensitive tags")
  t.true(hashtags.includes("web3"), "Should include normalized 'web3'")
  t.true(hashtags.includes("web_3"), "Should include 'web_3' as separate tag")
})

test.serial(
  "Hashtag.findOrCreate: Should create new hashtag if not exists",
  async (t) => {
    const hashtag = await Hashtag.findOrCreate("testhashtag")

    t.truthy(hashtag, "Should return hashtag instance")
    t.is(hashtag.hashtag, "testhashtag", "Should have correct hashtag text")
  },
)

test.serial("Hashtag.findOrCreate: Should find existing hashtag", async (t) => {
  // Create a hashtag first
  const created = await Hashtag.query().insert({
    hashtag: "existinghashtag",
  })

  const found = await Hashtag.findOrCreate("existinghashtag")

  t.is(found.id, created.id, "Should return the same hashtag")
})

test.serial("Hashtag.findOrCreate: Should be case-insensitive", async (t) => {
  await Hashtag.query().insert({
    hashtag: "casetest",
  })

  const found1 = await Hashtag.findOrCreate("CaseTest")
  const found2 = await Hashtag.findOrCreate("CASETEST")

  t.is(found1.hashtag, "casetest", "Should normalize to lowercase")
  t.is(
    found2.hashtag,
    "casetest",
    "Should find same hashtag regardless of case",
  )
  t.is(found1.id, found2.id, "Should return same instance")
})

// ============================================================================
// Publication-Hashtag Integration Tests
// ============================================================================

test.serial(
  "Publication: Should automatically process hashtags on insert",
  async (t) => {
    const selfNode = await Node.query().findOne({ is_self: true })

    // Create content with hashtags
    const content = await Content.create({
      type: "post",
      body: "This is a test post about #web3 and #blockchain",
    })

    const publication = await Publication.query().insert({
      content_hash: content.content_hash,
      author_address: selfNode.address,
    })

    // Fetch with hashtags
    const pubWithHashtags = await Publication.query()
      .findById(publication.id)
      .withGraphFetched("hashtags")

    t.is(pubWithHashtags.hashtags.length, 2, "Should have 2 hashtags")

    const hashtagTexts = pubWithHashtags.hashtags.map((h) => h.hashtag).sort()
    t.deepEqual(
      hashtagTexts,
      ["blockchain", "web3"],
      "Should have correct hashtags",
    )
  },
)

test.serial(
  "Publication: Should process hashtags from description for FILE type",
  async (t) => {
    const selfNode = await Node.query().findOne({ is_self: true })

    // Create a file content
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

    const content = await Content.create(input)

    const publication = await Publication.query().insert({
      content_hash: content.content_hash,
      author_address: selfNode.address,
      description: "This file is about #design and #UI",
    })

    const pubWithHashtags = await Publication.query()
      .findById(publication.id)
      .withGraphFetched("hashtags")
    t.is(
      pubWithHashtags.hashtags.length,
      2,
      "Should extract hashtags from description",
    )

    const hashtagTexts = pubWithHashtags.hashtags.map((h) => h.hashtag).sort()
    t.deepEqual(
      hashtagTexts,
      ["design", "ui"],
      "Should have correct hashtags from description",
    )
  },
)

test.serial(
  "Publication: Should update hashtags when content changes",
  async (t) => {
    const selfNode = await Node.query().findOne({ is_self: true })

    // Create initial publication
    const content1 = await Content.create({
      type: "post",
      body: "Original content with #oldtag",
    })

    const publication = await Publication.query().insertAndFetch({
      content_hash: content1.content_hash,
      author_address: selfNode.address,
    })

    // Update with new content
    const content2 = await Content.create({
      type: "post",
      body: "Updated content with #newtag",
    })

    await publication.$query().patchAndFetch({
      content_hash: content2.content_hash,
    })

    // Fetch updated hashtags
    const updated = await Publication.query()
      .findById(publication.id)
      .withGraphFetched("hashtags")

    t.is(updated.hashtags.length, 1, "Should have new hashtag")
    t.is(updated.hashtags[0].hashtag, "newtag", "Should have updated hashtag")
  },
)

test.serial(
  "Publication: Should clear hashtags when content has none",
  async (t) => {
    const selfNode = await Node.query().findOne({ is_self: true })

    // Create publication with hashtags
    const content1 = await Content.create({
      type: "post",
      body: "Content with #sometag",
    })

    const publication = await Publication.query().insertAndFetch({
      content_hash: content1.content_hash,
      author_address: selfNode.address,
    })

    // Update with content without hashtags
    const content2 = await Content.create({
      type: "post",
      body: "Content without any tags",
    })

    await publication.$query().patchAndFetch({
      content_hash: content2.content_hash,
    })

    const updated = await Publication.query()
      .findById(publication.id)
      .withGraphFetched("hashtags")

    t.is(updated.hashtags.length, 0, "Should have no hashtags")
  },
)

test.serial(
  "Publication: Should clean up hashtag associations on delete",
  async (t) => {
    const selfNode = await Node.query().findOne({ is_self: true })

    const content = await Content.create({
      type: "post",
      body: "Content with #deletetag",
    })

    const publication = await Publication.query().insertAndFetch({
      content_hash: content.content_hash,
      author_address: selfNode.address,
    })

    const hashtags = await publication.$relatedQuery("hashtags")
    t.is(hashtags.length, 1, "should have 1 hashtag")
    // Delete publication
    await publication.$query().delete()
    const removed = await publication.$relatedQuery("hashtags")
    t.is(removed.length, 0, "hashtags should be removed")
  },
)
