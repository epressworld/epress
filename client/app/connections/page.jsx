import { Suspense } from "react"
import { Skeletons } from "../../components/ui"
import { PreloadQuery } from "../../graphql/client"
import { SEARCH_NODES } from "../../graphql/queries"
import ClientPage from "./page.client"

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
        <Suspense fallback={<Skeletons.Connections />}>
          <ClientPage />
        </Suspense>
      </PreloadQuery>
    </PreloadQuery>
  )
}
