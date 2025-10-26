import { ConnectionPage } from "@/components/features/connection"
import { SEARCH_NODES } from "@/lib/apollo"
import { PreloadQuery } from "@/lib/apollo/client"
import {
  addImagesToMetadata,
  generateBaseMetadata,
  getFullUrl,
  getPageData,
} from "@/utils/helpers/ogp"

export async function generateMetadata() {
  try {
    // 从缓存中获取 PAGE_DATA（layout 已经查询过）
    const { profile, defaultLanguage } = await getPageData()

    // 生成基础 metadata
    let metadata = generateBaseMetadata({
      title: profile.title,
      description: profile.description,
      url: getFullUrl(profile.url, "/connections"),
      locale: defaultLanguage,
      type: "website",
    })

    // 添加节点头像（从 profile.url 构建头像 URL）
    const avatarUrl = `${profile.url}/ewp/avatar`
    metadata = addImagesToMetadata(metadata, avatarUrl, profile.title)

    return metadata
  } catch (error) {
    console.error("Error generating metadata:", error)
    return {
      title: "Connections",
      description: "View your connections",
    }
  }
}

export default async function ConnectionsServerPage() {
  return (
    <PreloadQuery
      query={SEARCH_NODES}
      variables={{
        filterBy: { type: "followers" },
        orderBy: "-created_at",
        first: 20,
      }}
    >
      <PreloadQuery
        query={SEARCH_NODES}
        variables={{
          filterBy: { type: "following" },
          orderBy: "-created_at",
          first: 20,
        }}
      >
        <ConnectionPage />
      </PreloadQuery>
    </PreloadQuery>
  )
}
