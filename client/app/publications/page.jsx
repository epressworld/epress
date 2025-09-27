import PreloadApolloCache from "../../components/util/PreloadApolloCache"
import {
  executeServerQueries,
  getRequestApolloClient,
} from "../../graphql/index"
import { SEARCH_PUBLICATIONS } from "../../graphql/queries"
import ClientPage from "./page.client"

export default async function PublicationsServerPage() {
  const client = getRequestApolloClient()

  const { data: serverDataMap } = await executeServerQueries(
    [
      {
        queryKey: "SEARCH_PUBLICATIONS",
        query: SEARCH_PUBLICATIONS,
        variables: {
          filterBy: null,
          orderBy: "-created_at",
          first: 10,
        },
      },
    ],
    client,
  )

  return (
    <>
      {/* 将服务器端数据预加载到 Apollo 缓存 */}
      <PreloadApolloCache serverDataMap={serverDataMap} />
      {/* 渲染客户端页面 */}
      {(() => {
        const search = serverDataMap?.SEARCH_PUBLICATIONS?.data?.search
        const initialEdges = search?.edges || []
        const initialPublications = initialEdges.map((e) => e.node)
        const initialPageInfo = search?.pageInfo || null
        const initialTotal = search?.total || 0

        return (
          <ClientPage
            initialPublications={initialPublications}
            initialPageInfo={initialPageInfo}
            initialTotal={initialTotal}
          />
        )
      })()}
    </>
  )
}
