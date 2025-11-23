import { Alert } from "@chakra-ui/react"
import { redirect } from "next/navigation"
import { CONFIRM_COMMENT, CONFIRM_COMMENT_DELETION } from "@/lib/apollo"
import { getClient } from "@/lib/apollo/client"

const VerifyError = ({ message, description }) => (
  <Alert.Root status="error">
    <Alert.Indicator />
    <Alert.Content>
      <Alert.Title>{message}</Alert.Title>
      <Alert.Description>
        {description || "Verification failed. Please fix them and try again."}
      </Alert.Description>
    </Alert.Content>
  </Alert.Root>
)

export default async function VerifyPage({ searchParams }) {
  const client = getClient()
  const { token } = await searchParams
  try {
    const payload = JSON.parse(atob(token.split(".")[1]))
    if (payload.action === "confirm") {
      // 统一端点：邮箱确认传递 tokenOrSignature（无需 id）
      const { data, error } = await client.mutate({
        mutation: CONFIRM_COMMENT,
        variables: { tokenOrSignature: token },
        fetchPolicy: "network-only",
      })
      if (data) {
        const publication = data.confirmComment.publication
        const identifier = publication.slug || publication.id
        redirect(`/publications/${identifier}`)
      } else {
        return (
          <VerifyError message="Failed" description={JSON.stringify(error)} />
        )
      }
    } else if (payload.action === "destroy") {
      const { data, error } = await client.mutate({
        mutation: CONFIRM_COMMENT_DELETION,
        variables: { token },
        fetchPolicy: "network-only",
      })
      if (data) {
        const publication = data.confirmCommentDeletion.publication
        const identifier = publication.slug || publication.id
        redirect(`/publications/${identifier}`)
      } else {
        return (
          <VerifyError message="Failed" description={JSON.stringify(error)} />
        )
      }
    } else {
      return <VerifyError message="Unknown Action" />
    }
  } catch (e) {
    if (e.message === "NEXT_REDIRECT") {
      throw e
    }
    return <VerifyError message={e.message} />
  }
}
