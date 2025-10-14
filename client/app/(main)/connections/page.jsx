import { Suspense } from "react"
import { ConnectionPage } from "@/components/features/connection"
import { Skeletons } from "@/components/ui"
import { SEARCH_NODES } from "@/lib/apollo"
import { PreloadQuery } from "@/lib/apollo/client"

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
          <ConnectionPage />
        </Suspense>
      </PreloadQuery>
    </PreloadQuery>
  )
}
