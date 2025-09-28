import { PreloadQuery } from "../../graphql/client"
import { SEARCH_PUBLICATIONS } from "../../graphql/queries"
import ClientPage from "./page.client"

export default async function PublicationsServerPage() {
  const variables = {
    filterBy: null,
    orderBy: "-created_at",
    first: 10,
  }
  return (
    <PreloadQuery query={SEARCH_PUBLICATIONS} variables={variables}>
      <ClientPage variables={variables} />
    </PreloadQuery>
  )
}
