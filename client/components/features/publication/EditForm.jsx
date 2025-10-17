"use client"

import { Box, Button, HStack, Input, Text, VStack } from "@chakra-ui/react"
import { useEffect, useRef } from "react"
import { FiArrowLeft, FiSave } from "react-icons/fi"
import { PostModeForm } from "@/components/features/publication"
import { FileRenderer, UnifiedCard } from "@/components/ui"
import { usePublicationForm } from "@/hooks/form"
import { useIntl } from "@/hooks/utils"

export const PublicationEditForm = ({
  publication,
  onSave,
  onCancel,
  isLoading = false,
  disabled = false,
  maxFileSize = 100 * 1024 * 1024, // 100MB
}) => {
  const { t } = useIntl()
  const postModeFormRef = useRef(null)

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
      }).then((_result) => {
        // 保存后退出全屏模式
        if (postModeFormRef.current) {
          postModeFormRef.current.exitFullscreen()
        }
      })
    }
  }

  const handleContentChange = (newContent) => {
    setContent(newContent)
  }

  return (
    <UnifiedCard.Root mb={6} overflow="hidden">
      {/* 现有文件显示（不可编辑） */}
      {publication.content?.type === "FILE" && (
        <FileRenderer
          content={{
            ...publication.content,
            url: `${publication.author.url}/ewp/contents/${publication.content.content_hash}`,
          }}
          showDownload={false}
        />
      )}
      <UnifiedCard.Body>
        <VStack gap={4} align="stretch">
          {/* 内容区域 */}
          <Box minH={mode === "post" ? "120px" : "none"}>
            {mode === "post" ? (
              <PostModeForm
                ref={postModeFormRef}
                editor={editor}
                content={content}
                onContentChange={handleContentChange}
                showFullscreenButton={true}
                fullscreenActions={
                  <Button
                    colorPalette="orange"
                    size="sm"
                    onClick={handleSave}
                    loading={isLoading}
                    loadingText={t("publication.saving")}
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
                    {isSigned
                      ? t("publication.signedCannotEdit")
                      : t("publication.saveChanges")}
                  </Button>
                }
                disabled={disabled || isSigned}
              />
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
              loadingText={t("publication.saving")}
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
              {isSigned
                ? t("publication.signedCannotEdit")
                : t("publication.saveChanges")}
            </Button>
          </HStack>
        </VStack>
      </UnifiedCard.Body>
    </UnifiedCard.Root>
  )
}
