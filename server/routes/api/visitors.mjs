import { Router } from "swiftify"
import validator from "validator"
import {
  getNotificationService,
  NoSubscriptionsError,
  VapidNotConfiguredError,
} from "../../utils/webpush.mjs"

const router = new Router()

/**
 * Online Visitors Tracking API
 *
 * 在线访客追踪 API
 * 使用内存存储访客信息,包括以太坊地址和最后活跃时间
 *
 * 数据结构:
 * visitors = Map {
 *   address: { address, lastActive, addedAt }
 * }
 */

// 内存存储访客信息
const visitors = new Map()

// 访客过期时间(15分钟,单位:毫秒)
const VISITOR_TIMEOUT = 15 * 60 * 1000

// 最大访客数量限制(防止内存耗尽攻击)
const MAX_VISITORS = 1000

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

/**
 * 执行 FIFO 驱逐策略
 * 当访客数量超过限制时,移除最早添加的访客
 */
function evictOldestVisitor() {
  if (visitors.size === 0) return

  // 找到最早添加的访客
  let oldestAddress = null
  let oldestTime = Infinity

  for (const [address, visitor] of visitors.entries()) {
    if (visitor.addedAt < oldestTime) {
      oldestTime = visitor.addedAt
      oldestAddress = address
    }
  }

  if (oldestAddress) {
    visitors.delete(oldestAddress)
    console.log(
      `[Visitors API] Evicted oldest visitor: ${oldestAddress} (FIFO)`,
    )
  }
}

// 定期清理过期访客(每分钟执行一次)
const cleanupInterval = setInterval(cleanupExpiredVisitors, 60 * 1000)

// 导出清理函数和常量供测试使用
export {
  cleanupExpiredVisitors,
  visitors,
  VISITOR_TIMEOUT,
  cleanupInterval,
  MAX_VISITORS,
  evictOldestVisitor,
}

/**
 * 发送新访客通知
 * @param {string} address - 访客地址
 * @param {string} selfNodeAddress - 自己的节点地址
 * @param {string} vapidSubject - VAPID subject (通常是节点URL)
 * @param {object} logger - 日志记录器
 */
async function sendNewVisitorNotification(
  address,
  selfNodeAddress,
  vapidSubject,
  logger,
) {
  // 不给自己发送通知
  if (address.toLowerCase() === selfNodeAddress.toLowerCase()) {
    return
  }

  try {
    const service = await getNotificationService({ vapidSubject })

    await service.notify({
      title: "New Visitor",
      body: `Visitor ${address.slice(0, 6)}...${address.slice(-4)} has connected to your node`,
      tag: "new-visitor",
      data: {
        url: "/",
        timestamp: Date.now(),
      },
    })

    logger.debug({ address }, "Push notification sent for new visitor")
  } catch (error) {
    // 优雅地处理通知错误
    if (error instanceof VapidNotConfiguredError) {
      logger.debug("Push notifications not configured, skipping")
    } else if (error instanceof NoSubscriptionsError) {
      logger.debug("No push notification subscriptions, skipping")
    } else {
      logger.error(
        {
          error: error.message,
          stack: error.stack,
          address,
        },
        "Failed to send push notification for new visitor",
      )
    }
  }
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
 *   lastActive: number,
 *   evicted?: boolean // 是否触发了 FIFO 驱逐
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
    if (!validator.isEthereumAddress(address)) {
      return reply.code(400).send({
        success: false,
        error: "Invalid Ethereum address format",
      })
    }

    const now = Date.now()
    const existingVisitor = visitors.get(address)
    let evicted = false
    let isNewVisitor = false

    // 如果是新访客且已达到限制,执行 FIFO 驱逐
    if (!existingVisitor && visitors.size >= MAX_VISITORS) {
      evictOldestVisitor()
      evicted = true
    }

    // 检查是否为新访客
    if (!existingVisitor) {
      isNewVisitor = true
    }

    // 更新或添加访客
    visitors.set(address, {
      address,
      lastActive: now,
      addedAt: existingVisitor ? existingVisitor.addedAt : now,
    })

    // 如果是新访客,发送推送通知 (异步,不阻塞响应)
    if (isNewVisitor) {
      request.config.getSelfNode().then(async (selfNode) => {
        await sendNewVisitorNotification(
          address,
          selfNode.address,
          selfNode.url,
          request.log,
        )
      })
    }

    const response = {
      success: true,
      address,
      lastActive: now,
    }

    if (evicted) {
      response.evicted = true
    }

    return reply.code(200).send(response)
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
    if (!validator.isEthereumAddress(address)) {
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
 *   count: number,
 *   limit: number
 * }
 */
router.get("/visitors", async (request, reply) => {
  try {
    // 清理过期访客
    cleanupExpiredVisitors()

    // 返回所有访客列表(不包含内部的 addedAt 字段)
    const visitorsList = Array.from(visitors.values()).map((v) => ({
      address: v.address,
      lastActive: v.lastActive,
    }))

    return reply.code(200).send({
      success: true,
      visitors: visitorsList,
      count: visitorsList.length,
      limit: MAX_VISITORS,
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
