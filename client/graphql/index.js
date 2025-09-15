import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client"

const uri = `${process.env.EPRESS_API_URL || "http://localhost:8544"}/api/graphql`
const httpLink = new HttpLink({ uri, fetch: fetch })

const client = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache().restore({}),
  ssrMode: true,
  defaultOptions: {
    watchQuery: {
      fetchPolicy: "network-only",
    },
    query: {
      fetchPolicy: "network-only",
    },
  },
})

// 通用的服务器端查询执行函数
export async function executeServerQuery(
  queryKey,
  queryDocument,
  variables = {},
  options = {},
) {
  try {
    const { data } = await client.query({
      query: queryDocument,
      variables,
      fetchPolicy: "network-only",
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
export async function executeServerQueries(queryConfigs) {
  const promises = queryConfigs.map((config) =>
    executeServerQuery(
      config.queryKey,
      config.query,
      config.variables,
      config.options,
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
