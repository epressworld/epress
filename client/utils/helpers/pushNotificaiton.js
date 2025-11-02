/**
 * 将 Base64 编码的 VAPID 公钥转换为 Uint8Array
 * @param {string} base64String - Base64 编码的字符串
 * @returns {Uint8Array}
 */
export function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * 将 ArrayBuffer 转换为 Base64 字符串
 * @param {ArrayBuffer} buffer
 * @returns {string}
 */
export function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}

/**
 * 检查浏览器是否支持推送通知
 * @returns {boolean}
 */
export function isPushNotificationSupported() {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  )
}

/**
 * 获取当前的通知权限状态
 * @returns {NotificationPermission} 'default' | 'granted' | 'denied'
 */
export function getNotificationPermission() {
  if (!isPushNotificationSupported()) {
    return "default"
  }
  return Notification.permission
}

/**
 * 请求通知权限
 * @returns {Promise<NotificationPermission>}
 */
export async function requestNotificationPermission() {
  if (!isPushNotificationSupported()) {
    throw new Error("Push notifications are not supported in this browser")
  }

  const permission = await Notification.requestPermission()
  return permission
}

/**
 * 获取当前的推送订阅
 * @returns {Promise<PushSubscription | null>}
 */
export async function getCurrentSubscription() {
  if (!isPushNotificationSupported()) {
    return null
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    return subscription
  } catch (error) {
    console.error("Failed to get current subscription:", error)
    return null
  }
}

/**
 * 订阅推送通知
 * @param {string} vapidPublicKey - VAPID 公钥
 * @returns {Promise<PushSubscription>}
 */
export async function subscribeToPushNotifications(vapidPublicKey) {
  if (!isPushNotificationSupported()) {
    throw new Error("Push notifications are not supported in this browser")
  }

  if (!vapidPublicKey) {
    throw new Error("VAPID public key is required")
  }

  try {
    // 等待 Service Worker 准备就绪
    const registration = await navigator.serviceWorker.ready

    // 检查是否已有订阅
    let subscription = await registration.pushManager.getSubscription()

    // 如果已有订阅，先取消
    if (subscription) {
      await subscription.unsubscribe()
    }

    // 创建新订阅
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    })

    return subscription
  } catch (error) {
    console.error("Failed to subscribe to push notifications:", error)
    throw error
  }
}

/**
 * 取消推送订阅
 * @returns {Promise<boolean>}
 */
export async function unsubscribeFromPushNotifications() {
  if (!isPushNotificationSupported()) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      const successful = await subscription.unsubscribe()
      return successful
    }

    return true
  } catch (error) {
    console.error("Failed to unsubscribe from push notifications:", error)
    return false
  }
}

/**
 * 将 PushSubscription 对象转换为服务器需要的格式
 * @param {PushSubscription} subscription
 * @returns {Object}
 */
export function formatSubscriptionForServer(subscription) {
  const key = subscription.getKey("p256dh")
  const token = subscription.getKey("auth")

  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: arrayBufferToBase64(key),
      auth: arrayBufferToBase64(token),
    },
  }
}

/**
 * 检查订阅是否有效
 * @param {PushSubscription} subscription
 * @returns {boolean}
 */
export function isSubscriptionValid(subscription) {
  if (!subscription) {
    return false
  }

  // 检查订阅是否有 endpoint
  if (!subscription.endpoint) {
    return false
  }

  // 检查订阅是否有必要的密钥
  try {
    const p256dh = subscription.getKey("p256dh")
    const auth = subscription.getKey("auth")
    return !!(p256dh && auth)
  } catch (_error) {
    return false
  }
}
