import { PublicationListPage } from "@/components/features/publication"
import { SEARCH_PUBLICATIONS } from "@/lib/apollo"
import { PreloadQuery } from "@/lib/apollo/client"
import { generatePageMetadata, getPageData } from "@/utils/helpers/ogp"

export async function generateMetadata({ searchParams }) {
  const params = await searchParams
  const keyword = params?.q || ""

  if (keyword) {
    // 如果有搜索关键词，自定义标题和描述
    const { profile } = await getPageData()
    return generatePageMetadata({
      title: `${keyword} - ${profile.title || "Publications"}`,
      description: `Search results for "${keyword}"`,
      path: "/publications",
      searchParams: { q: keyword },
      fallbackTitle: `Publications - ${keyword}`,
      fallbackDescription: `Search results for "${keyword}"`,
    })
  }

  // 没有搜索关键词，使用默认
  return generatePageMetadata({
    path: "/publications",
    fallbackTitle: "Publications",
    fallbackDescription: "Browse publications",
  })
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
