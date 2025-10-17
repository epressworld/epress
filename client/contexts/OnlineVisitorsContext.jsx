"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"
import { useAccount } from "wagmi"

/**
 * 在线访客 Context
 *
 * 使用 Context 来共享在线访客状态,避免多个组件重复请求
 *
 * 功能:
 * 1. 钱包连接时自动注册访客
 * 2. 监听用户活动（鼠标移动、键盘按键、点击、滚动）
 * 3. 用户活动时发送心跳包更新活跃时间
 * 4. 钱包断开时自动移除访客
 * 5. 获取在线访客列表
 *
 * 性能优化:
 * - 全局单例,所有组件共享同一个状态
 * - 使用节流限制心跳包频率（最多每30秒一次）
 * - 使用防抖限制活动监听器触发频率
 * - 只在用户活动时发送心跳,静置超过15分钟自动离线
 */

const OnlineVisitorsContext = createContext(null)

export function OnlineVisitorsProvider({ children }) {
  const { address, isConnected } = useAccount()
  const [onlineVisitors, setOnlineVisitors] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  // 使用 ref 存储定时器和状态,避免闭包问题
  const activityTimeoutRef = useRef(null)
  const lastHeartbeatRef = useRef(0)
  const isRegisteredRef = useRef(false)
  const refreshIntervalRef = useRef(null)

  // 心跳间隔（30秒）- 用于节流
  const HEARTBEAT_INTERVAL = 30 * 1000
  // 活动防抖延迟（5秒）
  const ACTIVITY_DEBOUNCE = 5 * 1000
  // 刷新间隔（30秒）
  const REFRESH_INTERVAL = 30 * 1000

  /**
   * 获取在线访客列表
   */
  const fetchOnlineVisitors = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/visitors")
      if (response.ok) {
        const data = await response.json()
        setOnlineVisitors(data.visitors || [])
      }
    } catch (error) {
      console.error("[OnlineVisitors] Failed to fetch visitors:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * 注册访客
   */
  const registerVisitor = useCallback(async () => {
    if (!address || !isConnected) return

    try {
      const response = await fetch("/api/visitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      })

      if (response.ok) {
        isRegisteredRef.current = true
        lastHeartbeatRef.current = Date.now()
        // 注册成功后立即获取在线访客列表
        await fetchOnlineVisitors()
      }
    } catch (error) {
      console.error("[OnlineVisitors] Failed to register visitor:", error)
    }
  }, [address, isConnected, fetchOnlineVisitors])

  /**
   * 移除访客
   */
  const unregisterVisitor = useCallback(async () => {
    if (!address) return

    try {
      await fetch("/api/visitors", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      })

      isRegisteredRef.current = false
      // 移除访客后立即刷新在线列表
      await fetchOnlineVisitors()
    } catch (error) {
      console.error("[OnlineVisitors] Failed to unregister visitor:", error)
    }
  }, [address, fetchOnlineVisitors])

  /**
   * 发送心跳包（节流）
   */
  const sendHeartbeat = useCallback(async () => {
    if (!address || !isConnected) return

    const now = Date.now()
    // 节流：如果距离上次心跳不足30秒,则跳过
    if (now - lastHeartbeatRef.current < HEARTBEAT_INTERVAL) {
      return
    }

    try {
      await fetch("/api/visitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      })

      lastHeartbeatRef.current = now
    } catch (error) {
      console.error("[OnlineVisitors] Failed to send heartbeat:", error)
    }
  }, [address, isConnected, HEARTBEAT_INTERVAL])

  /**
   * 处理用户活动（防抖）
   */
  const handleUserActivity = useCallback(() => {
    // 清除之前的防抖定时器
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current)
    }

    // 设置新的防抖定时器
    activityTimeoutRef.current = setTimeout(() => {
      sendHeartbeat()
    }, ACTIVITY_DEBOUNCE)
  }, [sendHeartbeat, ACTIVITY_DEBOUNCE])

  /**
   * 检查指定地址是否在线
   */
  const isAddressOnline = useCallback(
    (checkAddress) => {
      if (!checkAddress) return false
      return onlineVisitors.some(
        (visitor) =>
          visitor.address.toLowerCase() === checkAddress.toLowerCase(),
      )
    },
    [onlineVisitors],
  )

  // 钱包连接/断开处理
  useEffect(() => {
    if (isConnected && address) {
      // 钱包连接时立即注册访客（包括页面刷新时的自动重连）
      registerVisitor()

      // 添加用户活动监听器
      window.addEventListener("mousemove", handleUserActivity)
      window.addEventListener("keydown", handleUserActivity)
      window.addEventListener("click", handleUserActivity)
      window.addEventListener("scroll", handleUserActivity)

      return () => {
        // 清理防抖定时器
        if (activityTimeoutRef.current) {
          clearTimeout(activityTimeoutRef.current)
        }

        // 移除事件监听器
        window.removeEventListener("mousemove", handleUserActivity)
        window.removeEventListener("keydown", handleUserActivity)
        window.removeEventListener("click", handleUserActivity)
        window.removeEventListener("scroll", handleUserActivity)

        // 钱包断开时移除访客
        unregisterVisitor()
      }
    } else {
      // 钱包未连接时,也获取一次在线访客列表（显示其他人的在线状态）
      fetchOnlineVisitors()
    }
  }, [
    isConnected,
    address,
    registerVisitor,
    unregisterVisitor,
    handleUserActivity,
    fetchOnlineVisitors,
  ])

  // 定期刷新在线访客列表（每30秒）
  useEffect(() => {
    // 设置定期刷新
    refreshIntervalRef.current = setInterval(
      fetchOnlineVisitors,
      REFRESH_INTERVAL,
    )

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [fetchOnlineVisitors, REFRESH_INTERVAL])

  const value = {
    onlineVisitors,
    onlineCount: onlineVisitors.length,
    isLoading,
    isAddressOnline,
    refreshVisitors: fetchOnlineVisitors,
  }

  return (
    <OnlineVisitorsContext.Provider value={value}>
      {children}
    </OnlineVisitorsContext.Provider>
  )
}

/**
 * 使用在线访客 Hook
 */
export function useOnlineVisitors() {
  const context = useContext(OnlineVisitorsContext)
  if (!context) {
    throw new Error(
      "useOnlineVisitors must be used within OnlineVisitorsProvider",
    )
  }
  return context
}
