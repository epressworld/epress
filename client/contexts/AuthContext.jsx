"use client"

import { useMutation, useQuery } from "@apollo/client/react"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { useAccount, useDisconnect, useWalletClient } from "wagmi"
import { SIGN_IN_WITH_ETHEREUM } from "../graphql/mutations"
import { GET_SIWE_MESSAGE, IS_FOLLOWER } from "../graphql/queries"
import { isTokenExpired } from "../utils/jwt"
import { usePage } from "./PageContext"

// 1. 定义清晰的状态枚举
export const AUTH_STATUS = {
  LOADING: "LOADING", // 初始加载中
  DISCONNECTED: "DISCONNECTED", // 钱包未连接
  CONNECTED: "CONNECTED", // 钱包已连接，但未作为所有者登录
  AUTHENTICATED: "AUTHENTICATED", // 钱包已连接，且已作为所有者登录
}

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [authStatus, setAuthStatus] = useState(AUTH_STATUS.LOADING)
  const [token, setToken] = useState(null)
  const [isClient, setIsClient] = useState(false)

  // 从 PageContext 获取所有页面级数据
  const {
    profile,
    loading: nodeLoading,
    runtimeConfig: { nodeOwnerAddress },
  } = usePage()

  // 依赖 wagmi 的底层状态 - 只在客户端使用
  const { address, isConnected, isDisconnected } = useAccount()
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
  const safeIsDisconnected = isClient ? isDisconnected : true
  const safeWalletClient = isClient ? walletClient : undefined

  // 检测客户端环境
  useEffect(() => {
    setIsClient(true)
  }, [])

  // 查询用户关注状态 - 只有在用户连接钱包时才查询
  const {
    data: followerData,
    loading: followerLoading,
    error: followerError,
    refetch: refetchFollower,
  } = useQuery(IS_FOLLOWER, {
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
      console.error("AuthContext isFollower query error:", error)
    },
  })

  const [signInWithEthereum] = useMutation(SIGN_IN_WITH_ETHEREUM)

  // 核心：状态同步逻辑
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

    if (safeIsDisconnected) {
      setAuthStatus(AUTH_STATUS.DISCONNECTED)
      if (token) {
        setToken(null)
        localStorage.removeItem("authToken")
      }
      return
    }

    if (safeIsConnected) {
      const storedToken = localStorage.getItem("authToken")

      if (storedToken && !isTokenExpired(storedToken)) {
        setAuthStatus(AUTH_STATUS.AUTHENTICATED)
        setToken(storedToken)
      } else {
        setAuthStatus(AUTH_STATUS.CONNECTED)
      }
    }
  }, [
    isClient,
    safeIsConnected,
    safeIsDisconnected,
    safeAddress,
    token,
    nodeLoading,
  ])

  // 登录逻辑
  const login = useCallback(async () => {
    if (!isClient) {
      throw new Error("登录功能仅在客户端可用")
    }

    if (
      authStatus !== AUTH_STATUS.CONNECTED ||
      !safeWalletClient ||
      !safeAddress
    ) {
      throw new Error("无法登录：钱包未连接或状态不正确。")
    }

    // 节点所有者验证
    if (!isNodeOwner) {
      throw new Error("只有节点所有者可以登录")
    }

    try {
      const response = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: GET_SIWE_MESSAGE.loc?.source?.body || GET_SIWE_MESSAGE,
          variables: { address: safeAddress },
        }),
      })
      const result = await response.json()
      if (result.errors) throw new Error(result.errors[0].message)
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

      localStorage.setItem("authToken", newToken)
      setToken(newToken)
      setAuthStatus(AUTH_STATUS.AUTHENTICATED)
    } catch (error) {
      console.error("SIWE登录失败:", error)
      localStorage.removeItem("authToken")
      setToken(null)
      setAuthStatus(AUTH_STATUS.CONNECTED)
      throw error
    }
  }, [
    isClient,
    authStatus,
    safeWalletClient,
    safeAddress,
    signInWithEthereum,
    isNodeOwner,
  ])

  // 登出逻辑
  const logout = useCallback(() => {
    localStorage.removeItem("authToken")
    setToken(null)
    setAuthStatus(AUTH_STATUS.CONNECTED)
  }, [])

  // 彻底断开连接
  const disconnectAndLogout = useCallback(() => {
    logout()
    disconnect()
  }, [logout, disconnect])

  // 重新获取关注状态
  const refetchFollowerStatus = useCallback(async () => {
    if (isClient && safeAddress) {
      try {
        await refetchFollower()
      } catch (error) {
        console.error("Failed to refetch follower status:", error)
      }
    }
  }, [isClient, safeAddress, refetchFollower])

  const value = useMemo(
    () => ({
      // 认证状态
      authStatus,
      AUTH_STATUS,
      token,
      address: safeAddress,

      // 从 NodeContext 获取的基础数据（服务器端预加载）
      profile,

      // 用户相关的动态数据
      isFollower: followerData?.isFollower || false,
      isNodeOwner,

      // 加载状态
      followerLoading,
      followerError,

      // 操作函数
      login,
      logout,
      disconnectAndLogout,
      refetchFollowerStatus,
    }),
    [
      authStatus,
      token,
      safeAddress,
      profile,
      followerData?.isFollower,
      isNodeOwner,
      followerLoading,
      followerError,
      login,
      logout,
      disconnectAndLogout,
      refetchFollowerStatus,
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
