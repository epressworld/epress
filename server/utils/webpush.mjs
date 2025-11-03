import webpush from "web-push"
import { Setting } from "../models/index.mjs"

/**
 * Custom error classes for better error handling
 */
export class VapidNotConfiguredError extends Error {
  constructor(message = "VAPID keys not configured") {
    super(message)
    this.name = "VapidNotConfiguredError"
    this.code = "VAPID_NOT_CONFIGURED"
  }
}

export class NoSubscriptionsError extends Error {
  constructor(message = "No subscriptions available") {
    super(message)
    this.name = "NoSubscriptionsError"
    this.code = "NO_SUBSCRIPTIONS"
  }
}

export class NotificationSendError extends Error {
  constructor(message, originalError, results) {
    super(message)
    this.name = "NotificationSendError"
    this.code = "NOTIFICATION_SEND_FAILED"
    this.originalError = originalError
    this.results = results
  }
}

/**
 * VAPID配置管理器
 */
class VapidConfigManager {
  constructor(settingKey = "notification_vapid_keys") {
    this.settingKey = settingKey
    this.keys = null
  }

  async load() {
    this.keys = await Setting.get(this.settingKey)
    return this.keys
  }

  isConfigured() {
    return !!this.keys?.publicKey && !!this.keys?.privateKey
  }

  getPublicKey() {
    return this.keys?.publicKey
  }

  getPrivateKey() {
    return this.keys?.privateKey
  }
}

/**
 * 订阅管理器
 */
class SubscriptionManager {
  constructor(settingKey = "notification_subscriptions") {
    this.settingKey = settingKey
    this.subscriptions = []
  }

  async load() {
    const data = await Setting.get(this.settingKey)
    this.subscriptions = Array.isArray(data) ? data : []
    return this.subscriptions
  }

  async save() {
    await Setting.set(this.settingKey, this.subscriptions)
  }

  getAll() {
    return [...this.subscriptions]
  }

  isEmpty() {
    return this.subscriptions.length === 0
  }

  async removeInvalid(indices) {
    if (indices.length === 0) return 0

    this.subscriptions = this.subscriptions.filter(
      (_, index) => !indices.includes(index),
    )
    await this.save()
    return indices.length
  }

  count() {
    return this.subscriptions.length
  }
}

/**
 * 推送通知发送器
 */
class NotificationSender {
  constructor(vapidSubject = "https://epress.blog", proxyResolver = null) {
    this.vapidSubject = /^(mailto|https):/i.test(vapidSubject)
      ? vapidSubject
      : "https://epress.blog"
    this.proxyResolver = proxyResolver || this._defaultProxyResolver
    this.invalidIndices = []
  }

  _defaultProxyResolver() {
    return process.env.http_proxy || process.env.https_proxy || null
  }

  configureVapid(publicKey, privateKey) {
    webpush.setVapidDetails(this.vapidSubject, publicKey, privateKey)
  }

  async sendToSubscription(subscription, message, index) {
    try {
      const payload = JSON.stringify(message)
      const options = {
        proxy: this.proxyResolver(),
      }

      await webpush.sendNotification(subscription, payload, options)
      return {
        success: true,
        index,
        endpoint: subscription.endpoint,
      }
    } catch (error) {
      const isExpired = error.statusCode === 410 || error.statusCode === 404

      if (isExpired) {
        this.invalidIndices.push(index)
      }

      return {
        success: false,
        index,
        endpoint: subscription.endpoint,
        error: error.message,
        statusCode: error.statusCode,
        isExpired,
      }
    }
  }

  async sendToAll(subscriptions, message) {
    this.invalidIndices = []

    const sendPromises = subscriptions.map((subscription, index) =>
      this.sendToSubscription(subscription, message, index),
    )

    const results = await Promise.allSettled(sendPromises)

    return {
      results: results.map((r) => (r.status === "fulfilled" ? r.value : null)),
      invalidIndices: this.invalidIndices,
    }
  }
}

/**
 * Web推送通知服务
 */
export class WebPushNotificationService {
  constructor(options = {}) {
    this.vapidManager = new VapidConfigManager(options.vapidKeysSettingKey)
    this.subscriptionManager = new SubscriptionManager(
      options.subscriptionsSettingKey,
    )
    this.sender = new NotificationSender(
      options.vapidSubject,
      options.proxyResolver,
    )
    this._initialized = false
  }

  async initialize() {
    if (this._initialized) return
    await this.vapidManager.load()
    await this.subscriptionManager.load()
    this._initialized = true
  }

  /**
   * 发送推送通知
   * @param {Object} message - 通知消息对象
   * @returns {Promise<Object>} 发送结果统计
   * @throws {VapidNotConfiguredError} 当VAPID密钥未配置时
   * @throws {NoSubscriptionsError} 当没有订阅者时
   * @throws {Error} 其他未预期的错误
   */
  async notify(message) {
    // 确保已初始化
    if (!this._initialized) {
      await this.initialize()
    }

    // 检查VAPID配置
    if (!this.vapidManager.isConfigured()) {
      throw new VapidNotConfiguredError()
    }

    // 检查订阅
    if (this.subscriptionManager.isEmpty()) {
      throw new NoSubscriptionsError()
    }

    // 配置VAPID
    this.sender.configureVapid(
      this.vapidManager.getPublicKey(),
      this.vapidManager.getPrivateKey(),
    )

    // 发送通知
    const subscriptions = this.subscriptionManager.getAll()
    const { results, invalidIndices } = await this.sender.sendToAll(
      subscriptions,
      message,
    )

    // 清理过期订阅
    const removedCount =
      await this.subscriptionManager.removeInvalid(invalidIndices)

    // 统计结果
    const summary = {
      success: true,
      total: subscriptions.length,
      succeeded: results.filter((r) => r?.success).length,
      failed: results.filter((r) => r && !r.success && !r.isExpired).length,
      expired: removedCount,
      results, // 包含详细结果供调用方使用
    }

    return summary
  }
}

/**
 * 获取通知服务单例（支持多配置）
 */
const serviceInstances = new Map()

export async function getNotificationService(options = {}) {
  // 使用vapidSubject作为key来区分不同的服务实例
  const key = options.vapidSubject || "default"

  if (!serviceInstances.has(key)) {
    const service = new WebPushNotificationService(options)
    await service.initialize()
    serviceInstances.set(key, service)
  }

  return serviceInstances.get(key)
}

/**
 * 清除所有服务实例（用于测试）
 */
export function clearServiceInstances() {
  serviceInstances.clear()
}
