import { notFound, redirect } from "next/navigation"
import { PublicationItemPage } from "@/components/features/publication"
import { FETCH, SEARCH_PUBLICATIONS } from "@/lib/apollo"
import { PreloadQuery, query } from "@/lib/apollo/client"
import {
  addAudioToMetadata,
  addImagesToMetadata,
  addVideosToMetadata,
  extractFirstImage,
  extractPlainText,
  generateBaseMetadata,
  getFullUrl,
  getMediaType,
  getPageData,
} from "@/utils/helpers/ogp"

export async function generateMetadata({ params }) {
  const { id } = await params

  try {
    // 处理 content hash 重定向逻辑
    const isContentHash =
      typeof id === "string" && id.startsWith("0x") && id.length === 66

    if (isContentHash) {
      return null
    }

    // 获取 publication 详情
    const { data } = await query({
      query: FETCH,
      variables: {
        type: "PUBLICATION",
        id,
      },
      fetchPolicy: "cache-first", // 使用缓存优先策略，与组件复用缓存
    })

    const publication = data?.fetch
    if (!publication) return null

    // 从缓存中获取 PAGE_DATA
    const { profile, defaultLanguage } = await getPageData()

    const publicationType = publication.content?.type // POST or FILE
    const avatar = `${profile.url}/ewp/avatar`

    // 生成基础 metadata
    let metadata = generateBaseMetadata({
      title: profile.title,
      description: "", // 将在下面根据类型设置
      url: getFullUrl(profile.url, `/publications/${id}`),
      locale: defaultLanguage,
      type: "article",
    })

    if (publicationType === "POST") {
      // POST 类型：提取纯文本描述和第一张图片
      const description = await extractPlainText(publication.content?.body)
      const firstImage = extractFirstImage(publication.content?.body)

      metadata.description = description
      metadata.openGraph.description = description
      metadata.twitter.description = description

      if (firstImage) {
        metadata = addImagesToMetadata(metadata, firstImage, profile.title)
      } else {
        metadata = addImagesToMetadata(metadata, avatar, profile.title)
      }
    } else if (publicationType === "FILE") {
      const mimeType = publication.content?.mimetype
      const mediaType = getMediaType(mimeType)
      // FILE 类型：使用文件描述
      const description = `${mimeType}: ${publication.description}`

      // 构建文件 URL：使用 content_hash
      const contentHash = publication.content?.content_hash
      const fileUrl = `${publication.author?.url || ""}/ewp/contents/${contentHash}`

      metadata.description = description
      metadata.openGraph.description = description
      metadata.twitter.description = description

      if (mediaType === "image") {
        metadata = addImagesToMetadata(metadata, fileUrl, profile.title)
      } else if (mediaType === "video") {
        metadata = addVideosToMetadata(metadata, fileUrl)
        metadata = addImagesToMetadata(
          metadata,
          `${profile.url}/ewp/avatar`,
          "Avatar",
        )
      } else if (mediaType === "audio") {
        metadata = addAudioToMetadata(metadata, fileUrl)
        metadata = addImagesToMetadata(metadata, avatar, profile.title)
      }
    }

    return metadata
  } catch (error) {
    console.error("Error generating metadata:", error)
    return null
  }
}

export default async function PublicationDetailServerPage({
  params,
  searchParams,
}) {
  const { id } = await params

  // 如果传入的是内容哈希(0x 开头且长度为 66),则根据 hash 与可选的 timestamp 解析为数字 id 并在服务端重定向
  const isContentHash =
    typeof id === "string" && id.startsWith("0x") && id.length === 66
  if (isContentHash) {
    const tsParam = searchParams?.timestamp
    let targetNodeId = null

    // 查询匹配该 content_hash 的 publications,按创建时间倒序
    const { data } = await query({
      query: SEARCH_PUBLICATIONS,
      variables: {
        filterBy: { content_hash: id },
        orderBy: "-created_at",
        first: 10,
      },
      fetchPolicy: "cache-first", // 使用缓存优先策略
    })

    const edges = data?.search?.edges || []

    if (edges.length === 0) {
      // 未找到匹配项,返回 404
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

    // 若未指定或未匹配 timestamp,则使用最新一条
    if (!targetNodeId) {
      targetNodeId = edges[0]?.node?.id
    }

    if (!targetNodeId) {
      notFound()
    }

    // 服务端重定向到规范化的数字 id 路径
    return redirect(`/publications/${targetNodeId}`)
  }

  const variables = {
    type: "PUBLICATION",
    id,
  }

  return (
    <PreloadQuery query={FETCH} variables={variables}>
      <PublicationItemPage variables={variables} />
    </PreloadQuery>
  )
}
