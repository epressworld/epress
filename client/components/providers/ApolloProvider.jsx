"use client"

import { ApolloLink, HttpLink } from "@apollo/client"
import { onError } from "@apollo/client/link/error"
import {
  ApolloClient,
  ApolloNextAppProvider,
  InMemoryCache,
} from "@apollo/client-integration-nextjs"
import { useCallback } from "react"

/**
 * ApolloProvider - Apollo Client Provider 组件
 *
 * 为应用提供 GraphQL 客户端支持
 * 配置了缓存策略、分页合并逻辑和认证错误处理
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - 子组件
 * @param {string} props.url - GraphQL API 的基础 URL
 *
 * @example
 * <ApolloProvider url={profile.url}>
 *   <App />
 * </ApolloProvider>
 */
export function ApolloProvider({ children, url }) {
  // 处理认证错误 - 自动清除认证cookie
  const handleAuthError = useCallback(async () => {
    console.log("Authentication error detected, clearing auth cookie...")
    try {
      await fetch("/api/auth/token", { method: "DELETE" })
      console.log("Auth cookie cleared successfully")
    } catch (error) {
      console.error("Failed to clear auth cookie:", error)
    }
  }, [])
  // 创建 Apollo Client 实例
  const makeClient = () => {
    const httpLink = new HttpLink({
      // 使用绝对 URL,因为相对 URL 在 SSR 中无法使用
      uri: `${url}/api/graphql`,
    })

    // 错误处理链接
    const errorLink = onError(({ graphQLErrors, networkError }) => {
      if (graphQLErrors) {
        for (const err of graphQLErrors) {
          // 只在UNAUTHENTICATED时触发自动登出
          // UNAUTHORIZED表示已认证但权限不够,不应该触发登出
          if (err.extensions?.code === "UNAUTHENTICATED") {
            console.error("Authentication error detected:", err.message)
            // 触发认证错误处理
            handleAuthError()
            break
          }
        }
      }

      if (networkError) {
        console.error(`[Network error]: ${networkError}`)
      }
    })

    return new ApolloClient({
      cache: new InMemoryCache({
        typePolicies: {
          Query: {
            fields: {
              // 搜索结果的缓存和分页合并策略
              search: {
                keyArgs: ["filterBy", "orderBy", "q"],
                merge(existing, incoming, { args }) {
                  // 如果有 after 参数,说明是加载更多,需要合并结果
                  if (args?.after) {
                    return {
                      ...incoming,
                      edges: [
                        ...(existing?.edges || []),
                        ...(incoming?.edges || []),
                      ],
                    }
                  }
                  // 否则是新查询,直接返回新结果
                  return incoming
                },
              },
            },
          },
          // Content 类型使用 content_hash 作为唯一标识
          Content: {
            keyFields: ["content_hash"],
          },
        },
      }),
      link: ApolloLink.from([errorLink, httpLink]),
    })
  }

  return (
    <ApolloNextAppProvider makeClient={makeClient}>
      {children}
    </ApolloNextAppProvider>
  )
}
