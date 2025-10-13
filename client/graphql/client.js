import { HttpLink } from "@apollo/client"
import { ApolloClient, InMemoryCache } from "@apollo/client-integration-nextjs"
import { registerApolloClient } from "@apollo/client-react-streaming"
import { cookies } from "next/headers"

export const { getClient, query, PreloadQuery } = registerApolloClient(() => {
  return new ApolloClient({
    cache: new InMemoryCache(),
    link: new HttpLink({
      // this needs to be an absolute url, as relative urls cannot be used in SSR
      uri: `${process.env.EPRESS_API_URL}/api/graphql`,
      fetch: async (uri, options) => {
        // 在服务器端，添加 authorization header
        if (typeof window === "undefined") {
          const cookieStore = await cookies()
          const authToken = cookieStore.get("authToken")?.value

          if (authToken) {
            options.headers = {
              ...options.headers,
              authorization: `Bearer ${authToken}`,
            }
          }
        }
        return fetch(uri, options)
      },
    }),
  })
})
