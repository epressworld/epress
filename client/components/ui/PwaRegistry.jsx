"use client"

import { useEffect } from "react"

export function PwaRegistry() {
  useEffect(() => {
    // 检查 navigator 对象中是否存在 serviceWorker
    if ("serviceWorker" in navigator) {
      // 在 window load 事件后注册 Service Worker
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js") // 注册 sw.js 文件
          .then((registration) => {
            console.log("Service Worker registered: ", registration)
          })
          .catch((registrationError) => {
            console.log(
              "Service Worker registration failed: ",
              registrationError,
            )
          })
      })
    }
  }, [])

  return null // 这个组件不需要渲染任何 UI
}
