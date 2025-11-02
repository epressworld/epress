import webpush from "web-push"
import { Setting } from "../models/index.mjs"

/**
 * 发送Web推送通知给节点所有者
 * @param {string} visitorAddress - 新访客的以太坊地址
 * @param {object} log - 日志记录器
 */
export async function sendPushNotification(msg, log = console) {
  try {
    // 获取VAPID密钥
    const vapidKeys = await Setting.get("notification_vapid_keys")

    if (!vapidKeys) {
      log.warn("VAPID keys not configured, skipping push notification")
      return
    }

    // 获取订阅列表
    const subscriptions = await Setting.get("notification_subscriptions")

    if (!subscriptions) {
      log.debug("No subscriptions found, skipping push notification")
      return
    }

    try {
      if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
        log.debug("No valid subscriptions found")
        return
      }
    } catch (parseError) {
      log.error("Failed to parse subscriptions:", parseError)
      return
    }

    // 配置VAPID详情
    webpush.setVapidDetails(
      "https://epress.blog", // 可以从设置中获取
      vapidKeys.publicKey,
      vapidKeys.privateKey,
    )

    // 发送到所有订阅
    const invalidSubscriptions = []
    const sendPromises = subscriptions.map(async (subscription, index) => {
      try {
        await webpush.sendNotification(subscription, JSON.stringify(msg))
        log.debug(
          { endpoint: subscription.endpoint },
          "Push notification sent successfully",
        )
      } catch (error) {
        if (error.statusCode === 410 || error.statusCode === 404) {
          log.info(
            { endpoint: subscription.endpoint },
            "Subscription expired, marking for removal",
          )
          invalidSubscriptions.push(index)
        } else {
          log.error(
            {
              endpoint: subscription.endpoint,
              error: error.message,
              statusCode: error.statusCode,
            },
            "Failed to send push notification",
          )
        }
      }
    })

    await Promise.allSettled(sendPromises)

    // 移除无效的订阅
    if (invalidSubscriptions.length > 0) {
      const validSubscriptions = subscriptions.filter(
        (_, index) => !invalidSubscriptions.includes(index),
      )
      await Setting.set("notification_subscriptions", validSubscriptions)
      log.info(
        { removed: invalidSubscriptions.length },
        "Cleaned up expired subscriptions",
      )
    }
    log.info(
      {
        total_subscriptions: subscriptions.length,
        invalid_subscriptions: invalidSubscriptions.length,
      },
      "Push notifications processing completed",
    )
  } catch (error) {
    log.error(
      {
        error: error.message,
        stack: error.stack,
      },
      "Unexpected error while sending push notification",
    )
    throw error
  }
}
