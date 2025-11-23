import { PublicationItemPage } from "@/components/features/publication"
import { FETCH } from "@/lib/apollo"
import { PreloadQuery, query } from "@/lib/apollo/client"
import {
  generatePageMetadata,
  generatePublicationMetadata,
  getPageData,
} from "@/utils/helpers/ogp"

export async function generateMetadata({ params }) {
  const { id } = await params

  try {
    // 处理 content hash 的情况
    const isContentHash =
      typeof id === "string" && id.startsWith("0x") && id.length === 66

    if (isContentHash) {
      return generatePageMetadata({
        path: `/publications/${id}`,
        type: "article",
        fallbackTitle: "Publication",
        fallbackDescription: "View publication details",
      })
    }

    // 获取 publication 详情
    const { data } = await query({
      query: FETCH,
      variables: {
        type: "PUBLICATION",
        id,
      },
      fetchPolicy: "cache-first",
    })

    const publication = data?.fetch

    // 如果找不到 publication
    if (!publication) {
      return generatePageMetadata({
        path: `/publications/${id}`,
        type: "article",
        description: "Publication not found",
        fallbackTitle: "Publication",
        fallbackDescription: "Publication not found",
      })
    }

    // 生成 publication metadata
    const { profile, defaultLanguage } = await getPageData()
    return generatePublicationMetadata({
      publication,
      id,
      profile,
      defaultLanguage,
    })
  } catch (error) {
    console.error("Error generating metadata:", error)
    return generatePageMetadata({
      path: `/publications/${id}`,
      type: "article",
      fallbackTitle: "Publication",
      fallbackDescription: "View publication details",
    })
  }
}

export default async function PublicationDetailServerPage({ params }) {
  const { id } = await params

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
