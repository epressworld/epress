import PreloadApolloCache from "../../../components/util/PreloadApolloCache"
import {
  executeServerQueries,
  getRequestApolloClient,
} from "../../../graphql/index"
import { FETCH } from "../../../graphql/queries"
import ClientPage from "./page.client"

export default async function PublicationDetailServerPage({ params }) {
  const client = getRequestApolloClient()

  const { data: serverDataMap } = await executeServerQueries(
    [
      {
        queryKey: "FETCH",
        query: FETCH,
        variables: {
          type: "PUBLICATION",
          id: params.id,
        },
      },
    ],
    client,
  )

  return (
    <>
      <PreloadApolloCache serverDataMap={serverDataMap} />
      {(() => {
        const initialPublication = serverDataMap?.FETCH?.data?.fetch || null
        return <ClientPage initialPublication={initialPublication} />
      })()}
    </>
  )
}
