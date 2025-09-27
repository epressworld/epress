"use client"

import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client"
import {
  ApolloProvider as ApolloProviderBase,
  useApolloClient,
} from "@apollo/client/react"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from "react"

// 创建缓存管理上下文
const CacheManagerContext = createContext()

export const useCacheManager = () => {
  const context = useContext(CacheManagerContext)
  if (!context) {
    throw new Error(
      "useCacheManager must be used within a CacheManagerProvider",
    )
  }
  return context
}

// 缓存管理器提供者 - 在 ApolloProvider 内部使用
export function CacheManagerProvider({ children }) {
  const client = useApolloClient()

  // 动态预填充缓存的函数
  const preloadDataToCache = useCallback(
    async (serverDataMap) => {
      if (!serverDataMap || typeof window === "undefined") return

      try {
        // 动态导入所有查询定义
        const queries = await import("../../graphql/queries")

        // 遍历服务器端数据映射
        Object.entries(serverDataMap).forEach(([queryKey, queryResult]) => {
          const query = queries[queryKey]

          if (!query) {
            console.warn(`Query ${queryKey} not found in queries module`)
            return
          }

          if (!queryResult?.success || !queryResult?.data) {
            console.warn(`No valid data provided for query ${queryKey}`)
            return
          }

          try {
            client.writeQuery({
              query,
              variables: queryResult.variables || {},
              data: queryResult.data,
            })
            console.log(`Successfully preloaded cache for query: ${queryKey}`)
          } catch (error) {
            console.warn(
              `Failed to preload cache for query ${queryKey}:`,
              error,
            )
          }
        })
      } catch (error) {
        console.warn("Failed to preload data to cache:", error)
      }
    },
    [client],
  )

  // 清除特定查询的缓存
  const evictQuery = useCallback(
    (queryKey, variables = {}) => {
      try {
        const queries = import("../../graphql/queries")
        const query = queries[queryKey]

        if (query) {
          client.cache.evict({
            fieldName: query.definitions[0]?.name?.value,
            args: variables,
          })
          client.cache.gc() // 垃圾回收
          console.log(`Evicted cache for query: ${queryKey}`)
        }
      } catch (error) {
        console.warn(`Failed to evict cache for query ${queryKey}:`, error)
      }
    },
    [client],
  )

  // 刷新特定查询
  const refetchQuery = useCallback(
    async (queryKey, variables = {}) => {
      try {
        const queries = await import("../../graphql/queries")
        const query = queries[queryKey]

        if (query) {
          const result = await client.query({
            query,
            variables,
            fetchPolicy: "network-only",
          })
          console.log(`Refetched query: ${queryKey}`)
          return result
        }
      } catch (error) {
        console.error(`Failed to refetch query ${queryKey}:`, error)
        throw error
      }
    },
    [client],
  )

  const value = {
    preloadDataToCache,
    evictQuery,
    refetchQuery,
    client,
  }

  return (
    <CacheManagerContext.Provider value={value}>
      {children}
    </CacheManagerContext.Provider>
  )
}

// 页面级别的数据预加载钩子
export function usePagePreload(serverDataMap) {
  const { preloadDataToCache } = useCacheManager()

  // 使用 layout effect 在首次绘制前将服务器数据写入 Apollo 缓存，减少刷新时骨架屏闪现
  // 注意：仅在客户端执行，不影响 SSR
  const useLayoutEffectSafe =
    typeof window !== "undefined" ? useLayoutEffect : () => {}

  useLayoutEffectSafe(() => {
    if (serverDataMap && Object.keys(serverDataMap).length > 0) {
      preloadDataToCache(serverDataMap)
    }
  }, [serverDataMap, preloadDataToCache])
}

// 通用的缓存预填充函数
const populateCacheWithServerData = async (cache, serverDataMap) => {
  if (!serverDataMap || typeof window === "undefined") return

  try {
    // 动态导入所有查询定义
    const queries = await import("../../graphql/queries")

    // 遍历服务器端数据映射
    Object.entries(serverDataMap).forEach(([queryKey, { variables, data }]) => {
      const query = queries[queryKey]

      if (!query) {
        console.warn(`Query ${queryKey} not found in queries module`)
        return
      }

      if (!data) {
        console.warn(`No data provided for query ${queryKey}`)
        return
      }

      try {
        cache.writeQuery({
          query,
          variables: variables || {},
          data,
        })
        console.log(`Successfully cached server data for query: ${queryKey}`)
      } catch (error) {
        console.warn(
          `Failed to cache server data for query ${queryKey}:`,
          error,
        )
      }
    })
  } catch (error) {
    console.warn("Failed to populate cache with server data:", error)
  }
}

// 创建 Apollo Client 实例
const createApolloClient = (serverDataMap = null) => {
  const httpLink = new HttpLink({ uri: "/api/graphql" })
  // 依赖 Next 中间件将 HttpOnly cookie 自动注入 Authorization，无需在客户端设置头
  const link = httpLink

  const cache = new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          search: {
            keyArgs: ["filterBy", "orderBy", "q"],
            merge(existing, incoming, { args }) {
              if (args?.after) {
                return {
                  ...incoming,
                  edges: [
                    ...(existing?.edges || []),
                    ...(incoming?.edges || []),
                  ],
                }
              }
              return incoming
            },
          },
        },
      },
      Content: {
        keyFields: ["content_hash"],
      },
    },
  })

  // 通用的缓存预填充
  if (serverDataMap) {
    populateCacheWithServerData(cache, serverDataMap)
  }

  return new ApolloClient({
    link,
    cache,
    ssrMode: typeof window === "undefined",
    ssrForceFetchDelay: 100,
  })
}

// 单例客户端实例
let apolloClient = null

const getApolloClient = (serverDataMap = null) => {
  if (typeof window === "undefined") return createApolloClient()
  if (!apolloClient) apolloClient = createApolloClient(serverDataMap)
  return apolloClient
}

export function ApolloProvider({ children, serverDataMap = null }) {
  const [client, setClient] = useState(() => getApolloClient(serverDataMap))

  useEffect(() => {
    if (typeof window !== "undefined") {
      setClient(getApolloClient(serverDataMap))
    }
  }, [serverDataMap])

  return (
    <ApolloProviderBase client={client}>
      <CacheManagerProvider>{children}</CacheManagerProvider>
    </ApolloProviderBase>
  )
}
