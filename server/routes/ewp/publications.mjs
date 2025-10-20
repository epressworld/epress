import { Router } from "swiftify"
import { Publication } from "../../models/index.mjs"

const router = new Router()

router.get("/publications", async (request, reply) => {
  try {
    // 1. 解析查询参数
    const { since, limit = 100, page = 1 } = request.query

    // 2. 参数验证
    const limitNum = parseInt(limit, 10)
    const pageNum = parseInt(page, 10)

    if (Number.isNaN(limitNum) || limitNum <= 0 || limitNum > 1000) {
      return reply.code(400).send({ error: "INVALID_LIMIT" })
    }

    if (Number.isNaN(pageNum) || pageNum <= 0) {
      return reply.code(400).send({ error: "INVALID_PAGE" })
    }

    // 3. 获取节点所有者信息
    const selfNode = await request.config.getSelfNode()

    // 4. 构建查询条件 - 只查询节点所有者的内容
    let query = Publication.query()
      .where("author_address", selfNode.address)
      .orderBy("created_at", "asc") // 按时间顺序从过去到现在

    // 5. 如果有 since 参数，添加时间过滤
    if (since) {
      const sinceDate = new Date(since)
      if (Number.isNaN(sinceDate.getTime())) {
        return reply.code(400).send({ error: "INVALID_SINCE_FORMAT" })
      }
      query = query.where("created_at", ">=", sinceDate)
    }

    // 6. 计算分页
    const offset = (pageNum - 1) * limitNum

    // 7. 执行查询
    const [publications, totalCount] = await Promise.all([
      query.limit(limitNum).offset(offset),
      query.clone().resultSize(),
    ])

    // 8. 计算分页信息
    const totalPages = Math.ceil(totalCount / limitNum)
    const hasNextPage = pageNum < totalPages
    const hasPrevPage = pageNum > 1

    // 9. 格式化返回数据 - 只返回必要信息
    const formattedPublications = publications.map((pub) => ({
      content_hash: pub.content_hash,
      author_address: pub.author_address,
      signature: pub.signature,
      comment_count: pub.comment_count,
      created_at: pub.created_at,
    }))

    // 10. 返回结果
    return reply.send({
      data: formattedPublications,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
    })
  } catch (error) {
    request.log.error({ err: error }, "Error in /publications endpoint:")
    return reply.code(500).send({ error: "INTERNAL_ERROR" })
  }
})

export default router.plugin()
