"use client"

import { useApolloClient, useMutation, useQuery } from "@apollo/client/react"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { useAccount, useDisconnect, useWalletClient } from "wagmi"
import { usePage } from "@/contexts/PageContext"
import { GET_SIWE_MESSAGE, SIGN_IN_WITH_ETHEREUM, VISITOR } from "@/lib/apollo"

// 1. 定义清晰的状态枚举 - 解耦认证和钱包连接状态
export const AUTH_STATUS = {
  LOADING: "LOADING", // 初始加载中
  UNAUTHENTICATED: "UNAUTHENTICATED", // 未认证(未登录)
  AUTHENTICATED: "AUTHENTICATED", // 已认证(已登录)
}

// 钱包连接状态(独立于认证状态)
export const WALLET_STATUS = {
  DISCONNECTED: "DISCONNECTED", // 钱包未连接
  CONNECTED: "CONNECTED", // 钱包已连接
}

const AuthContext = createContext()

export function AuthProvider({ children, initialAuthState }) {
  // 使用SSR注入的初始状态 - 认证状态
  const [authStatus, setAuthStatus] = useState(() => {
    // 如果有SSR注入的状态,使用它来设置初始状态
    if (initialAuthState?.authenticated) {
      return AUTH_STATUS.AUTHENTICATED
    }
    return AUTH_STATUS.LOADING
  })

  // 钱包连接状态(独立于认证状态)
  const [walletStatus, setWalletStatus] = useState(WALLET_STATUS.DISCONNECTED)

  const [loginState, setLoginState] = useState(null)
  const [token, setToken] = useState(() => initialAuthState?.token || null)
  const [isClient, setIsClient] = useState(false)
  const apolloClient = useApolloClient()

  // 从 PageContext 获取所有页面级数据
  const { profile, loading: nodeLoading } = usePage()
  const nodeOwnerAddress = profile.address

  // 依赖 wagmi 的底层状态 - 只在客户端使用
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const { disconnect } = useDisconnect()

  // 计算当前用户是否是节点所有者
  const isNodeOwner = useMemo(() => {
    if (!isClient || !address || !nodeOwnerAddress) return false
    return address.toLowerCase() === nodeOwnerAddress.toLowerCase()
  }, [isClient, address, nodeOwnerAddress])

  // 在服务器端提供默认值，避免水合不匹配
  const safeAddress = isClient ? address : undefined
  const safeIsConnected = isClient ? isConnected : false
  const safeWalletClient = isClient ? walletClient : undefined

  // 检测客户端环境
  useEffect(() => {
    setIsClient(true)
  }, [])

  // 查询用户关注状态 - 只有在用户连接钱包时才查询
  const {
    data: visitorData,
    loading: visitorLoading,
    error: visitorError,
    refetch: refetchVisitor,
  } = useQuery(VISITOR, {
    variables: {
      address: safeAddress || "0x0000000000000000000000000000000000000000",
    },
    // 只在客户端且钱包连接时执行查询
    skip: !isClient || !safeAddress,
    // 忽略网络错误
    errorPolicy: "all",
    // 使用缓存优先策略
    fetchPolicy: "cache-first",
    // 错误处理
    onError: (error) => {
      console.error("AuthContext visitor query error:", error)
    },
  })

  const [signInWithEthereum] = useMutation(SIGN_IN_WITH_ETHEREUM)

  // 钱包连接状态同步
  useEffect(() => {
    if (!isClient) {
      return
    }

    if (safeIsConnected) {
      setWalletStatus(WALLET_STATUS.CONNECTED)
    } else {
      setWalletStatus(WALLET_STATUS.DISCONNECTED)
    }
  }, [isClient, safeIsConnected])

  // 认证状态同步逻辑(独立于钱包连接状态)
  useEffect(() => {
    // 只在客户端执行
    if (!isClient) {
      return
    }

    // 必须等待Node数据加载完成才能进行判断
    if (nodeLoading) {
      setAuthStatus(AUTH_STATUS.LOADING)
      return
    }

    // 如果已经有SSR注入的认证状态,不需要再次检查
    // 只在没有token的情况下才检查cookie
    if (!token) {
      // 通过服务端路由检测 HttpOnly cookie 是否存在，作为登录状态依据
      ;(async () => {
        try {
          const res = await fetch("/api/auth/token", { method: "GET" })
          if (res.ok) {
            const json = await res.json()
            if (json?.authenticated) {
              setAuthStatus(AUTH_STATUS.AUTHENTICATED)
            } else {
              setAuthStatus(AUTH_STATUS.UNAUTHENTICATED)
            }
          } else {
            setAuthStatus(AUTH_STATUS.UNAUTHENTICATED)
          }
        } catch (e) {
          console.error("Auth status check failed:", e)
          setAuthStatus(AUTH_STATUS.UNAUTHENTICATED)
        }
      })()
    } else {
      // 如果有token,设置为已认证状态
      setAuthStatus(AUTH_STATUS.AUTHENTICATED)
    }
  }, [isClient, token, nodeLoading])

  // 登录逻辑
  const login = useCallback(async () => {
    if (!isClient) {
      throw new Error("登录功能仅在客户端可用")
    }

    // 检查钱包是否连接
    if (
      walletStatus !== WALLET_STATUS.CONNECTED ||
      !safeWalletClient ||
      !safeAddress
    ) {
      throw new Error("无法登录：钱包未连接。")
    }

    // 节点所有者验证
    if (!isNodeOwner) {
      throw new Error("只有节点所有者可以登录")
    }

    try {
      setLoginState({ loading: true })
      const response = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: GET_SIWE_MESSAGE.loc?.source?.body || GET_SIWE_MESSAGE,
          variables: { address: safeAddress },
        }),
      })
      const result = await response.json()
      if (result.errors) {
        throw new Error(result.errors[0].message)
      }
      const message = result.data?.getSiweMessage
      if (!message) throw new Error("获取SIWE消息失败")

      const signature = await safeWalletClient.signMessage({
        account: safeAddress,
        message,
      })

      const { data: authData } = await signInWithEthereum({
        variables: { message, signature },
      })
      const newToken = authData?.signInWithEthereum
      if (!newToken) throw new Error("登录验证失败")

      // 将 token 写入 HttpOnly Cookie，供所有请求（通过中间件）注入 Authorization
      try {
        await fetch("/api/auth/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: newToken }),
        })
      } catch (e) {
        console.error("Failed to set auth cookie:", e)
      }
      setLoginState({ loading: false, error: null })
      setToken(newToken)
      setAuthStatus(AUTH_STATUS.AUTHENTICATED)
      // 登录后清空缓存并主动触发所有活跃查询重新获取，避免 AbortError
      try {
        await apolloClient.clearStore()
        await apolloClient.refetchQueries({ include: "active" })
      } catch (e) {
        console.error("Apollo refetch after login failed:", e)
      }
    } catch (error) {
      console.error("SIWE登录失败:", error)
      // 清除 HttpOnly Cookie
      try {
        await fetch("/api/auth/token", { method: "DELETE" })
      } catch (e) {
        console.error("Failed to clear auth cookie:", e)
      }
      setLoginState({ loading: false, error: error.message })
      setToken(null)
      setAuthStatus(AUTH_STATUS.UNAUTHENTICATED)
      throw error
    }
  }, [
    isClient,
    walletStatus,
    safeWalletClient,
    safeAddress,
    signInWithEthereum,
    isNodeOwner,
  ])

  // 登出逻辑(不影响钱包连接状态)
  const logout = useCallback(() => {
    // 清除 HttpOnly Cookie
    fetch("/api/auth/token", { method: "DELETE" }).catch((e) =>
      console.error("Failed to clear auth cookie:", e),
    )
    setToken(null)
    setAuthStatus(AUTH_STATUS.UNAUTHENTICATED)
    // 登出后清空缓存并重新获取活跃查询，回到匿名视图
    apolloClient
      .clearStore()
      .then(() => apolloClient.refetchQueries({ include: "active" }))
      .catch((e) => console.error("Apollo refetch after logout failed:", e))
  }, [apolloClient])

  // 彻底断开连接
  const disconnectAndLogout = useCallback(() => {
    logout()
    disconnect()
  }, [logout, disconnect])

  // 重新获取关注状态
  const refetchVisitorStatus = useCallback(async () => {
    if (isClient && safeAddress) {
      try {
        await refetchVisitor()
      } catch (error) {
        console.error("Failed to refetch follower status:", error)
      }
    }
  }, [isClient, safeAddress, refetchVisitor])

  const value = useMemo(
    () => ({
      // 认证状态
      authStatus,
      AUTH_STATUS,
      token,

      // 钱包状态(独立于认证状态)
      walletStatus,
      WALLET_STATUS,
      address: safeAddress,
      isWalletConnected: walletStatus === WALLET_STATUS.CONNECTED,

      // 从 NodeContext 获取的基础数据（服务器端预加载）
      profile,

      // 用户相关的动态数据
      visitor: visitorData?.visitor || {},
      isNodeOwner,

      // 加载状态
      visitorLoading,
      visitorError,

      // 操作函数
      login,
      loginState,
      logout,
      disconnectAndLogout,
      refetchVisitorStatus,
    }),
    [
      authStatus,
      token,
      walletStatus,
      safeAddress,
      profile,
      visitorData,
      isNodeOwner,
      visitorLoading,
      visitorError,
      login,
      loginState,
      logout,
      disconnectAndLogout,
      refetchVisitorStatus,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
