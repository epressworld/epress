"use client"

import { useMutation } from "@apollo/client/react"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"
import { useAuth } from "@/contexts/AuthContext"
import { usePage } from "@/contexts/PageContext"
import { SUBSCRIBE_NOTIFICATION, UNSUBSCRIBE_NOTIFICATION } from "@/lib/apollo"
import {
  formatSubscriptionForServer,
  getCurrentSubscription,
  getNotificationPermission,
  isPushNotificationSupported,
  isSubscriptionValid,
  requestNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
} from "@/utils/helpers/pushNotificaiton"

const PushNotificationContext = createContext()

export function PushNotificationProvider({ children }) {
  const { settings } = usePage()
  const { authStatus, AUTH_STATUS, isNodeOwner } = useAuth()

  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState("default")
  const [subscription, setSubscription] = useState(null)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isClient, setIsClient] = useState(false)

  const [subscribeNotification] = useMutation(SUBSCRIBE_NOTIFICATION)
  const [unsubscribeNotification] = useMutation(UNSUBSCRIBE_NOTIFICATION)

  // 检测客户端环境
  useEffect(() => {
    setIsClient(true)
  }, [])

  // 初始化：检查浏览器支持和当前状态
  useEffect(() => {
    if (!isClient) return

    const initPushNotification = async () => {
      // 检查浏览器支持
      const supported = isPushNotificationSupported()
      setIsSupported(supported)

      if (!supported) {
        console.log("Push notifications are not supported")
        return
      }

      // 获取当前权限状态
      const currentPermission = getNotificationPermission()
      setPermission(currentPermission)

      // 如果已授权，检查现有订阅
      if (currentPermission === "granted") {
        try {
          const currentSubscription = await getCurrentSubscription()
          if (currentSubscription && isSubscriptionValid(currentSubscription)) {
            setSubscription(currentSubscription)
            setIsSubscribed(true)
          } else {
            setIsSubscribed(false)
          }
        } catch (error) {
          console.error("Failed to get current subscription:", error)
        }
      }
    }

    initPushNotification()
  }, [isClient])

  useEffect(() => {
    if (!isClient || typeof navigator === "undefined") return

    const handleMessage = (event) => {
      if (event.data?.type === "PUSH_SUBSCRIPTION_CHANGED") {
        // 订阅已更改，重新保存
        const newSubscription = event.data.subscription
        if (newSubscription) {
          handleSubscriptionChange(newSubscription).catch((error) => {
            console.error("Failed to handle subscription change:", error)
          })
        }
      }
    }

    navigator.serviceWorker?.addEventListener("message", handleMessage)

    return () => {
      navigator.serviceWorker?.removeEventListener("message", handleMessage)
    }
  }, [isClient])

  // 处理订阅变化
  const handleSubscriptionChange = async (newSubscription) => {
    try {
      const formattedSubscription = formatSubscriptionForServer(newSubscription)
      await subscribeNotification({
        variables: { subscription: formattedSubscription },
      })
      setSubscription(newSubscription)
      setIsSubscribed(true)
      console.log("Subscription updated successfully")
    } catch (error) {
      console.error("Failed to save updated subscription:", error)
    }
  }

  // 订阅推送通知
  const subscribe = useCallback(async () => {
    if (!isClient) {
      throw new Error(
        "Push notification subscription is only available on the client",
      )
    }

    if (!isSupported) {
      throw new Error("Push notifications are not supported in this browser")
    }

    if (!settings?.vapidPublicKey) {
      throw new Error("VAPID public key is not configured")
    }

    if (!isNodeOwner) {
      throw new Error("Only node owner can subscribe to push notifications")
    }

    if (authStatus !== AUTH_STATUS.AUTHENTICATED) {
      throw new Error("You must be authenticated to subscribe")
    }

    setIsLoading(true)
    setError(null)

    try {
      // 请求通知权限
      let currentPermission = permission
      if (currentPermission !== "granted") {
        currentPermission = await requestNotificationPermission()
        setPermission(currentPermission)
      }

      if (currentPermission !== "granted") {
        throw new Error("Notification permission denied")
      }

      // 订阅推送通知
      const newSubscription = await subscribeToPushNotifications(
        settings.vapidPublicKey,
      )

      // 保存订阅到服务器
      const formattedSubscription = formatSubscriptionForServer(newSubscription)
      await subscribeNotification({
        variables: { subscription: formattedSubscription },
      })

      setSubscription(newSubscription)
      setIsSubscribed(true)
      setIsLoading(false)

      return newSubscription
    } catch (error) {
      console.error("Failed to subscribe to push notifications:", error)
      setError(error.message)
      setIsLoading(false)
      throw error
    }
  }, [
    isClient,
    isSupported,
    settings?.vapidPublicKey,
    isNodeOwner,
    authStatus,
    AUTH_STATUS.AUTHENTICATED,
    permission,
    subscribeNotification,
  ])

  // 取消订阅
  const unsubscribe = useCallback(async () => {
    if (!isClient) {
      throw new Error("Unsubscribe is only available on the client")
    }

    if (!isSupported) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const subscription = await getCurrentSubscription()
      await unsubscribeNotification({
        variables: { endpoint: subscription.endpoint },
      })
      const success = await unsubscribeFromPushNotifications()
      if (success) {
        setSubscription(null)
        setIsSubscribed(false)
      }
      setIsLoading(false)
      return success
    } catch (error) {
      console.error("Failed to unsubscribe from push notifications:", error)
      setError(error.message)
      setIsLoading(false)
      throw error
    }
  }, [isClient, isSupported])

  // 检查并更新订阅状态
  const checkSubscription = useCallback(async () => {
    if (!isClient || !isSupported) return

    try {
      const currentSubscription = await getCurrentSubscription()
      if (currentSubscription && isSubscriptionValid(currentSubscription)) {
        setSubscription(currentSubscription)
        setIsSubscribed(true)
      } else {
        setSubscription(null)
        setIsSubscribed(false)
      }
    } catch (error) {
      console.error("Failed to check subscription:", error)
    }
  }, [isClient, isSupported])

  const value = {
    // 状态
    isSupported,
    permission,
    subscription,
    isSubscribed,
    isLoading,
    error,

    // 操作
    subscribe,
    unsubscribe,
    checkSubscription,

    // 辅助信息
    canSubscribe:
      isSupported &&
      isNodeOwner &&
      authStatus === AUTH_STATUS.AUTHENTICATED &&
      !!settings?.vapidPublicKey,
  }

  return (
    <PushNotificationContext.Provider value={value}>
      {children}
    </PushNotificationContext.Provider>
  )
}

export function usePushNotification() {
  const context = useContext(PushNotificationContext)
  if (!context) {
    throw new Error(
      "usePushNotification must be used within a PushNotificationProvider",
    )
  }
  return context
}
