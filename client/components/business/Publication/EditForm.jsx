"use client"

import {
  Box,
  Button,
  FormatByte,
  HStack,
  Image,
  Input,
  Link,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useEffect } from "react"
import { FiArrowLeft, FiFileText, FiSave } from "react-icons/fi"
import { usePublicationForm } from "../../../hooks/usePublicationForm"
import { useTranslation } from "../../../hooks/useTranslation"
import { PostModeForm } from "../../forms"
import { UnifiedCard } from "../../ui"

export const PublicationEditForm = ({
  publication,
  onSave,
  onCancel,
  isLoading = false,
  disabled = false,
  maxFileSize = 100 * 1024 * 1024, // 100MB
}) => {
  const { publication: pub } = useTranslation()
  // 根据原始内容类型确定模式，不允许切换
  const originalMode = publication?.content?.type === "FILE" ? "file" : "post"

  // 检查是否已签名
  const isSigned = !!publication?.signature

  // 使用usePublicationForm hook
  const {
    mode,
    content,
    setContent,
    fileDescription,
    setFileDescription,
    selectedFile,
    editor,
  } = usePublicationForm({
    initialContent:
      originalMode === "file"
        ? publication?.description || ""
        : publication?.content?.body || "",
    initialMode: originalMode,
    onContentChange: () => {},
    maxFileSize,
    onFileSelect: () => {},
    onFileRemove: () => {},
    resetTrigger: 0,
    disabled: disabled || isSigned,
  })

  // 为文件模式设置初始文件描述
  useEffect(() => {
    if (originalMode === "file" && publication?.description) {
      setFileDescription(publication.description)
    }
  }, [publication?.description, originalMode, setFileDescription])

  // 同步文件描述到content（文件模式下）
  useEffect(() => {
    if (originalMode === "file") {
      setContent(fileDescription)
    }
  }, [fileDescription, originalMode, setContent])

  // 渲染现有文件（不可编辑）
  const renderExistingFile = () => {
    if (originalMode === "file" && publication?.content) {
      const { content: fileContent } = publication

      if (fileContent.mimetype?.startsWith("image/")) {
        return (
          <Box w="full">
            <Image
              src={
                publication.author.url
                  ? `${publication.author.url}/ewp/contents/${fileContent.content_hash}`
                  : undefined
              }
              alt={fileContent.filename || "图片"}
              display="block"
              w="100%"
              maxH={"400px"}
              objectFit="contain"
              bg="gray.100"
              _dark={{ bg: "gray.800" }}
            />
          </Box>
        )
      }

      if (fileContent.mimetype?.startsWith("video/")) {
        return (
          <VStack gap={2}>
            <video controls style={{ maxWidth: "100%", borderRadius: "8px" }}>
              <source
                src={
                  publication.author.url
                    ? `${publication.author.url}/ewp/contents/${fileContent.content_hash}`
                    : undefined
                }
                type={fileContent.mimetype}
              />
              您的浏览器不支持视频播放。
            </video>
          </VStack>
        )
      }

      // 其他文件类型
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
                  {fileContent.filename || pub.unknownFile()}
                </Text>
                {fileContent.size != null && (
                  <FormatByte value={fileContent.size} />
                )}
              </HStack>
              <Link
                href={`/ewp/contents/${fileContent.content_hash}`}
                color="orange.500"
                target="_blank"
                rel="noopener noreferrer"
              >
                {pub.downloadFile()}
              </Link>
            </HStack>
            <Text fontSize="xs" color="gray.500" _dark={{ color: "gray.400" }}>
              {fileContent.mimetype || pub.unknownType()}
            </Text>
          </VStack>
        </Box>
      )
    }
    return null
  }

  // 保存编辑
  const handleSave = () => {
    // 验证输入
    if (mode === "post" && !content.trim()) {
      console.warn("Post模式需要内容")
      return
    }

    if (mode === "file" && !fileDescription.trim()) {
      console.warn("File模式需要文件描述")
      return
    }

    // 直接调用onSave，不依赖handleSubmit
    if (onSave) {
      onSave({
        id: publication.id,
        mode,
        content: mode === "post" ? content : fileDescription,
        file: selectedFile, // 编辑模式下可能为null，这是正常的
      })
    }
  }

  return (
    <UnifiedCard.Root mb={6}>
      {/* 现有文件显示（不可编辑） */}
      {renderExistingFile()}
      <UnifiedCard.Body>
        <VStack gap={4} align="stretch">
          {/* 内容区域 */}
          <Box minH={mode === "post" ? "120px" : "none"}>
            {mode === "post" ? (
              <PostModeForm editor={editor} />
            ) : (
              <VStack gap={4} align="stretch">
                {/* 文件描述编辑 */}
                <VStack gap={2} align="stretch">
                  <Text fontSize="sm" color="gray.600">
                    编辑文件描述
                  </Text>
                  <Input
                    placeholder="输入文件描述"
                    value={fileDescription}
                    onChange={(e) => setFileDescription(e.target.value)}
                    disabled={disabled || isSigned}
                  />
                </VStack>
              </VStack>
            )}
          </Box>

          {/* 签名状态提示 */}
          {isSigned && (
            <Text fontSize="sm" color="red.500" textAlign="center">
              ⚠️ 已签名的内容无法编辑
            </Text>
          )}

          <HStack justify="space-between" align="center">
            <Button size="sm" variant="ghost" onClick={onCancel} gap={2}>
              <FiArrowLeft />
              取消编辑
            </Button>
            <Button
              colorPalette="orange"
              onClick={handleSave}
              loading={isLoading}
              loadingText={pub.saving()}
              disabled={
                disabled ||
                isLoading ||
                isSigned ||
                (mode === "post" && !content.trim()) ||
                (mode === "file" && !fileDescription.trim())
              }
              gap={2}
            >
              <FiSave />
              {isSigned ? pub.signedCannotEdit() : pub.saveChanges()}
            </Button>
          </HStack>
        </VStack>
      </UnifiedCard.Body>
    </UnifiedCard.Root>
  )
}
