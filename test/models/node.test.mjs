import test from "ava"
import nock from "nock"
import { Content, Node, Publication } from "../../server/models/index.mjs"
import { hash } from "../../server/utils/crypto.mjs"
import { generateSignature, TEST_ACCOUNT_NODE_A } from "../setup.mjs"

// 辅助函数：计算内容哈希
async function calculateContentHash(content) {
  if (!content) {
    throw new Error("Content is required for hash calculation")
  }
  const contentBuffer = Buffer.from(content, "utf8")
  return `0x${await hash.sha256(contentBuffer)}`
}

test.beforeEach(async () => {
  // 清理测试数据
  await Publication.query().delete()
  await Content.query().delete()
  await Node.query().delete() // 删除所有节点，包括自节点
})

test.afterEach(async () => {
  // 确保测试后完全清理
  await Publication.query().delete()
  await Content.query().delete()
  await Node.query().delete() // 删除所有节点，包括自节点
  nock.cleanAll()
})

test.serial(
  "Node.sync.publications should sync text content successfully",
  async (t) => {
    // Arrange: 创建测试节点
    const testNode = await Node.query().insert({
      address: TEST_ACCOUNT_NODE_A.address,
      url: "https://example.com",
      title: "Test Node",
      description: "Test Description",
      is_self: false,
      profile_version: 0,
    })

    const textContent = "# Test Post\n\nThis is a test post."
    const contentHash = await calculateContentHash(textContent)

    const createdAt = new Date()
    // 生成有效的签名
    const typedData = Publication.createStatementOfSource(
      contentHash,
      TEST_ACCOUNT_NODE_A.address,
      Math.floor(createdAt.getTime() / 1000),
    )
    const signature = await generateSignature(
      TEST_ACCOUNT_NODE_A,
      typedData,
      "typedData",
    )

    // Mock /ewp/publications 接口
    nock("https://example.com")
      .get("/ewp/publications")
      .query({
        since: "2024-01-01T00:00:00.000Z",
        limit: "100",
        page: "1",
      })
      .reply(200, {
        data: [
          {
            content_hash: contentHash,
            author_address: testNode.address,
            signature: signature,
            comment_count: 5,
            created_at: createdAt.toISOString(),
          },
        ],
        pagination: {
          page: 1,
          limit: 100,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      })

    // Mock /ewp/contents/:content_hash 接口
    nock("https://example.com")
      .get(`/ewp/contents/${contentHash}`)
      .query(true)
      .reply(200, textContent, {
        "content-type": "text/markdown",
        "content-description": "",
      })

    // Act: 执行同步
    const result = await testNode.sync.publications("2024-01-01T00:00:00.000Z")

    // Assert
    t.is(result.success, true, "sync should succeed")
    t.is(
      result.nodeAddress,
      testNode.address,
      "should return correct node address",
    )
    t.is(result.syncedPublications, 1, "should sync 1 publication")
    t.is(result.syncedContents, 1, "should sync 1 content")
    t.is(result.skippedPublications, 0, "should not skip any publications")
    t.is(result.errors.length, 0, "should have no errors")

    // 验证数据库中的数据
    const syncedPublication = await Publication.query()
      .where("content_hash", contentHash)
      .where("author_address", testNode.address)
      .first()

    t.truthy(syncedPublication, "publication should be saved to database")
    t.is(
      syncedPublication.signature,
      signature,
      "should save correct signature",
    )
    t.is(
      syncedPublication.comment_count,
      0,
      "should save comment count as 0 during sync",
    )

    const syncedContent = await Content.query()
      .where("content_hash", contentHash)
      .first()

    t.truthy(syncedContent, "content should be saved to database")
    t.is(syncedContent.type, "POST", "should save correct content type")
    t.is(syncedContent.body, textContent, "should save correct content body")
  },
)

test.serial(
  "Node.sync.publications should sync file content successfully",
  async (t) => {
    // Arrange: 创建测试节点
    const testNode = await Node.query().insert({
      address: TEST_ACCOUNT_NODE_A.address,
      url: "https://example.com",
      title: "Test Node",
      description: "Test Description",
      is_self: false,
      profile_version: 0,
    })

    const fileName = "test.txt"
    const fileDescription = "Test file description"
    const fileContent = Buffer.from("Test file content")
    const contentHash = await calculateContentHash(fileContent.toString())

    // 生成有效的签名
    const typedData = Publication.createStatementOfSource(
      contentHash,
      TEST_ACCOUNT_NODE_A.address,
      Math.floor(Date.now() / 1000),
    )
    const signature = await generateSignature(
      TEST_ACCOUNT_NODE_A,
      typedData,
      "typedData",
    )

    // Mock /ewp/publications 接口
    nock("https://example.com")
      .get("/ewp/publications")
      .query({
        since: "2024-01-01T00:00:00.000Z",
        limit: "100",
        page: "1",
      })
      .reply(200, {
        data: [
          {
            content_hash: contentHash,
            author_address: testNode.address,
            signature: signature,
            comment_count: 0,
            created_at: new Date().toISOString(),
          },
        ],
        pagination: {
          page: 1,
          limit: 100,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      })

    // Mock /ewp/contents/:content_hash 接口
    nock("https://example.com")
      .get(`/ewp/contents/${contentHash}`)
      .query(true)
      .reply(200, fileContent, {
        "content-type": "application/pdf",
        "content-description": encodeURIComponent(fileDescription),
        "content-disposition": `attachment; filename=${fileName}`,
      })

    // Act: 执行同步
    const result = await testNode.sync.publications("2024-01-01T00:00:00.000Z")

    // Assert
    t.is(result.success, true, "sync should succeed")
    t.is(result.syncedPublications, 1, "should sync 1 publication")
    t.is(result.syncedContents, 1, "should sync 1 content")

    // 验证数据库中的数据
    const syncedContent = await Content.query()
      .where("content_hash", contentHash)
      .first()

    t.truthy(syncedContent, "content should be saved to database")
    t.is(syncedContent.type, "FILE", "should save correct content type")
    t.is(syncedContent.filename, fileName, "should save correct file name")
    t.is(
      syncedContent.mimetype,
      "application/pdf",
      "should save correct mimetype",
    )
  },
)

test.serial(
  "Node.sync.publications should skip existing publications",
  async (t) => {
    // Arrange: 创建测试节点和已存在的内容
    const testNode = await Node.query().insert({
      address: TEST_ACCOUNT_NODE_A.address,
      url: "https://example.com",
      title: "Test Node",
      description: "Test Description",
      is_self: false,
      profile_version: 0,
    })

    const textContent = "# Test Post\n\nThis is a test post."
    const contentHash = await calculateContentHash(textContent)

    // 先创建一个已存在的内容和发布
    const _existingContent = await Content.create({
      type: "post",
      body: textContent,
    })
    const created_at = new Date()
    const _publication = await Publication.query().insert({
      content_hash: contentHash,
      author_address: testNode.address,
      signature: "0xexisting1234567890",
      comment_count: 3,
      created_at,
    })
    console.log(_publication)

    // Mock /ewp/publications 接口
    nock("https://example.com")
      .get("/ewp/publications")
      .query({
        since: "2024-01-01T00:00:00.000Z",
        limit: "100",
        page: "1",
      })
      .reply(200, {
        data: [
          {
            content_hash: contentHash,
            author_address: testNode.address,
            signature: "0xabcdef1234567890",
            comment_count: 5,
            created_at: created_at.toISOString(),
          },
        ],
        pagination: {
          page: 1,
          limit: 100,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      })

    // Act: 执行同步
    const result = await testNode.sync.publications("2024-01-01T00:00:00.000Z")

    // Assert
    t.is(result.success, true, "sync should succeed")
    t.is(result.syncedPublications, 0, "should not sync any new publications")
    t.is(result.syncedContents, 0, "should not sync any new contents")
    t.is(result.skippedPublications, 1, "should skip 1 existing publication")
    t.is(result.errors.length, 0, "should have no errors")
  },
)

test.serial(
  "Node.sync.publications should handle pagination correctly",
  async (t) => {
    // Arrange: 创建测试节点
    const testNode = await Node.query().insert({
      address: TEST_ACCOUNT_NODE_A.address,
      url: "https://example.com",
      title: "Test Node",
      description: "Test Description",
      is_self: false,
      profile_version: 0,
    })

    const textContent1 = "# Test Post 1\n\nThis is test post 1."
    const textContent2 = "# Test Post 2\n\nThis is test post 2."
    const contentHash1 = await calculateContentHash(textContent1)
    const contentHash2 = await calculateContentHash(textContent2)

    // 生成有效的签名
    const typedData1 = Publication.createStatementOfSource(
      contentHash1,
      testNode.address,
      Math.floor(Date.now() / 1000),
    )
    const signature1 = await generateSignature(
      TEST_ACCOUNT_NODE_A,
      typedData1,
      "typedData",
    )

    const typedData2 = Publication.createStatementOfSource(
      contentHash2,
      testNode.address,
      Math.floor(Date.now() / 1000),
    )
    const signature2 = await generateSignature(
      TEST_ACCOUNT_NODE_A,
      typedData2,
      "typedData",
    )

    // Mock 第一页
    nock("https://example.com")
      .get("/ewp/publications")
      .query({
        since: "2024-01-01T00:00:00.000Z",
        limit: "1",
        page: "1",
      })
      .reply(200, {
        data: [
          {
            content_hash: contentHash1,
            author_address: testNode.address,
            signature: signature1,
            comment_count: 1,
            created_at: new Date().toISOString(),
          },
        ],
        pagination: {
          page: 1,
          limit: 1,
          total: 2,
          totalPages: 2,
          hasNextPage: true,
          hasPrevPage: false,
        },
      })

    // Mock 第二页
    nock("https://example.com")
      .get("/ewp/publications")
      .query({
        since: "2024-01-01T00:00:00.000Z",
        limit: "1",
        page: "2",
      })
      .reply(200, {
        data: [
          {
            content_hash: contentHash2,
            author_address: testNode.address,
            signature: signature2,
            comment_count: 2,
            created_at: new Date().toISOString(),
          },
        ],
        pagination: {
          page: 2,
          limit: 1,
          total: 2,
          totalPages: 2,
          hasNextPage: false,
          hasPrevPage: true,
        },
      })

    // Mock 内容接口
    nock("https://example.com")
      .get(`/ewp/contents/${contentHash1}`)
      .query(true)
      .reply(200, textContent1, {
        "content-type": "text/markdown",
        "content-description": "",
      })

    nock("https://example.com")
      .get(`/ewp/contents/${contentHash2}`)
      .query(true)
      .reply(200, textContent2, {
        "content-type": "text/markdown",
        "content-description": "",
      })

    // Act: 执行同步
    const result = await testNode.sync.publications(
      "2024-01-01T00:00:00.000Z",
      { limit: 1 },
    )

    // Assert
    t.is(result.success, true, "sync should succeed")
    t.is(result.syncedPublications, 2, "should sync 2 publications")
    t.is(result.syncedContents, 2, "should sync 2 contents")
    t.is(result.pages, 2, "should process 2 pages")
    t.is(result.errors.length, 0, "should have no errors")
  },
)

test.serial(
  "Node.sync.publications should handle errors gracefully",
  async (t) => {
    // Arrange: 创建测试节点
    const testNode = await Node.query().insert({
      address: TEST_ACCOUNT_NODE_A.address,
      url: "https://example.com",
      title: "Test Node",
      description: "Test Description",
      is_self: false,
      profile_version: 0,
    })

    const textContent1 = "# Test Post 1\n\nThis is test post 1."
    const textContent2 = "# Test Post 2\n\nThis is test post 2."
    const contentHash1 = await calculateContentHash(textContent1)
    const contentHash2 = await calculateContentHash(textContent2)

    // 生成有效的签名
    const typedData1 = Publication.createStatementOfSource(
      contentHash1,
      testNode.address,
      Math.floor(Date.now() / 1000),
    )
    const signature1 = await generateSignature(
      TEST_ACCOUNT_NODE_A,
      typedData1,
      "typedData",
    )

    // Mock /ewp/publications 接口
    nock("https://example.com")
      .get("/ewp/publications")
      .query({
        since: "2024-01-01T00:00:00.000Z",
        limit: "100",
        page: "1",
      })
      .reply(200, {
        data: [
          {
            content_hash: contentHash1,
            author_address: testNode.address,
            signature: signature1,
            comment_count: 1,
            created_at: new Date().toISOString(),
          },
          {
            content_hash: contentHash2,
            author_address: testNode.address,
            signature: "0x2222222222222222", // 无效签名
            comment_count: 2,
            created_at: new Date().toISOString(),
          },
        ],
        pagination: {
          page: 1,
          limit: 100,
          total: 2,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      })

    // Mock 第一个内容成功
    nock("https://example.com")
      .get(`/ewp/contents/${contentHash1}`)
      .query(true)
      .reply(200, textContent1, {
        "content-type": "text/markdown",
        "content-description": "",
      })

    // Mock 第二个内容失败
    nock("https://example.com")
      .get(`/ewp/contents/${contentHash2}`)
      .reply(404, "Not Found")

    // Act: 执行同步
    const result = await testNode.sync.publications("2024-01-01T00:00:00.000Z")

    // Assert
    t.is(result.success, true, "sync should succeed with partial success")
    t.is(result.partialSuccess, true, "should be partial success")
    t.is(result.syncedPublications, 1, "should sync 1 publication")
    t.is(result.syncedContents, 1, "should sync 1 content")
    t.is(result.errors.length, 1, "should have 1 error")
    t.is(result.errors[0].type, "publication", "should have publication error")
    t.is(
      result.errors[0].content_hash,
      contentHash2,
      "should error on second content",
    )
  },
)

test.serial(
  "Node.sync.publication should sync single content successfully",
  async (t) => {
    // Arrange: 创建测试节点
    const testNode = await Node.query().insert({
      address: TEST_ACCOUNT_NODE_A.address,
      url: "https://example.com",
      title: "Test Node",
      description: "Test Description",
      is_self: false,
      profile_version: 0,
    })

    const textContent = "# Test Post\n\nThis is a test post."
    const contentHash = await calculateContentHash(textContent)

    // 生成有效的签名
    const typedData = Publication.createStatementOfSource(
      contentHash,
      TEST_ACCOUNT_NODE_A.address,
      Math.floor(Date.now() / 1000),
    )
    const signature = await generateSignature(
      TEST_ACCOUNT_NODE_A,
      typedData,
      "typedData",
    )

    // Mock /ewp/contents/:content_hash 接口
    nock("https://example.com")
      .get(`/ewp/contents/${contentHash}`)
      .query(true)
      .reply(200, textContent, {
        "content-type": "text/markdown",
        "content-description": "",
      })

    // Act: 执行同步
    const result = await testNode.sync.publication(typedData, signature)

    // Assert
    t.is(result.success, true, "sync should succeed")
    t.is(result.contentHash, contentHash, "should return correct content hash")
    t.is(
      result.nodeAddress,
      testNode.address,
      "should return correct node address",
    )
    t.is(result.synced, true, "should be synced")
    t.is(result.skipped, false, "should not be skipped")
    t.is(result.error, null, "should have no error")

    // 验证数据库中的数据
    const syncedPublication = await Publication.query()
      .where("content_hash", contentHash)
      .where("author_address", testNode.address)
      .first()

    t.truthy(syncedPublication, "publication should be saved to database")
    t.is(
      syncedPublication.signature,
      signature,
      "should save correct signature",
    )

    const syncedContent = await Content.query()
      .where("content_hash", contentHash)
      .first()

    t.truthy(syncedContent, "content should be saved to database")
    t.is(syncedContent.type, "POST", "should save correct content type")
    t.is(syncedContent.body, textContent, "should save correct content body")
  },
)

test.serial("Node.sync.publication should skip existing content", async (t) => {
  // Arrange: 创建测试节点和已存在的内容
  const testNode = await Node.query().insert({
    address: TEST_ACCOUNT_NODE_A.address,
    url: "https://example.com",
    title: "Test Node",
    description: "Test Description",
    is_self: false,
    profile_version: 0,
  })

  const textContent = "# Test Post\n\nThis is a test post."
  const contentHash = await calculateContentHash(textContent)

  // 先创建一个已存在的内容和发布
  const _existingContent = await Content.create({
    type: "post",
    body: textContent,
  })
  const created_at = new Date()
  await Publication.query().insert({
    content_hash: contentHash,
    author_address: testNode.address,
    signature: "0xexisting1234567890",
    comment_count: 3,
    created_at,
  })

  // 生成有效的签名
  const typedData = Publication.createStatementOfSource(
    contentHash,
    TEST_ACCOUNT_NODE_A.address,
    Math.floor(created_at.getTime() / 1000),
  )
  const signature = await generateSignature(
    TEST_ACCOUNT_NODE_A,
    typedData,
    "typedData",
  )

  // Act: 执行同步
  const result = await testNode.sync.publication(typedData, signature)

  // Assert
  t.is(result.success, true, "sync should succeed")
  t.is(result.synced, false, "should not be synced")
  t.is(result.skipped, true, "should be skipped")
  t.is(result.error, null, "should have no error")
})

test.serial(
  "Node.sync.publication should reject content without signature",
  async (t) => {
    // Arrange: 创建测试节点
    const testNode = await Node.query().insert({
      address: TEST_ACCOUNT_NODE_A.address,
      url: "https://example.com",
      title: "Test Node",
      description: "Test Description",
      is_self: false,
      profile_version: 0,
    })

    const contentHash = await calculateContentHash("test content")

    // 构造 typedData
    const typedData = Publication.createStatementOfSource(
      contentHash,
      TEST_ACCOUNT_NODE_A.addres,
      Math.floor(Date.now() / 1000),
    )

    // Act: 执行同步（不提供签名）
    const result = await testNode.sync.publication(typedData, null)

    // Assert
    t.is(result.success, false, "sync should fail")
    t.is(
      result.error,
      `Signature is required for content ${contentHash}`,
      "should require signature",
    )
    t.is(result.synced, false, "should not be synced")
    t.is(result.skipped, false, "should not be skipped")
  },
)

test.serial(
  "Node.sync.publication should reject content with invalid signature",
  async (t) => {
    // Arrange: 创建测试节点
    const testNode = await Node.query().insert({
      address: TEST_ACCOUNT_NODE_A.address,
      url: "https://example.com",
      title: "Test Node",
      description: "Test Description",
      is_self: false,
      profile_version: 0,
    })

    const contentHash = await calculateContentHash("test content")
    const invalidSignature = "0xinvalid1234567890"

    // 构造 typedData
    const typedData = Publication.createStatementOfSource(
      contentHash,
      TEST_ACCOUNT_NODE_A.address,
      Math.floor(Date.now() / 1000),
    )

    // Act: 执行同步（提供无效签名）
    const result = await testNode.sync.publication(typedData, invalidSignature)

    // Assert
    t.is(result.success, false, "sync should fail")
    t.true(
      result.error.includes("invalid signature"),
      "should reject invalid signature",
    )
    t.is(result.synced, false, "should not be synced")
    t.is(result.skipped, false, "should not be skipped")
  },
)

test.serial(
  "Node.sync.publications should skip content without signature",
  async (t) => {
    // Arrange: 创建测试节点
    const testNode = await Node.query().insert({
      address: TEST_ACCOUNT_NODE_A.address,
      url: "https://example.com",
      title: "Test Node",
      description: "Test Description",
      is_self: false,
      profile_version: 0,
    })

    const contentHash = await calculateContentHash("test content")

    // Mock /ewp/publications 接口（返回没有签名的内容）
    nock("https://example.com")
      .get("/ewp/publications")
      .query({
        since: "2024-01-01T00:00:00.000Z",
        limit: "100",
        page: "1",
      })
      .reply(200, {
        data: [
          {
            content_hash: contentHash,
            author_address: testNode.address,
            signature: null, // 没有签名
            comment_count: 5,
            created_at: new Date().toISOString(),
          },
        ],
        pagination: {
          page: 1,
          limit: 100,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      })

    // Act: 执行同步
    const result = await testNode.sync.publications("2024-01-01T00:00:00.000Z")

    // Assert
    t.is(result.success, false, "sync should fail due to missing signature")
    t.is(result.partialSuccess, true, "should be partial success")
    t.is(result.syncedPublications, 0, "should not sync any publications")
    t.is(result.syncedContents, 0, "should not sync any contents")
    t.is(result.errors.length, 1, "should have 1 error")
    t.is(result.errors[0].type, "publication", "should have publication error")
    t.is(
      result.errors[0].content_hash,
      contentHash,
      "should error on content without signature",
    )
    t.is(
      result.errors[0].error,
      "Signature is required but not provided",
      "should require signature",
    )
  },
)

test.serial(
  "Node.sync.publications should handle network errors",
  async (t) => {
    // Arrange: 创建测试节点
    const testNode = await Node.query().insert({
      address: TEST_ACCOUNT_NODE_A.address,
      url: "https://example.com",
      title: "Test Node",
      description: "Test Description",
      is_self: false,
      profile_version: 0,
    })

    // Mock 网络错误
    nock("https://example.com")
      .get("/ewp/publications")
      .query({
        since: "2024-01-01T00:00:00.000Z",
        limit: "100",
        page: "1",
      })
      .replyWithError("Network error")

    // Act: 执行同步
    const result = await testNode.sync.publications("2024-01-01T00:00:00.000Z")

    // Assert: 应该返回失败结果而不是抛出错误
    t.is(result.success, false, "sync should fail")
    t.is(result.partialSuccess, true, "should be partial success")
    t.is(result.errors.length, 1, "should have 1 error")
    t.is(result.errors[0].type, "page", "should have page error")
    t.is(result.errors[0].error, "Network error", "should have network error")
  },
)
