import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client"
import { cache as reactCache } from "react"

const uri = `${process.env.EPRESS_API_URL || "http://localhost:8544"}/api/graphql`
const baseHttpLink = new HttpLink({ uri, fetch })

// 统一的服务端 ApolloClient 工厂：可选传入 headers 或 authorization
export const createServerApolloClient = (options = {}) => {
  const headers =
    options.headers ||
    (options.authorization
      ? { authorization: options.authorization }
      : undefined)

  const link = headers ? new HttpLink({ uri, fetch, headers }) : baseHttpLink

  return new ApolloClient({
    link,
    cache: new InMemoryCache(),
    ssrMode: true,
    defaultOptions: {
      watchQuery: {
        fetchPolicy: "no-cache", // 不读写缓存
      },
      query: {
        fetchPolicy: "no-cache", // 不读写缓存
      },
    },
  })
}

// 在同一请求范围内复用同一个 ApolloClient 实例（无认证头）
export const getRequestApolloClient = reactCache((headers) =>
  createServerApolloClient({ headers }),
)

// 通用的服务器端查询执行函数
export async function executeServerQuery(
  queryKey,
  queryDocument,
  variables = {},
  options = {},
  client,
) {
  try {
    const localClient = client || getRequestApolloClient()
    const { data } = await localClient.query({
      query: queryDocument,
      variables,
      fetchPolicy: "no-cache",
      context: {
        timeout: options.timeout || 5000,
      },
    })

    return {
      queryKey,
      variables,
      data,
      fetchedAt: new Date().toISOString(),
      success: true,
    }
  } catch (error) {
    console.error(`Server-side query ${queryKey} failed:`, error)

    if (options.throwOnError) {
      throw error
    }

    return {
      queryKey,
      variables,
      data: null,
      error: {
        message: error.message,
        graphQLErrors: error.graphQLErrors,
        networkError: error.networkError,
      },
      fetchedAt: new Date().toISOString(),
      success: false,
    }
  }
}

// 批量执行多个服务器端查询
export async function executeServerQueries(queryConfigs, client) {
  const requestClient = client || createServerApolloClient()
  const promises = queryConfigs.map((config) =>
    executeServerQuery(
      config.queryKey,
      config.query,
      config.variables,
      config.options,
      requestClient,
    ),
  )

  const results = await Promise.allSettled(promises)

  const successfulResults = {}
  const errors = {}

  results.forEach((result, index) => {
    const config = queryConfigs[index]

    if (result.status === "fulfilled" && result.value.success) {
      successfulResults[config.queryKey] = result.value
    } else {
      const error =
        result.status === "rejected" ? result.reason : result.value.error
      errors[config.queryKey] = error
      console.error(`Query ${config.queryKey} failed:`, error)
    }
  })

  return {
    data: successfulResults,
    errors,
    hasErrors: Object.keys(errors).length > 0,
  }
}
