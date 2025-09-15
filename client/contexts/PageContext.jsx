"use client"

import { useQuery } from "@apollo/client/react"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { PAGE_DATA } from "../graphql/queries"

const PageContext = createContext()

export const usePage = () => {
  const context = useContext(PageContext)
  if (!context) {
    throw new Error("usePage must be used within a PageProvider")
  }
  return context
}

export const PageProvider = ({
  children,
  runtimeConfig = {},
  serverDataMap = {},
  serverErrors = {},
}) => {
  const [isClient, setIsClient] = useState(false)

  // 确保只在客户端执行
  useEffect(() => {
    setIsClient(true)
  }, [])

  // 从服务器端数据映射中提取节点数据
  const serverNodeData = serverDataMap.PAGE_DATA?.data
  const serverNodeError =
    serverErrors.PAGE_DATA ||
    (serverDataMap.PAGE_DATA?.success === false
      ? serverDataMap.PAGE_DATA?.error
      : null)

  // 客户端 Apollo 查询 - 复用相同的查询
  const { data, loading, error, refetch } = useQuery(PAGE_DATA, {
    errorPolicy: "all",
    skip: !isClient,
    // 如果有服务器端数据，使用 cache-first，否则使用 cache-and-network
    fetchPolicy: serverNodeData ? "cache-first" : "cache-and-network",
    notifyOnNetworkStatusChange: false,
    onError: (error) => {
      console.error("PageContext GraphQL Error:", error)
    },
  })

  // 创建 refetchPageData 函数
  const refetchPageData = useCallback(async () => {
    if (isClient) {
      try {
        const result = await refetch()
        console.log("PageContext refetch successful:", result)
        return result
      } catch (refetchError) {
        console.error("PageContext refetch failed:", refetchError)
        throw refetchError
      }
    }
  }, [refetch, isClient])

  // 优先使用客户端数据，回退到服务器端数据
  const finalData = useMemo(() => {
    if (data) {
      return data
    } else if (serverNodeData) {
      return serverNodeData
    } else {
      return {
        settings: {},
        profile: {},
        nodeStatus: {},
      }
    }
  }, [data, serverNodeData])

  // 使用 useMemo 稳定 value 对象
  const value = useMemo(
    () => ({
      // 来自旧 PageContext 的数据
      runtimeConfig,
      serverDataMap,
      serverErrors,

      // 来自旧 NodeContext 的数据
      settings: finalData.settings || {},
      profile: finalData.profile || {},
      nodeStatus: finalData.nodeStatus || {},

      // 状态信息
      loading: isClient ? loading : false,
      error: error || serverNodeError,

      // 数据来源信息（用于调试）
      dataSource: {
        hasClientData: !!data,
        hasServerData: !!serverNodeData,
        usingServerData: !data && !!serverNodeData,
        serverDataAge: serverDataMap.PAGE_DATA?.fetchedAt,
      },

      // 重新获取数据函数
      refetchPageData,
    }),
    [
      runtimeConfig,
      serverDataMap,
      serverErrors,
      finalData,
      isClient,
      loading,
      error,
      serverNodeError,
      data,
      serverNodeData,
      refetchPageData,
    ],
  )

  return <PageContext.Provider value={value}>{children}</PageContext.Provider>
}
