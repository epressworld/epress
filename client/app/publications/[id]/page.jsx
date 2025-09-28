import { notFound, redirect } from "next/navigation"
import PreloadApolloCache from "../../../components/util/PreloadApolloCache"
import { getRequestApolloClient } from "../../../graphql/index"
import { FETCH, SEARCH_PUBLICATIONS } from "../../../graphql/queries"
import ClientPage from "./page.client"

export default async function PublicationDetailServerPage({
  params,
  searchParams,
}) {
  const client = getRequestApolloClient()

  const id = params.id

  // 如果传入的是内容哈希（0x 开头且长度为 66），则根据 hash 与可选的 timestamp 解析为数字 id 并在服务端重定向
  const isContentHash =
    typeof id === "string" && id.startsWith("0x") && id.length === 66
  if (isContentHash) {
    const tsParam = searchParams?.timestamp
    let targetNodeId = null

    // 查询匹配该 content_hash 的 publications，按创建时间倒序
    const { data } = await client.query({
      query: SEARCH_PUBLICATIONS,
      variables: {
        filterBy: { content_hash: id },
        orderBy: "-created_at",
        first: 50,
      },
      fetchPolicy: "network-only",
    })

    const edges = data?.search?.edges || []

    if (edges.length === 0) {
      // 未找到匹配项，返回 404
      notFound()
    }

    if (tsParam) {
      const unixTs = parseInt(tsParam, 10)
      if (!Number.isNaN(unixTs)) {
        const start = new Date(unixTs * 1000)
        const end = new Date((unixTs + 1) * 1000)
        const matched = edges.find((edge) => {
          const createdAt = new Date(edge?.node?.created_at)
          return createdAt >= start && createdAt < end
        })
        if (matched?.node?.id) {
          targetNodeId = matched.node.id
        }
      }
    }

    // 若未指定或未匹配 timestamp，则使用最新一条
    if (!targetNodeId) {
      targetNodeId = edges[0]?.node?.id
    }

    if (!targetNodeId) {
      notFound()
    }

    // 服务端重定向到规范化的数字 id 路径
    return redirect(`/publications/${targetNodeId}`)
  }

  // 数字 id 的常规渲染路径：预加载缓存并交给客户端组件
  const { data: serverDataMap } = await client.query({
    query: FETCH,
    variables: {
      type: "PUBLICATION",
      id: id,
    },
    fetchPolicy: "network-only",
  })

  return (
    <>
      <PreloadApolloCache serverDataMap={serverDataMap} />
      {(() => {
        const initialPublication = serverDataMap?.FETCH?.data?.fetch || null
        return <ClientPage initialPublication={initialPublication} />
      })()}
    </>
  )
}
