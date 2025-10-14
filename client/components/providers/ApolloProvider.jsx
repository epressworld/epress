"use client"

import { HttpLink } from "@apollo/client"
import {
  ApolloClient,
  ApolloNextAppProvider,
  InMemoryCache,
} from "@apollo/client-integration-nextjs"

/**
 * ApolloProvider - Apollo Client Provider 组件
 *
 * 为应用提供 GraphQL 客户端支持
 * 配置了缓存策略和分页合并逻辑
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
  // 创建 Apollo Client 实例
  const makeClient = () => {
    const httpLink = new HttpLink({
      // 使用绝对 URL,因为相对 URL 在 SSR 中无法使用
      uri: `${url}/api/graphql`,
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
      link: httpLink,
    })
  }

  return (
    <ApolloNextAppProvider makeClient={makeClient}>
      {children}
    </ApolloNextAppProvider>
  )
}
