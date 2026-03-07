"use client"

import { Box, Button, Input, Textarea, VStack } from "@chakra-ui/react"
import { FiMessageCircle } from "react-icons/fi"
import { useAccount } from "wagmi"
import { AuthorInfo, ConnectWalletButton } from "@/components/ui"
import { useCommentForm } from "@/hooks/form"
import { useIntl } from "@/hooks/utils"

const formatAddress = (address) => {
  if (!address) return ""
  return `${address.slice(0, 6)}...${address.slice(-6)}`
}

export const CommentForm = ({ publicationId, onCommentCreated }) => {
  const { t } = useIntl()
  const { address } = useAccount()

  const { commentForm, isSubmitting, visitor, isOnline, handleSubmit } =
    useCommentForm(publicationId, onCommentCreated)

  const hasKnownNode = !!visitor?.node
  const isWalletConnected = !!address

  return (
    <form onSubmit={commentForm.handleSubmit(handleSubmit)}>
      <VStack gap={4} align="stretch">
        {!isWalletConnected ? (
          <Box>
            <ConnectWalletButton />
          </Box>
        ) : hasKnownNode ? (
          <Box>
            <AuthorInfo node={visitor.node} isOnline={isOnline} />
          </Box>
        ) : (
          <Input
            value={formatAddress(address)}
            readOnly
            bg="bg.subtle"
            borderColor="border"
            fontSize="sm"
          />
        )}

        <Textarea
          placeholder={t("comment.commentPlaceholder")}
          rows={4}
          disabled={!isWalletConnected}
          error={commentForm.formState.errors.body?.message}
          {...commentForm.register("body", {
            required: t("form.commentContentRequired"),
          })}
        />

        <Button
          type="submit"
          colorPalette="orange"
          size="md"
          width="100%"
          loading={isSubmitting}
          disabled={!isWalletConnected}
          loadingText={t("comment.submitting")}
        >
          <FiMessageCircle />
          {t("comment.submitComment")}
        </Button>
      </VStack>
    </form>
  )
}
