"use client"
import { Alert, Separator, Text, VStack } from "@chakra-ui/react"
import { useState } from "react"
import { CommentForm, CommentList } from "@/components/features/comment"
import {
  PublicationEditForm,
  PublicationItem,
} from "@/components/features/publication"
import { ConfirmDialog, Skeletons, UnifiedCard } from "@/components/ui"
import { usePage } from "@/contexts/PageContext"
import { usePublicationItem } from "@/hooks/data"
import { useIntl, usePageTitle } from "@/hooks/utils"
import { stripMarkdown, truncateText } from "@/utils/format"

/**
 * Publication detail page component
 * Displays publication details and comments
 */
export function PublicationItemPage({ variables }) {
  const { t } = useIntl()
  const { settings } = usePage()
  const [localPendingComment, setLocalPendingComment] = useState(null)
  const [retrySignatureFn, setRetrySignatureFn] = useState(null)
  const [commentRefetch, setCommentRefetch] = useState(null)
  const {
    publicationId,
    isEditMode,
    publication,
    publicationLoading,
    publicationError,
    deleteDialogOpen,
    isDeleting,
    authStatus,
    isNodeOwner,
    handleEdit,
    handleCancelEdit,
    handleSaveEdit,
    handleSignPublication,
    handleDeleteClick,
    handleConfirmDelete,
    handleShowSignature,
    handleCommentCreated,
    setDeleteDialogOpen,
    handlePublish,
  } = usePublicationItem({ variables })

  // Generate page title
  const getPageTitle = () => {
    if (!publication) return t("common")("pageTitle.contentDetail")

    let textToTruncate = ""
    if (publication.content?.type === "FILE") {
      textToTruncate = publication.description || ""
    } else {
      textToTruncate = publication.content?.body || ""
    }

    if (!textToTruncate) return t("common")("pageTitle.contentDetail")

    const plainText = stripMarkdown(textToTruncate)
    const truncatedText = truncateText(plainText, 30)
    return truncatedText
  }

  // Set page title - must be before all conditional rendering
  usePageTitle(getPageTitle())

  if (publicationLoading) {
    return <Skeletons.PublicationDetail />
  }

  if (publicationError) {
    return (
      <Alert.Root status="error">
        <Alert.Indicator />
        <Alert.Title>
          {t("common")("loadFailed")} {publicationError.message}
        </Alert.Title>
      </Alert.Root>
    )
  }

  if (!publication) {
    return (
      <VStack gap={4} align="center" py={8}>
        <Text color="gray.500">{t("common")("contentNotExists")}</Text>
      </VStack>
    )
  }

  return (
    <>
      <VStack gap={4} align="stretch">
        {/* Publication detail - edit mode or view mode */}
        {isEditMode ? (
          <PublicationEditForm
            publication={publication}
            onSave={handleSaveEdit}
            onCancel={handleCancelEdit}
            isLoading={false}
          />
        ) : (
          <PublicationItem
            publication={publication}
            isNodeOwner={isNodeOwner}
            isAuthenticated={authStatus === "AUTHENTICATED"}
            onSign={handleSignPublication}
            onDelete={handleDeleteClick}
            onShowSignature={handleShowSignature}
            onEdit={handleEdit}
            showAuthorInfo={false}
            onPublish={handlePublish}
          />
        )}

        {/* Comments section - only show when comments are allowed */}
        {settings?.allowComment && (
          <UnifiedCard.Root>
            <UnifiedCard.Header>
              <Text fontSize="xl" fontWeight="semibold">
                {t("common")("comments")} ({publication?.comment_count || 0})
              </Text>
            </UnifiedCard.Header>

            <UnifiedCard.Body>
              {/* Comment list - above the form */}
              <CommentList
                publicationId={publicationId}
                onCommentDeleted={() => {
                  // Refresh comment list and update publication comment count
                  if (typeof commentRefetch === "function") {
                    commentRefetch()
                  }
                  handleCommentCreated()
                }}
                localPendingComment={localPendingComment}
                onRetrySignature={retrySignatureFn}
                onSetRefetch={setCommentRefetch}
              />

              {/* Separator */}
              <Separator my={6} />

              {/* Comment form */}
              <CommentForm
                publicationId={publicationId}
                onCommentCreated={() => {
                  // Refresh comment list and update publication comment count
                  if (typeof commentRefetch === "function") {
                    commentRefetch()
                  }
                  handleCommentCreated()
                }}
                onPendingCommentChange={(pending, retryFn) => {
                  setLocalPendingComment(pending)
                  setRetrySignatureFn(() => retryFn)
                }}
              />
            </UnifiedCard.Body>
          </UnifiedCard.Root>
        )}
      </VStack>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title={t("common")("confirmDelete")}
        message={t("common")("confirmDeleteMessage")}
        confirmText={t("common")("confirmDeleteText")}
        cancelText={t("common")("cancel")}
        confirmColorPalette="red"
        isLoading={isDeleting}
      />
    </>
  )
}
