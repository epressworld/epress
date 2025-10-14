// public/sw.js - 最终修复版

const CACHE_NAME = "epress-v2" // 更新缓存名称以触发更新
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

// 监听 fetch 事件，应用“网络优先”策略，但对 Range Request 特殊处理
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

  // --- 对非 Range Request 沿用“网络优先”策略 ---
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
