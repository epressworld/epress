"use client"

import {
  Box,
  Button,
  Dialog,
  Drawer,
  HStack,
  IconButton,
  Input,
  Portal,
  Separator,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useCopyToClipboard } from "@uidotdev/usehooks"
import formatFileSize from "pretty-bytes"
import { useEffect, useRef, useState } from "react"
import { FiEdit3, FiMessageCircle, FiTrash2 } from "react-icons/fi"
import { LuQuote, LuSend } from "react-icons/lu"
import { CommentForm, CommentList } from "@/components"
import {
  AuthorInfo,
  BodyRenderer,
  createSignatureData,
  FileRenderer,
  Link,
  RichTextEditor,
  ShareButton,
  SignatureDialog,
  SignedMark,
  Tooltip,
  toaster,
  UnifiedCard,
} from "@/components/ui"
import { usePublicationForm } from "@/hooks/form"
import { useIntl } from "@/hooks/utils"

export function PublicationItem({
  publication,
  isNodeOwner,
  isAuthenticated,
  onSign,
  onDelete,
  onEdit,
  showAuthorInfo = true,
  showCommentIcon = true,
  onPublish,
  keyword,
}) {
  const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false)
  const [isQuoteDialogOpen, setIsQuoteDialogOpen] = useState(false)
  const commentsRef = useRef(null)
  const [isPublishing, setIsPublishing] = useState(false)
  const [_copied, copyToClipboard] = useCopyToClipboard()
  const [quoteSlug, setQuoteSlug] = useState(null)
  const { t, formatDateTime, formatRelativeTime } = useIntl()

  // 评论 Drawer 状态
  const [isCommentDrawerOpen, setIsCommentDrawerOpen] = useState(false)
  const [commentCount, setCommentCount] = useState(
    publication.comment_count || 0,
  )

  // 生成引用文本
  const generateQuote = () => {
    const authorTitle = publication.author?.title || "Unknown Author"
    const authorUrl = publication.author?.url || ""
    const createdAt = formatDateTime(publication.created_at)
    const contentHash = publication.content?.content_hash || ""

    let contentSection

    if (publication.content?.type === "FILE") {
      const filename = publication.content?.filename || "Unknown File"
      const size = publication.content?.size
        ? formatFileSize(publication.content.size)
        : ""
      const fileInfo = size ? ` (${size})` : ""
      const mimetype = publication.content?.mimetype || ""
      const isImage = mimetype.startsWith("image/")

      if (isImage) {
        const imgUrl = `${authorUrl}/ewp/contents/${contentHash}?thumb=md`
        const lines = [
          `> ![${filename}](${imgUrl})`,
          ...(publication.description || "")
            .split("\n")
            .filter((line) => line.trim().length > 0)
            .map((line) => `> ${line}`),
        ]
        contentSection = lines.join("\n")
      } else {
        const fileUrl = `${authorUrl}/ewp/contents/${contentHash}`
        contentSection = [
          `> 📎 ${t("publication.fileMode")}: [${filename}](${fileUrl}) ${fileInfo}`,
          `> `,
          ...(publication.description || "")
            .split("\n")
            .map((line) => `> ${line}`),
        ].join("\n")
      }
    } else {
      contentSection = (publication.content?.body || "")
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n")
    }

    const quoteText = [
      `> [@${authorTitle}](${authorUrl})`,
      `> `,
      contentSection,
      `> `,
      `> [${createdAt}](${authorUrl}/publications/${publication.content.content_hash})`,
    ].join("\n")

    return quoteText
  }

  // 处理引用按钮点击
  const handleQuote = async () => {
    if (isNodeOwner && isAuthenticated) {
      setIsQuoteDialogOpen(true)
      return
    }

    try {
      const quoteText = generateQuote()
      await copyToClipboard(quoteText)

      toaster.create({
        description: t("publication.quoteCopied"),
        type: "success",
      })
    } catch (error) {
      console.error("Failed to copy quote:", error)
      toaster.create({
        description: t("publication.copyFailed"),
        type: "error",
      })
    }
  }

  // 判断是否是本节点发布的内容
  const isOwnContent = publication.author?.is_self === true

  // 引用发布 Dialog 的表单状态
  const [quoteInitialContent, setQuoteInitialContent] = useState("")
  const { editor: quoteEditor, content: quoteContent } = usePublicationForm({
    initialContent: quoteInitialContent,
    initialMode: "post",
  })

  // 当 Dialog 打开时，设置编辑器内容
  useEffect(() => {
    if (isQuoteDialogOpen) {
      const quoteText = generateQuote()
      const contentWithPlaceholder = `&nbsp;\n\n${quoteText}`
      setQuoteInitialContent(contentWithPlaceholder)

      setTimeout(() => {
        if (quoteEditor) {
          quoteEditor.commands.setTextSelection(0)
          quoteEditor.commands.focus()
        }
      }, 100)
    }
  }, [isQuoteDialogOpen, quoteEditor, setQuoteInitialContent])

  // 处理引用发布
  const handleQuotePublish = async () => {
    if (!onPublish) {
      console.error("onPublish 回调未提供")
      return
    }

    if (!quoteContent.trim()) {
      toaster.create({
        description: t("publication.contentCannotBeEmpty"),
        type: "error",
      })
      return
    }

    setIsPublishing(true)
    try {
      const editorContent =
        quoteEditor?.storage?.markdown?.getMarkdown() || quoteContent

      const formData = {
        mode: "post",
        slug: quoteSlug,
        content: editorContent,
        file: null,
      }

      await onPublish(formData)

      setIsQuoteDialogOpen(false)
      setQuoteInitialContent("")
    } catch (error) {
      console.error("发布失败:", error)
    } finally {
      setIsPublishing(false)
    }
  }

  // 生成正确的详情链接
  const getDetailUrl = () => {
    const identifier = publication.slug || publication.id
    if (isNodeOwner && isAuthenticated && !isOwnContent) {
      return `${publication.author.url}/publications/${publication.content.content_hash}`
    }
    return `/publications/${identifier}`
  }

  // 判断是否应该显示评论按钮（只有本节点内容才显示）
  const shouldShowComments = isOwnContent && showCommentIcon

  // 处理评论创建成功
  const handleCommentCreated = async () => {
    // 刷新评论列表
    await commentsRef?.current?.refetch()

    // 更新评论数量
    setCommentCount((prev) => prev + 1)
  }

  // 处理评论删除成功
  const handleCommentDeleted = async () => {
    // 刷新评论列表
    await commentsRef?.current?.refetch()
    // 更新评论数量
    setCommentCount((prev) => Math.max(0, prev - 1))
  }

  return (
    <>
      <UnifiedCard.Root
        className="publication-item"
        position="relative"
        overflow="hidden"
      >
        {/* 签名标记 */}
        <SignedMark
          isSigned={!!publication.signature}
          isOwner={isNodeOwner && isAuthenticated && isOwnContent}
          onClick={() => {
            if (publication.signature) {
              setIsSignatureDialogOpen(true)
            } else if (isNodeOwner && isAuthenticated && isOwnContent) {
              onSign(publication)
            }
          }}
        />

        {/* 顶部全宽媒体展示区 */}
        {publication.content?.type === "FILE" && (
          <FileRenderer
            content={{
              ...publication.content,
              url: `${publication.author.url}/ewp/contents/${publication.content.content_hash}`,
            }}
            description={publication.description}
            showDownload={false}
          />
        )}
        <UnifiedCard.Body>
          <VStack gap={4} align="stretch">
            {/* 作者信息 */}
            {showAuthorInfo && isAuthenticated && publication.author && (
              <AuthorInfo
                node={publication.author}
                size="sm"
                showAddress={true}
                linkable={true}
              />
            )}

            <BodyRenderer
              content={
                publication.content.type === "POST"
                  ? publication.content.body
                  : publication.description
              }
              keyword={keyword}
            />

            {/* 底部信息栏 */}
            <HStack
              justify="space-between"
              align="center"
              borderTop="1px"
              borderColor="gray.100"
            >
              <HStack gap={4}>
                {/* 发布时间 */}
                <Link
                  href={getDetailUrl()}
                  title={formatDateTime(publication.created_at)}
                  color="gray.500"
                  fontSize="sm"
                  suppressHydrationWarning
                >
                  {formatRelativeTime(publication.created_at)}
                </Link>
              </HStack>

              {/* 操作按钮 */}
              <HStack gap={1}>
                {/* 节点所有者操作 */}
                {isNodeOwner && isAuthenticated && (
                  <Box className="publication-item-actions">
                    {!publication.signature && (
                      <Tooltip
                        content={
                          publication.signature
                            ? t("publication.signedCannotEditMessage")
                            : t("publication.edit")
                        }
                      >
                        <IconButton
                          size="xs"
                          variant="ghost"
                          disabled={!!publication.signature}
                          onClick={() => onEdit?.(publication)}
                        >
                          <FiEdit3 size={12} />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip content={t("publication.delete")}>
                      <IconButton
                        size="xs"
                        variant="ghost"
                        colorPalette="red"
                        onClick={() => onDelete(publication)}
                      >
                        <FiTrash2 size={12} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                )}
                {/* 评论按钮（显示数量）- 只有本节点内容才显示 */}
                {shouldShowComments && (
                  <Tooltip content={t("publication.viewComments")}>
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => setIsCommentDrawerOpen(true)}
                      gap={1}
                    >
                      <FiMessageCircle size={12} />
                      <Text fontSize="xs">{commentCount}</Text>
                    </Button>
                  </Tooltip>
                )}
                {/* 引用按钮 */}
                <Tooltip content={t("publication.quote")}>
                  <IconButton size="xs" variant="ghost" onClick={handleQuote}>
                    <LuQuote size={12} />
                  </IconButton>
                </Tooltip>
                <ShareButton
                  url={`${publication.author.url}/publications/${publication.slug || publication.id}`}
                  onCopied={() =>
                    toaster.create({
                      description: t("publication.shareUrlCopied"),
                      type: "success",
                    })
                  }
                />
              </HStack>
            </HStack>
          </VStack>
        </UnifiedCard.Body>

        {/* 签名信息对话框 */}
        <SignatureDialog
          isOpen={isSignatureDialogOpen}
          onClose={() => setIsSignatureDialogOpen(false)}
          signatureData={createSignatureData(publication)}
        />

        {/* 引用发布对话框 */}
        <Dialog.Root
          open={isQuoteDialogOpen}
          onOpenChange={(e) => e.open === false && setIsQuoteDialogOpen(false)}
          size="lg"
          closeOnEscape={true}
          initialFocusEl={() => null}
        >
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>{t("publication.quotePublish")}</Dialog.Title>
              </Dialog.Header>

              <Dialog.Body>
                <RichTextEditor editor={quoteEditor} autoHeight={true} />
              </Dialog.Body>

              <Dialog.Footer>
                <HStack justify="space-between" width="100%">
                  {/* 左侧内容（左对齐） */}
                  <HStack>
                    <Input
                      placeholder="SLUG"
                      variant="flushed"
                      name="slug"
                      onChange={(e) => setQuoteSlug(e.target.value)}
                    />
                  </HStack>

                  {/* 右侧内容（右对齐） */}
                  <HStack gap={2}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsQuoteDialogOpen(false)}
                    >
                      {t("publication.cancel")}
                    </Button>
                    <Button
                      size="sm"
                      colorPalette="orange"
                      onClick={handleQuotePublish}
                      loading={isPublishing}
                      loadingText={t("publication.publishing")}
                      disabled={isPublishing || !quoteContent.trim()}
                    >
                      <LuSend size={14} style={{ marginRight: "4px" }} />
                      {t("publication.publish")}
                    </Button>
                  </HStack>
                </HStack>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Dialog.Root>
      </UnifiedCard.Root>

      {/* 评论 Drawer - 从底部滑出，占据 70% 视口高度 */}
      <Drawer.Root
        open={shouldShowComments && isCommentDrawerOpen}
        onOpenChange={(e) => setIsCommentDrawerOpen(e.open)}
        placement="bottom"
        closeOnInteractOutside={true}
        closeOnEscape={true}
      >
        <Portal>
          <Drawer.Backdrop />
          <Drawer.Positioner>
            <Drawer.Content
              roundedTop="l3"
              height="70vh"
              display="flex"
              flexDirection="column"
              overflow="hidden"
            >
              <Drawer.Header flexShrink={0}>
                <Drawer.Title flex="0 1 auto" display="block">
                  {t("comment.publishComment")} ({commentCount})
                </Drawer.Title>
              </Drawer.Header>
              <Drawer.CloseTrigger asChild>
                <IconButton size="sm" variant="ghost">
                  <Text fontSize="xl">×</Text>
                </IconButton>
              </Drawer.CloseTrigger>

              <Drawer.Body flex="1" overflow="auto" flexDirection="column">
                {/* 评论列表 */}
                <CommentForm
                  key={`commentForm-${publication.id}-${commentCount}`}
                  publicationId={publication.id}
                  onCommentCreated={handleCommentCreated}
                />
                <Separator my={5} />
                <CommentList
                  ref={commentsRef}
                  publicationId={publication.id}
                  onCommentDeleted={handleCommentDeleted}
                  suspense={false}
                />
              </Drawer.Body>
            </Drawer.Content>
          </Drawer.Positioner>
        </Portal>
      </Drawer.Root>
    </>
  )
}
