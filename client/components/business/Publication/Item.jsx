"use client"

import {
  Avatar,
  Box,
  Button,
  Dialog,
  HStack,
  IconButton,
  Image,
  Link,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useCopyToClipboard } from "@uidotdev/usehooks"
import { useEffect, useState } from "react"
import { FiEdit3, FiFileText, FiMessageCircle, FiTrash2 } from "react-icons/fi"
import { LuQuote, LuSend } from "react-icons/lu"
import ReactMarkdown from "react-markdown"
import rehypeHighlight from "rehype-highlight"
import remarkGfm from "remark-gfm"
import { useLanguage } from "../../../contexts/LanguageContext"
import { usePublicationForm } from "../../../hooks/usePublicationForm"
import { useTranslation } from "../../../hooks/useTranslation"
import { formatRelativeTime, formatTime } from "../../../utils/dateFormat"
import {
  createSignatureData,
  RichTextEditor,
  SignatureDialog,
  SignedMark,
  Tooltip,
  toaster,
  UnifiedCard,
} from "../../ui"

export const PublicationItem = ({
  publication,
  isNodeOwner,
  isAuthenticated,
  onSign,
  onDelete,
  onEdit,
  showAuthorInfo = true,
  onPublish, // 新增：复用发布逻辑
}) => {
  const [isImageExpanded, setIsImageExpanded] = useState(false)
  const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false)
  const [isQuoteDialogOpen, setIsQuoteDialogOpen] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [_copied, copyToClipboard] = useCopyToClipboard()
  const { currentLanguage } = useLanguage()
  const { publication: pub } = useTranslation()

  // 格式化文件大小
  const formatFileSize = (bytes) => {
    if (!bytes) return ""
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${Math.round((bytes / 1024 ** i) * 100) / 100} ${sizes[i]}`
  }

  // 生成引用文本
  const generateQuote = () => {
    const authorTitle = publication.author?.title || "Unknown Author"
    const authorUrl = publication.author?.url || ""
    const createdAt = formatTime(publication.created_at, currentLanguage)
    const contentHash = publication.content?.content_hash || ""
    const createdAtUnix = Math.floor(
      new Date(publication.created_at).getTime() / 1000,
    )
    const isExternal = publication.author?.is_self !== true
    const baseUrl = isExternal ? authorUrl : ""

    let contentSection

    if (publication.content?.type === "FILE") {
      // 文件类型：显示文件信息 + 描述
      const filename = publication.content?.filename || "Unknown File"
      const size = publication.content?.size
        ? formatFileSize(publication.content.size)
        : ""
      const fileInfo = size ? ` (${size})` : ""
      const mimetype = publication.content?.mimetype || ""
      const isImage = mimetype.startsWith("image/")

      if (isImage) {
        // 图片文件：直接在引用中嵌入图片，并附带描述
        const altText = (publication.description || filename).split("\n")[0]
        const imgUrl = `${baseUrl}/ewp/contents/${contentHash}?timestamp=${createdAtUnix}`
        const lines = [
          `> ![${altText}](${imgUrl})`,
          ...(publication.description || "")
            .split("\n")
            .filter((line) => line.trim().length > 0)
            .map((line) => `> ${line}`),
        ]
        contentSection = lines.join("\n")
      } else {
        // 非图片文件：保持文本链接的行为
        const fileUrl = `${baseUrl}/ewp/contents/${contentHash}?timestamp=${createdAtUnix}`
        contentSection = [
          `> 📁 ${pub.fileMode()}: ${filename}${fileInfo}`,
          `> [${filename}](${fileUrl})`,
          `> `, // 空行
          ...(publication.description || "")
            .split("\n")
            .map((line) => `> ${line}`),
        ].join("\n")
      }
    } else {
      // 文本类型：直接显示内容
      contentSection = (publication.content?.body || "")
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n")
    }

    // 构建引用文本
    const quoteText = [
      `> [@${authorTitle}](${authorUrl})`,
      `> `,
      contentSection,
      `> `,
      `> [${createdAt}](${authorUrl}/publications/${contentHash})`,
    ].join("\n")

    return quoteText
  }

  // 处理引用按钮点击
  const handleQuote = async () => {
    const quoteText = generateQuote()

    // 如果是节点所有者且已认证，打开引用发布 Dialog
    if (isNodeOwner && isAuthenticated) {
      setIsQuoteDialogOpen(true)
      return
    }

    // 否则复制到剪切板
    try {
      await copyToClipboard(quoteText)

      toaster.create({
        description: pub.quoteCopied(),
        type: "success",
      })
    } catch (error) {
      console.error("Failed to copy quote:", error)
      toaster.create({
        description: pub.copyFailed(),
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
      // 在引用内容上方添加&nbsp;占位符
      const contentWithPlaceholder = `&nbsp;\n\n${quoteText}`
      setQuoteInitialContent(contentWithPlaceholder)

      // 延迟聚焦到编辑器顶部
      setTimeout(() => {
        if (quoteEditor) {
          // 将光标移动到文档开始位置（&nbsp;处）
          quoteEditor.commands.setTextSelection(0)
          // 聚焦编辑器
          quoteEditor.commands.focus()
        }
      }, 100)
    }
  }, [isQuoteDialogOpen, quoteEditor, setQuoteInitialContent])

  // 处理引用发布 - 复用现有发布逻辑
  const handleQuotePublish = async () => {
    if (!onPublish) {
      console.error("onPublish 回调未提供")
      return
    }

    if (!quoteContent.trim()) {
      toaster.create({
        description: pub.contentCannotBeEmpty(),
        type: "error",
      })
      return
    }

    setIsPublishing(true)
    try {
      // 使用编辑器的 Markdown 内容
      const editorContent =
        quoteEditor?.storage?.markdown?.getMarkdown() || quoteContent

      // 构建表单数据，复用现有发布逻辑
      const formData = {
        mode: "post",
        content: editorContent,
        file: null,
      }

      // 调用父组件的发布逻辑
      await onPublish(formData)

      // 关闭 Dialog
      setIsQuoteDialogOpen(false)

      // 重置编辑器内容
      setQuoteInitialContent("")
    } catch (error) {
      console.error("发布失败:", error)
      // 错误处理由父组件的发布逻辑负责
    } finally {
      setIsPublishing(false)
    }
  }

  // 生成正确的详情链接
  const getDetailUrl = () => {
    if (isNodeOwner && isAuthenticated && !isOwnContent) {
      // 节点所有者查看外部内容，跳转到对方节点的 publications/[content_hash]
      return `${publication.author.url}/publications/${publication.content.content_hash}`
    }
    // 否则使用本节点的URL（本节点内容或非节点所有者查看）
    return `/publications/${publication.id}`
  }

  // 判断是否应该显示评论按钮（只有本节点内容才显示）
  const shouldShowComments = isOwnContent

  // 处理图片点击
  const handleImageClick = () => {
    setIsImageExpanded(!isImageExpanded)
  }

  // 渲染内容
  const renderContent = () => {
    const { content } = publication

    if (content.type === "POST") {
      return (
        <Box className="markdown-content markdown-body">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
          >
            {content.body}
          </ReactMarkdown>
        </Box>
      )
    }

    if (content.type === "FILE") {
      // 新布局：媒体移至卡片顶部，此处仅显示文件描述行
      return publication.description ? (
        <Text color="gray.800" _dark={{ color: "gray.200" }} fontSize="sm">
          {publication.description}
        </Text>
      ) : null
    }

    if (content.type === "FILE") {
      return <Text>{publication.description}</Text>
    }
    return <Text>{content.body}</Text>
  }

  return (
    <UnifiedCard.Root
      className="publication-item"
      position="relative"
      overflow="hidden"
    >
      {/* 签名标记 - 始终显示，根据状态显示不同颜色 */}
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

      {/* 顶部全宽媒体展示区：仅在 FILE 类型时显示 */}
      {publication.content?.type === "FILE" &&
        (() => {
          const content = publication.content
          const sourceUrl = publication.author.url
            ? `${publication.author.url}/ewp/contents/${content.content_hash}`
            : undefined

          if (content.mimetype?.startsWith("image/")) {
            return (
              <Box w="full">
                <Image
                  src={sourceUrl}
                  alt={content.filename || pub.unknownFile()}
                  display="block"
                  w="100%"
                  maxH={isImageExpanded ? "none" : "400px"}
                  objectFit="contain"
                  cursor="pointer"
                  onClick={handleImageClick}
                  bg="gray.100"
                  _dark={{ bg: "gray.800" }}
                />
              </Box>
            )
          }

          if (content.mimetype?.startsWith("video/")) {
            return (
              <Box w="full">
                <video controls style={{ width: "100%" }}>
                  <source src={sourceUrl} type={content.mimetype} />
                  {pub.browserNotSupportVideo()}
                </video>
              </Box>
            )
          }

          // 非图片文件的全宽美观展示区
          return (
            <Box w="full" bg="gray.50" _dark={{ bg: "gray.800" }} p={6}>
              <VStack gap={2} align="stretch">
                <HStack justify="space-between" align="center">
                  <HStack gap={3} align="center">
                    <FiFileText color="currentColor" />
                    <Text
                      fontSize="sm"
                      fontWeight="medium"
                      color="gray.800"
                      _dark={{ color: "gray.200" }}
                    >
                      {content.filename || pub.unknownFile()}
                    </Text>
                    {content.size != null && (
                      <Text
                        fontSize="xs"
                        color="gray.500"
                        _dark={{ color: "gray.400" }}
                      >
                        {(content.size / 1024 / 1024).toFixed(2)} MB
                      </Text>
                    )}
                  </HStack>
                  {sourceUrl && (
                    <Link
                      href={sourceUrl}
                      color="orange.500"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {pub.downloadFile()}
                    </Link>
                  )}
                </HStack>
                <Text
                  fontSize="xs"
                  color="gray.500"
                  _dark={{ color: "gray.400" }}
                >
                  {content.mimetype || pub.unknownType()}
                </Text>
              </VStack>
            </Box>
          )
        })()}
      <UnifiedCard.Body>
        <VStack gap={4} align="stretch">
          {/* 作者信息 - 根据showAuthorInfo参数控制显示 */}
          {showAuthorInfo && isNodeOwner && isAuthenticated && (
            <HStack gap={3} align="center">
              <Avatar.Root size="sm">
                <Avatar.Image
                  src={
                    publication.author?.url
                      ? `${publication.author.url}/ewp/avatar`
                      : undefined
                  }
                  alt={publication.author?.title || pub.unknownNode()}
                />
                <Avatar.Fallback>
                  {publication.author?.title?.charAt(0) || "N"}
                </Avatar.Fallback>
              </Avatar.Root>
              <VStack gap={0} align="start">
                {publication.author?.url ? (
                  <Text
                    as="a"
                    href={publication.author.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    fontSize="sm"
                    fontWeight="medium"
                    color="orange.500"
                    _hover={{
                      color: "orange.600",
                      textDecoration: "underline",
                    }}
                  >
                    {publication.author?.title || pub.unknownNode()}
                  </Text>
                ) : (
                  <Text fontSize="sm" fontWeight="medium">
                    {publication.author?.title || pub.unknownNode()}
                  </Text>
                )}
                <Text fontSize="xs" color="gray.500">
                  {publication.author?.address}
                </Text>
              </VStack>
            </HStack>
          )}

          {/* 内容 */}
          {renderContent()}

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
                title={formatTime(publication.created_at, currentLanguage)}
                color="gray.500"
                fontSize="sm"
                suppressHydrationWarning
              >
                {formatRelativeTime(publication.created_at, currentLanguage)}
              </Link>
            </HStack>

            {/* 操作按钮 - 只在悬停时显示 */}
            <HStack gap={1} className="publication-item-actions">
              {/* 评论按钮（显示数量）- 只有本节点内容才显示 */}
              {shouldShowComments && (
                <Tooltip content={pub.viewComments()}>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        window.location.href = `${getDetailUrl()}#comments`
                      }
                    }}
                    gap={1}
                  >
                    <FiMessageCircle size={12} />
                    <Text fontSize="xs">{publication.comment_count || 0}</Text>
                  </Button>
                </Tooltip>
              )}

              {/* 引用按钮 */}
              <Tooltip content={pub.quote()}>
                <IconButton size="xs" variant="ghost" onClick={handleQuote}>
                  <LuQuote size={12} />
                </IconButton>
              </Tooltip>

              {/* 节点所有者操作 */}
              {isNodeOwner && isAuthenticated && (
                <>
                  <Tooltip
                    content={
                      publication.signature
                        ? pub.signedCannotEditMessage()
                        : pub.edit()
                    }
                  >
                    <IconButton
                      size="xs"
                      variant="ghost"
                      disabled={!!publication.signature} // 已签名的内容不能编辑
                      onClick={() => onEdit?.(publication)}
                    >
                      <FiEdit3 size={12} />
                    </IconButton>
                  </Tooltip>

                  <Tooltip content={pub.delete()}>
                    <IconButton
                      size="xs"
                      variant="ghost"
                      colorPalette="red"
                      onClick={() => onDelete(publication)}
                    >
                      <FiTrash2 size={12} />
                    </IconButton>
                  </Tooltip>
                </>
              )}
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
              <Dialog.Title>{pub.quotePublish()}</Dialog.Title>
            </Dialog.Header>

            <Dialog.Body>
              <RichTextEditor editor={quoteEditor} autoHeight={true} />
            </Dialog.Body>

            <Dialog.Footer>
              <HStack gap={2}>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsQuoteDialogOpen(false)}
                >
                  {pub.cancel()}
                </Button>
                <Button
                  size="sm"
                  colorPalette="orange"
                  onClick={handleQuotePublish}
                  loading={isPublishing}
                  loadingText={pub.publishing()}
                  disabled={isPublishing || !quoteContent.trim()}
                >
                  <LuSend size={14} style={{ marginRight: "4px" }} />
                  {pub.publish()}
                </Button>
              </HStack>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </UnifiedCard.Root>
  )
}
