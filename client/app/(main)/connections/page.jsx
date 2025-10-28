import { ConnectionPage } from "@/components/features/connection"
import { SEARCH_NODES } from "@/lib/apollo"
import { PreloadQuery } from "@/lib/apollo/client"
import { generatePageMetadata } from "@/utils/helpers/ogp"

export async function generateMetadata() {
  return generatePageMetadata({
    path: "/connections",
    fallbackTitle: "Connections",
    fallbackDescription: "View your connections and network",
  })
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
