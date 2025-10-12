import test from "ava"
import "../../setup.mjs"
import { Content, Node, Publication } from "../../../server/models/index.mjs"

test.beforeEach(async () => {
  // 清理测试数据 - 按依赖关系顺序删除
  await Publication.query().delete()
  await Content.query().delete()
  await Node.query().where("is_self", false).delete()
})

test.afterEach(async () => {
  // 确保测试后完全清理
  await Publication.query().delete()
  await Content.query().delete()
  await Node.query().where("is_self", false).delete()
})

test.serial(
  "GET /publications should return self node publications with default pagination",
  async (t) => {
    // Arrange: 创建自节点数据
    const selfNode = await Node.query().findOne({ is_self: true })
    t.truthy(selfNode, "self node should exist")

    const content = await Content.create({
      type: "POST",
      body: "# Default Pagination Test Post\n\nThis is a default pagination test post.",
    })

    await Publication.query().insert({
      content_hash: content.content_hash,
      author_address: selfNode.address,
      signature: "0x1234567890abcdef",
      comment_count: 5,
    })

    // Act: 发送 GET 请求
    const response = await t.context.app.inject({
      method: "GET",
      url: "/ewp/publications",
    })

    // Assert
    t.is(response.statusCode, 200, "should return 200 OK")

    const result = JSON.parse(response.payload)
    t.is(result.data.length, 1, "should return 1 publication")
    t.is(result.pagination.page, 1, "should return page 1")
    t.is(result.pagination.limit, 100, "should return default limit 100")
    t.is(result.pagination.total, 1, "should return total 1")
    t.is(result.pagination.totalPages, 1, "should return totalPages 1")
    t.is(result.pagination.hasNextPage, false, "should not have next page")
    t.is(result.pagination.hasPrevPage, false, "should not have prev page")

    // 验证返回的数据结构（简化版）
    const pub = result.data[0]
    t.is(
      pub.content_hash,
      content.content_hash,
      "should return correct content_hash",
    )
    t.is(
      pub.author_address,
      selfNode.address,
      "should return correct author_address",
    )
    t.is(pub.signature, "0x1234567890abcdef", "should return correct signature")
    t.is(pub.comment_count, 5, "should return correct comment_count")
    t.truthy(pub.created_at, "should return created_at")

    // 验证不包含 author 和 content 详情
    t.falsy(pub.author, "should not include author details")
    t.falsy(pub.content, "should not include content details")
  },
)

test.serial(
  "GET /publications should support custom pagination parameters",
  async (t) => {
    // Arrange: 创建自节点数据
    const selfNode = await Node.query().findOne({ is_self: true })
    t.truthy(selfNode, "self node should exist")

    // 创建 5 个 publications
    for (let i = 0; i < 5; i++) {
      const content = await Content.create({
        type: "POST",
        body: `# Pagination Test Post ${i}\n\nThis is pagination test post ${i}.`,
      })

      await Publication.query().insert({
        content_hash: content.content_hash,
        author_address: selfNode.address,
        signature: `0x${i.toString().padStart(64, "0")}`,
        comment_count: i,
      })
    }

    // Act: 发送带分页参数的请求
    const response = await t.context.app.inject({
      method: "GET",
      url: "/ewp/publications?limit=2&page=2",
    })

    // Assert
    t.is(response.statusCode, 200, "should return 200 OK")

    const result = JSON.parse(response.payload)
    t.is(result.data.length, 2, "should return 2 publications")
    t.is(result.pagination.page, 2, "should return page 2")
    t.is(result.pagination.limit, 2, "should return limit 2")
    t.is(result.pagination.total, 5, "should return total 5")
    t.is(result.pagination.totalPages, 3, "should return totalPages 3")
    t.is(result.pagination.hasNextPage, true, "should have next page")
    t.is(result.pagination.hasPrevPage, true, "should have prev page")
  },
)

test.serial(
  "GET /publications should support since parameter for time filtering",
  async (t) => {
    // Arrange: 创建自节点数据
    const selfNode = await Node.query().findOne({ is_self: true })
    t.truthy(selfNode, "self node should exist")

    const baseTime = new Date("2024-01-01T00:00:00Z")

    // 创建 3 个不同时间的 publications
    for (let i = 0; i < 3; i++) {
      const content = await Content.create({
        type: "POST",
        body: `# Since Test Post ${i}\n\nThis is since test post ${i}.`,
      })

      const pub = await Publication.query().insert({
        content_hash: content.content_hash,
        author_address: selfNode.address,
        signature: `0x${i.toString().padStart(64, "0")}`,
        comment_count: i,
      })

      // 手动设置 created_at 时间
      const pubTime = new Date(baseTime.getTime() + i * 3600000) // 每小时一个
      await Publication.query().findById(pub.id).patch({
        created_at: pubTime,
      })
    }

    // Act: 发送带 since 参数的请求（只获取第二个和第三个）
    const sinceTime = new Date(baseTime.getTime() + 30 * 60000) // 30分钟后
    const response = await t.context.app.inject({
      method: "GET",
      url: `/ewp/publications?since=${sinceTime.toISOString()}`,
    })

    // Assert
    t.is(response.statusCode, 200, "should return 200 OK")

    const result = JSON.parse(response.payload)
    t.is(result.data.length, 2, "should return 2 publications after since time")
    t.is(result.pagination.total, 2, "should return total 2")
  },
)

test.serial(
  "GET /publications should return publications in chronological order",
  async (t) => {
    // Arrange: 创建自节点数据
    const selfNode = await Node.query().findOne({ is_self: true })
    t.truthy(selfNode, "self node should exist")

    const baseTime = new Date("2024-01-01T00:00:00Z")

    // 创建 3 个不同时间的 publications（乱序插入）
    const times = [2, 0, 1] // 乱序
    for (const hourOffset of times) {
      const content = await Content.create({
        type: "POST",
        body: `# Chronological Test Post ${hourOffset}\n\nThis is chronological test post ${hourOffset}.`,
      })

      const pub = await Publication.query().insert({
        content_hash: content.content_hash,
        author_address: selfNode.address,
        signature: `0x${hourOffset.toString().padStart(64, "0")}`,
        comment_count: hourOffset,
      })

      // 手动设置 created_at 时间
      const pubTime = new Date(baseTime.getTime() + hourOffset * 3600000)
      await Publication.query().findById(pub.id).patch({
        created_at: pubTime,
      })
    }

    // Act: 发送请求
    const response = await t.context.app.inject({
      method: "GET",
      url: "/ewp/publications",
    })

    // Assert
    t.is(response.statusCode, 200, "should return 200 OK")

    const result = JSON.parse(response.payload)
    t.is(result.data.length, 3, "should return 3 publications")

    // 验证时间顺序（从早到晚）
    const createdAts = result.data.map((pub) => new Date(pub.created_at))
    for (let i = 1; i < createdAts.length; i++) {
      t.true(
        createdAts[i] >= createdAts[i - 1],
        `publication ${i} should be after publication ${i - 1}`,
      )
    }
  },
)

test("GET /publications should handle invalid parameters", async (t) => {
  // Test invalid limit
  const response1 = await t.context.app.inject({
    method: "GET",
    url: "/ewp/publications?limit=invalid",
  })
  t.is(response1.statusCode, 400, "should return 400 for invalid limit")

  const result1 = JSON.parse(response1.payload)
  t.is(result1.error, "INVALID_LIMIT", "should return INVALID_LIMIT error")

  // Test invalid page
  const response2 = await t.context.app.inject({
    method: "GET",
    url: "/ewp/publications?page=0",
  })
  t.is(response2.statusCode, 400, "should return 400 for invalid page")

  const result2 = JSON.parse(response2.payload)
  t.is(result2.error, "INVALID_PAGE", "should return INVALID_PAGE error")

  // Test invalid since format
  const response3 = await t.context.app.inject({
    method: "GET",
    url: "/ewp/publications?since=invalid-date",
  })
  t.is(response3.statusCode, 400, "should return 400 for invalid since format")

  const result3 = JSON.parse(response3.payload)
  t.is(
    result3.error,
    "INVALID_SINCE_FORMAT",
    "should return INVALID_SINCE_FORMAT error",
  )
})

test("GET /publications should handle limit exceeding maximum", async (t) => {
  const response = await t.context.app.inject({
    method: "GET",
    url: "/ewp/publications?limit=2000",
  })

  t.is(
    response.statusCode,
    400,
    "should return 400 for limit exceeding maximum",
  )

  const result = JSON.parse(response.payload)
  t.is(result.error, "INVALID_LIMIT", "should return INVALID_LIMIT error")
})

test("GET /publications should return empty result when no publications exist", async (t) => {
  const response = await t.context.app.inject({
    method: "GET",
    url: "/ewp/publications",
  })

  t.is(response.statusCode, 200, "should return 200 OK")

  const result = JSON.parse(response.payload)
  t.is(result.data.length, 0, "should return empty data array")
  t.is(result.pagination.total, 0, "should return total 0")
  t.is(result.pagination.totalPages, 0, "should return totalPages 0")
  t.is(result.pagination.hasNextPage, false, "should not have next page")
  t.is(result.pagination.hasPrevPage, false, "should not have prev page")
})

test.serial(
  "GET /publications should only return self node publications",
  async (t) => {
    // Arrange: 创建自节点和其他节点的数据
    const selfNode = await Node.query().findOne({ is_self: true })
    t.truthy(selfNode, "self node should exist")

    const otherNode = await Node.query().insert({
      address: "0x1234567890123456789012345678901234567890",
      url: "https://example.com",
      title: "Other Node",
      description: "Other Description",
      is_self: false,
      profile_version: 0,
    })

    // 创建自节点的 publication
    const selfContent = await Content.create({
      type: "POST",
      body: "# Self Node Test Post\n\nThis is a self node test post.",
    })

    await Publication.query().insert({
      content_hash: selfContent.content_hash,
      author_address: selfNode.address,
      signature: "0xself1234567890abcdef",
      comment_count: 1,
    })

    // 创建其他节点的 publication
    const otherContent = await Content.create({
      type: "POST",
      body: "# Other Node Test Post\n\nThis is an other node test post.",
    })

    await Publication.query().insert({
      content_hash: otherContent.content_hash,
      author_address: otherNode.address,
      signature: "0xother1234567890abcdef",
      comment_count: 2,
    })

    // Act: 发送请求
    const response = await t.context.app.inject({
      method: "GET",
      url: "/ewp/publications",
    })

    // Assert
    t.is(response.statusCode, 200, "should return 200 OK")

    const result = JSON.parse(response.payload)
    t.is(result.data.length, 1, "should return only 1 publication (self node)")
    t.is(result.pagination.total, 1, "should return total 1")

    const pub = result.data[0]
    t.is(
      pub.author_address,
      selfNode.address,
      "should return only self node publication",
    )
    t.is(
      pub.signature,
      "0xself1234567890abcdef",
      "should return correct signature",
    )
  },
)
