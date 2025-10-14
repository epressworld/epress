import { Suspense } from "react"
import { PublicationListPage } from "@/components/features/publication"
import { Skeletons } from "@/components/ui"
import { SEARCH_PUBLICATIONS } from "@/lib/apollo"
import { PreloadQuery } from "@/lib/apollo/client"

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
      <Suspense fallback={<Skeletons.Publications />}>
        <PublicationListPage variables={variables} keyword={keyword} />
      </Suspense>
    </PreloadQuery>
  )
}
