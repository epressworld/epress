"use client"

import { useQuery, useSuspenseQuery } from "@apollo/client/react"
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

export const PageProvider = ({ children, runtimeConfig }) => {
  const [isClient, setIsClient] = useState(false)

  // 确保只在客户端执行
  useEffect(() => {
    setIsClient(true)
  }, [])

  // 客户端 Apollo 查询 - 复用相同的查询
  const { data, loading, error, refetch } = useSuspenseQuery(PAGE_DATA, {
    fetchPolicy: "cache-and-network",
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

  // 使用 useMemo 稳定 value 对象
  const value = useMemo(
    () => ({
      // 来自旧 NodeContext 的数据
      settings: data?.settings || {},
      profile: data?.profile || {},
      nodeStatus: data?.nodeStatus || {},
      runtimeConfig,

      // 状态信息
      loading: isClient ? loading : false,
      error,

      // 重新获取数据函数
      refetchPageData,
    }),
    [isClient, loading, error, data, refetchPageData],
  )

  return <PageContext.Provider value={value}>{children}</PageContext.Provider>
}
