"use client"

import { useMutation } from "@apollo/client/react"
import { Box, HStack, IconButton, Text, VStack } from "@chakra-ui/react"
import { useState } from "react"
import { FiTrash2 } from "react-icons/fi"
import { AuthorInfo, CommentRenderer, ConfirmDialog } from "@/components/ui"
import { AUTH_STATUS, useAuth } from "@/contexts/AuthContext"
import { usePage } from "@/contexts/PageContext"
import { useOnlineVisitors, useWallet } from "@/hooks/data"
import { useIntl } from "@/hooks/utils"
import { DESTROY_COMMENT } from "@/lib/apollo"
import { deleteCommentTypedData } from "@/utils/helpers"
import { toaster } from "../../ui/toaster"

export const CommentItem = ({ comment, onCommentDeleted }) => {
  const { authStatus, isNodeOwner } = useAuth()
  const { profile } = usePage()
  const { signEIP712Data } = useWallet()
  const { isAddressOnline } = useOnlineVisitors()
  const [destroyComment] = useMutation(DESTROY_COMMENT)

  const { t, formatRelativeTime } = useIntl()

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteClick = () => {
    if (authStatus === AUTH_STATUS.AUTHENTICATED && isNodeOwner) {
      setDeleteDialogOpen(true)
    } else {
      setDeleteDialogOpen(true)
    }
  }

  const handleConfirmDelete = async () => {
    setIsDeleting(true)
    try {
      if (authStatus === AUTH_STATUS.AUTHENTICATED && isNodeOwner) {
        await destroyComment({
          variables: {
            id: comment.id,
          },
        })
      } else {
        if (!profile?.address) {
          toaster.create({
            description: t("common.nodeAddressNotAvailable"),
            type: "error",
          })
          return
        }

        const nodeAddress = profile.address

        const typedData = deleteCommentTypedData(
          nodeAddress,
          parseInt(comment.id, 10),
          comment.author_address,
        )

        const signature = await signEIP712Data(typedData)

        await destroyComment({
          variables: {
            id: comment.id,
            signature: signature,
          },
        })
      }

      toaster.create({
        description: t("comment.commentDeleteSuccess"),
        type: "success",
      })

      setDeleteDialogOpen(false)
      if (onCommentDeleted) {
        onCommentDeleted()
      }
    } catch (error) {
      console.error("删除评论失败:", error)
      toaster.create({
        description:
          error.message ||
          `${t("common.deleteFailed")}, ${t("common.pleaseRetry")}`,
        type: "error",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const renderUserInfo = () => {
    const isKnownNode = comment.commenter?.url
    const isOnline =
      comment.author_address && isAddressOnline(comment.author_address)

    if (isKnownNode) {
      return <AuthorInfo node={comment.commenter} isOnline={isOnline} />
    } else {
      return (
        <AuthorInfo
          node={{
            address: comment.author_address,
            title: comment.author_name,
          }}
          isOnline={isOnline}
        />
      )
    }
  }

  return (
    <>
      <Box
        border="1px"
        borderColor="gray.100"
        borderRadius="md"
        className="group"
      >
        <VStack align="stretch">
          <HStack gap={3}>{renderUserInfo()}</HStack>

          <CommentRenderer>{comment.body}</CommentRenderer>

          <HStack gap={2} align="center" justify="space-between">
            <Text color="gray.500" fontSize="sm">
              {formatRelativeTime(comment.created_at)}
            </Text>

            <HStack gap={1} align="center">
              <IconButton
                size="sm"
                opacity={0}
                pointerEvents="none"
                _groupHover={{ opacity: 1, pointerEvents: "auto" }}
                transition="opacity 0.2s ease-in-out"
                variant="ghost"
                colorPalette="red"
                onClick={handleDeleteClick}
              >
                <FiTrash2 />
              </IconButton>
            </HStack>
          </HStack>
        </VStack>
      </Box>

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title={t("dialog.confirmDelete")}
        message={t("dialog.deleteMessage")}
        confirmText={t("dialog.confirmDeleteText")}
        cancelText={t("common.cancel")}
        confirmColorPalette="red"
        isLoading={isDeleting}
      />
    </>
  )
}
