import { HttpLink } from "@apollo/client"

import { ApolloClient, InMemoryCache } from "@apollo/client-integration-nextjs"
import { registerApolloClient } from "@apollo/client-react-streaming"

export const { getClient, query, PreloadQuery } = registerApolloClient(() => {
  return new ApolloClient({
    cache: new InMemoryCache(),
    link: new HttpLink({
      // this needs to be an absolute url, as relative urls cannot be used in SSR
      uri: `${process.env.EPRESS_API_URL || "http://localhost:8544"}/api/graphql`,
      fetchOptions: {
        // you can pass additional options that should be passed to `fetch` here,
        // e.g. Next.js-related `fetch` options regarding caching and revalidation
        // see https://nextjs.org/docs/app/api-reference/functions/fetch#fetchurl-options
      },
    }),
  })
})
