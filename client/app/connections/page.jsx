import PreloadApolloCache from "../../components/util/PreloadApolloCache"
import {
  executeServerQueries,
  getRequestApolloClient,
} from "../../graphql/index"
import { CONNECTIONS_PAGE_DATA } from "../../graphql/queries"
import ClientPage from "./page.client"

export default async function ConnectionsServerPage() {
  const client = getRequestApolloClient()
  const { data: serverDataMap } = await executeServerQueries(
    [
      {
        queryKey: "CONNECTIONS_PAGE_DATA",
        query: CONNECTIONS_PAGE_DATA,
        variables: {
          orderBy: "-created_at",
          followersFirst: 20,
          followingFirst: 20,
        },
      },
    ],
    client,
  )

  const combined = serverDataMap?.CONNECTIONS_PAGE_DATA?.data || null
  const followersInitial = combined?.followers
    ? { search: combined.followers }
    : null
  const followingInitial = combined?.following
    ? { search: combined.following }
    : null

  const followersTotal = followersInitial?.search?.total || 0
  const followingTotal = followingInitial?.search?.total || 0

  return (
    <>
      {/* 将服务器端数据预加载到 Apollo 缓存 */}
      <PreloadApolloCache serverDataMap={serverDataMap} />
      <ClientPage
        initialFollowersData={followersInitial}
        initialFollowingData={followingInitial}
        initialFollowersTotal={followersTotal}
        initialFollowingTotal={followingTotal}
      />
    </>
  )
}
