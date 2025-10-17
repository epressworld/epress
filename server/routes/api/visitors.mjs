import { Router } from "swiftify"

const router = new Router()

/**
 * Online Visitors Tracking API
 *
 * 在线访客追踪 API
 * 使用内存存储访客信息，包括以太坊地址和最后活跃时间
 *
 * 数据结构:
 * visitors = Map {
 *   address: { address, lastActive }
 * }
 */

// 内存存储访客信息
const visitors = new Map()

// 访客过期时间（15分钟，单位：毫秒）
const VISITOR_TIMEOUT = 15 * 60 * 1000

/**
 * 清理过期访客
 * 移除超过15分钟未活跃的访客
 */
function cleanupExpiredVisitors() {
  const now = Date.now()
  const expiredAddresses = []

  for (const [address, visitor] of visitors.entries()) {
    if (now - visitor.lastActive > VISITOR_TIMEOUT) {
      expiredAddresses.push(address)
    }
  }

  expiredAddresses.forEach((address) => {
    visitors.delete(address)
  })

  if (expiredAddresses.length > 0) {
    console.log(
      `[Visitors API] Cleaned up ${expiredAddresses.length} expired visitors`,
    )
  }
}

// 定期清理过期访客（每分钟执行一次）
const cleanupInterval = setInterval(cleanupExpiredVisitors, 60 * 1000)

// 导出清理函数供测试使用
export { cleanupExpiredVisitors, visitors, VISITOR_TIMEOUT, cleanupInterval }

/**
 * 验证以太坊地址格式
 * @param {string} address - 以太坊地址
 * @returns {boolean} - 是否有效
 */
function isValidEthereumAddress(address) {
  return typeof address === "string" && /^0x[a-fA-F0-9]{40}$/.test(address)
}

/**
 * POST /api/visitors
 * 添加或更新访客的最后活跃时间
 *
 * Request Body:
 * {
 *   address: string // 以太坊地址
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   address: string,
 *   lastActive: number
 * }
 */
router.post("/visitors", async (request, reply) => {
  try {
    const { address } = request.body

    // 验证地址格式
    if (!address || typeof address !== "string") {
      return reply.code(400).send({
        success: false,
        error: "Invalid address",
      })
    }

    // 验证以太坊地址格式 (0x + 40个十六进制字符)
    if (!isValidEthereumAddress(address)) {
      return reply.code(400).send({
        success: false,
        error: "Invalid Ethereum address format",
      })
    }

    const now = Date.now()

    // 更新或添加访客
    visitors.set(address, {
      address,
      lastActive: now,
    })

    return reply.code(200).send({
      success: true,
      address,
      lastActive: now,
    })
  } catch (error) {
    request.log.error(error, "[Visitors API] POST error")
    return reply.code(500).send({
      success: false,
      error: "Internal server error",
    })
  }
})

/**
 * DELETE /api/visitors
 * 移除访客
 *
 * Request Body:
 * {
 *   address: string // 以太坊地址
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   address: string,
 *   existed: boolean
 * }
 */
router.delete("/visitors", async (request, reply) => {
  try {
    const { address } = request.body

    // 验证地址格式
    if (!address || typeof address !== "string") {
      return reply.code(400).send({
        success: false,
        error: "Invalid address",
      })
    }

    // 验证以太坊地址格式
    if (!isValidEthereumAddress(address)) {
      return reply.code(400).send({
        success: false,
        error: "Invalid Ethereum address format",
      })
    }

    // 移除访客
    const existed = visitors.delete(address)

    return reply.code(200).send({
      success: true,
      address,
      existed,
    })
  } catch (error) {
    request.log.error(error, "[Visitors API] DELETE error")
    return reply.code(500).send({
      success: false,
      error: "Internal server error",
    })
  }
})

/**
 * GET /api/visitors
 * 获取所有在线访客列表
 *
 * Response:
 * {
 *   success: boolean,
 *   visitors: Array<{ address: string, lastActive: number }>,
 *   count: number
 * }
 */
router.get("/visitors", async (request, reply) => {
  try {
    // 清理过期访客
    cleanupExpiredVisitors()

    // 返回所有访客列表
    const visitorsList = Array.from(visitors.values())

    return reply.code(200).send({
      success: true,
      visitors: visitorsList,
      count: visitorsList.length,
    })
  } catch (error) {
    request.log.error(error, "[Visitors API] GET error")
    return reply.code(500).send({
      success: false,
      error: "Internal server error",
    })
  }
})

export default router.plugin()
