import { PublicationListPage } from "@/components/features/publication"
import { SEARCH_PUBLICATIONS } from "@/lib/apollo"
import { PreloadQuery } from "@/lib/apollo/client"
import {
  addImagesToMetadata,
  generateBaseMetadata,
  getFullUrl,
  getPageData,
} from "@/utils/helpers/ogp"

export async function generateMetadata({ searchParams }) {
  const params = await searchParams
  const keyword = params?.q || ""

  try {
    // 从缓存中获取 PAGE_DATA（layout 已经查询过）
    const { profile, defaultLanguage } = await getPageData()

    // 生成基础 metadata
    let metadata = generateBaseMetadata({
      title: profile.title,
      description: profile.description,
      url: getFullUrl(profile.url, "/publications", { q: keyword }),
      locale: defaultLanguage,
      type: "website",
    })

    // 添加节点头像
    const avatarUrl = `${profile.url}/ewp/avatar`
    metadata = addImagesToMetadata(
      metadata,
      avatarUrl,
      profile.title || "Node Avatar",
    )

    return metadata
  } catch (error) {
    console.error("Error generating metadata:", error)
    return {
      title: keyword ? `Publications - ${keyword}` : "Publications",
      description: "Browse publications",
    }
  }
}

export default async function PublicationsServerPage({ searchParams }) {
  const params = await searchParams
  const keyword = params?.q || ""

  const variables = {
    keyword: keyword || null,
    orderBy: "-created_at",
    first: 10,
  }

  return (
    <PreloadQuery query={SEARCH_PUBLICATIONS} variables={variables}>
      <PublicationListPage variables={variables} keyword={keyword} />
    </PreloadQuery>
  )
}
