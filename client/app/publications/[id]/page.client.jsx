"use client"
import { Alert, Separator, Text, VStack } from "@chakra-ui/react"
import { useState } from "react"
import {
  CommentForm,
  CommentList,
  PublicationEditForm,
  PublicationItem,
} from "../../../components/business"
import {
  ConfirmDialog,
  LoadingSkeleton,
  UnifiedCard,
} from "../../../components/ui"
import { usePage } from "../../../contexts/PageContext"
import { usePageTitle } from "../../../hooks/usePageTitle"
import { usePublicationDetail } from "../../../hooks/usePublicationDetail"
import { useTranslation } from "../../../hooks/useTranslation"
import { stripMarkdown, truncateText } from "../../../utils/textUtils"

export default function PublicationDetailPage({ variables }) {
  const { common } = useTranslation()
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
  } = usePublicationDetail({ variables })

  // 生成页面标题
  const getPageTitle = () => {
    if (!publication) return common.pageTitle.contentDetail()

    let textToTruncate = ""
    if (publication.content?.type === "FILE") {
      textToTruncate = publication.description || ""
    } else {
      textToTruncate = publication.content?.body || ""
    }

    if (!textToTruncate) return common.pageTitle.contentDetail()

    const plainText = stripMarkdown(textToTruncate)
    const truncatedText = truncateText(plainText, 30)
    return truncatedText
  }

  // 设置页面标题 - 必须在所有条件渲染之前
  usePageTitle(getPageTitle())

  if (publicationLoading) {
    return (
      <VStack gap={4} align="stretch">
        <LoadingSkeleton count={1} />
        <LoadingSkeleton count={1} />
      </VStack>
    )
  }

  if (publicationError) {
    return (
      <Alert.Root status="error">
        <Alert.Indicator />
        <Alert.Title>
          {common.loadFailed()} {publicationError.message}
        </Alert.Title>
      </Alert.Root>
    )
  }

  if (!publication) {
    return (
      <VStack gap={4} align="center" py={8}>
        <Text color="gray.500">{common.contentNotExists()}</Text>
      </VStack>
    )
  }

  return (
    <>
      <VStack gap={4} align="stretch">
        {/* 发布详情 - 编辑模式或查看模式 */}
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

        {/* 评论区域 - 只有在允许评论时才显示 */}
        {settings?.allowComment && (
          <UnifiedCard.Root>
            <UnifiedCard.Header>
              <Text fontSize="xl" fontWeight="semibold">
                {common.comments()} ({publication?.comment_count || 0})
              </Text>
            </UnifiedCard.Header>

            <UnifiedCard.Body>
              {/* 评论列表 - 放在表单上方 */}
              <CommentList
                publicationId={publicationId}
                onCommentDeleted={() => {
                  // 刷新评论列表并更新 publication 的评论数
                  if (typeof commentRefetch === "function") {
                    commentRefetch()
                  }
                  handleCommentCreated()
                }}
                localPendingComment={localPendingComment}
                onRetrySignature={retrySignatureFn}
                onSetRefetch={setCommentRefetch}
              />

              {/* 分割线 */}
              <Separator my={6} />

              {/* 评论表单 */}
              <CommentForm
                publicationId={publicationId}
                onCommentCreated={() => {
                  // 刷新评论列表并更新 publication 的评论数
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

      {/* 删除确认对话框 */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title={common.confirmDelete()}
        message={common.confirmDeleteMessage()}
        confirmText={common.confirmDeleteText()}
        cancelText={common.cancel()}
        confirmColorPalette="red"
        isLoading={isDeleting}
      />
    </>
  )
}
