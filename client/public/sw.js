const CACHE_NAME = "epress" // 更新缓存名称以触发更新
const urlsToCache = ["/", "/publications", "/connections", "/manifest.json"]

// 监听 install 事件，在其中缓存 App Shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Service Worker: Caching App Shell")
      return cache.addAll(urlsToCache)
    }),
  )
})

// 监听 activate 事件，在其中清理旧缓存
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // 如果缓存名称不匹配，则删除
          if (cacheName !== CACHE_NAME) {
            console.log("Service Worker: Clearing old cache:", cacheName)
            return caches.delete(cacheName)
          }
          return null
        }),
      )
    }),
  )
  return self.clients.claim()
})

// 监听 fetch 事件，应用"网络优先"策略，但对 Range Request 特殊处理
self.addEventListener("fetch", (event) => {
  // 我们只处理 GET 请求
  if (event.request.method !== "GET") {
    return
  }

  // --- 新增：处理 Range Requests ---
  if (event.request.headers.has("range")) {
    // 对于 Range Request，总是直接从网络获取，不经过缓存
    event.respondWith(fetch(event.request))
    return
  }

  // --- 对非 Range Request 沿用"网络优先"策略 ---
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // 请求成功，克隆响应并存入缓存
        const responseToCache = networkResponse.clone()
        caches.open(CACHE_NAME).then((cache) => {
          // 只缓存状态码为 200 的成功响应
          if (responseToCache.status === 200) {
            cache.put(event.request, responseToCache)
          }
        })
        return networkResponse
      })
      .catch(() => {
        // 网络请求失败，尝试从缓存中返回
        return caches.match(event.request)
      }),
  )
})

// --- 推送通知功能 ---

/**
 * 监听推送事件
 * 当服务器发送推送通知时触发
 */
self.addEventListener("push", (event) => {
  console.log("Push notification received:", event)
  const defaultNotificationData = {
    title: "New Notification",
    body: "You have a new notification",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    tag: "default",
    data: {
      url: "/",
    },
  }

  let notificationData = {}

  // 解析推送数据
  if (event.data) {
    try {
      notificationData = { ...defaultNotificationData, ...event.data.json() }
    } catch (error) {
      console.error("Failed to parse push data:", error)
      notificationData = { ...defaultNotificationData, body: event.data.text() }
    }
  }

  // 显示通知
  const notificationPromise = self.registration.showNotification(
    notificationData.title,
    {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      data: notificationData.data,
      requireInteraction: false,
      vibrate: [200, 100, 200],
    },
  )

  event.waitUntil(
    notificationPromise.catch((error) => {
      // [重要] 在 Service Worker 控制台打印出失败的确切原因
      console.error("Failed to show notification:", error)
    }),
  )
})

/**
 * 监听通知点击事件
 * 当用户点击通知时触发
 */
self.addEventListener("notificationclick", (event) => {
  console.log("Notification clicked:", event)

  // 关闭通知
  event.notification.close()

  // 获取要打开的 URL
  const urlToOpen = event.notification.data?.url || "/"

  // 打开或聚焦到应用页面
  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((clientList) => {
        // 尝试找到已打开的匹配窗口
        for (const client of clientList) {
          if (client.url.includes(urlToOpen) && "focus" in client) {
            return client.focus()
          }
        }

        // 如果没有找到匹配窗口，打开新窗口
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen)
        }
      }),
  )
})

/**
 * 监听通知关闭事件
 * 当通知被关闭时触发（可选）
 */
self.addEventListener("notificationclose", (event) => {
  console.log("Notification closed:", event)
  // 可以在这里记录用户关闭通知的行为
})

/**
 * 监听推送订阅变化事件
 * 当推送订阅失效时触发
 */
self.addEventListener("pushsubscriptionchange", (event) => {
  console.log("Push subscription changed:", event)

  // 尝试重新订阅
  event.waitUntil(
    self.registration.pushManager
      .subscribe(event.oldSubscription.options)
      .then((subscription) => {
        console.log("Resubscribed to push notifications:", subscription)
        // 这里可以将新订阅发送到服务器
        // 但由于我们在 Service Worker 中，无法直接调用 GraphQL
        // 需要通过 postMessage 通知客户端页面
        return self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: "PUSH_SUBSCRIPTION_CHANGED",
              subscription: subscription.toJSON(),
            })
          })
        })
      })
      .catch((error) => {
        console.error("Failed to resubscribe:", error)
      }),
  )
})
