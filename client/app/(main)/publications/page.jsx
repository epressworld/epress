import { Suspense } from "react"
import { Skeletons } from "../../../components/ui"
import { PreloadQuery } from "../../../graphql/client"
import { SEARCH_PUBLICATIONS } from "../../../graphql/queries"
import ClientPage from "./page.client"

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
        <ClientPage variables={variables} keyword={keyword} />
      </Suspense>
    </PreloadQuery>
  )
}
