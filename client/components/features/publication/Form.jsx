"use client"

import { Box, Button, Group, HStack, Input, VStack } from "@chakra-ui/react"
import { useRef } from "react"
import { FiFile, FiFileText } from "react-icons/fi"
import { LuSend } from "react-icons/lu"
import { FileModeForm, PostModeForm } from "@/components/features/publication"
import { UnifiedCard } from "@/components/ui"
import { usePublicationForm } from "@/hooks/form"
import { useIntl } from "@/hooks/utils"

export const PublicationForm = ({
  initialContent = "",
  initialMode = "post",
  onContentChange,
  onSubmit,
  isLoading = false,
  disabled = false,
  maxFileSize = 100 * 1024 * 1024,
  onFileSelect,
  onFileRemove,
  resetTrigger = 0,
}) => {
  const { t } = useIntl()
  const postModeFormRef = useRef(null)

  const {
    mode,
    setMode,
    content,
    setContent,
    fileDescription,
    setFileDescription,
    selectedFile,
    editor,
    handleFileSelect,
    handleRemoveFile,
    handleSubmit,
  } = usePublicationForm({
    initialContent,
    initialMode,
    onContentChange,
    maxFileSize,
    onFileSelect,
    onFileRemove,
    resetTrigger,
    disabled,
  })

  const handleFormSubmit = () => {
    const formData = handleSubmit()
    if (formData && onSubmit) {
      onSubmit(formData).then((_result) => {
        // 提交后退出全屏模式
        if (postModeFormRef.current) {
          postModeFormRef.current.exitFullscreen()
        }
      })
    }
  }

  const handleContentChange = (newContent) => {
    setContent(newContent)
    if (onContentChange) {
      onContentChange(newContent, mode, fileDescription, selectedFile)
    }
  }

  return (
    <UnifiedCard.Root mb={2}>
      {mode === "file" && (
        <UnifiedCard.Header p={0}>
          <FileModeForm
            selectedFile={selectedFile}
            onFileSelect={handleFileSelect}
            onRemoveFile={handleRemoveFile}
            maxFileSize={maxFileSize}
            disabled={disabled}
          />
        </UnifiedCard.Header>
      )}
      <UnifiedCard.Body>
        <VStack gap={4} align="stretch">
          {/* 内容区域 */}
          {mode === "post" ? (
            <Box minH="120px">
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
                    onClick={handleFormSubmit}
                    loading={isLoading}
                    loadingText={t("publication.publishing")}
                    disabled={disabled || isLoading || !content.trim()}
                  >
                    <LuSend />
                    {t("publication.publish")}
                  </Button>
                }
                disabled={disabled}
              />
            </Box>
          ) : (
            <Input
              placeholder={t("common.addFileDescription")}
              value={fileDescription}
              onChange={(e) => setFileDescription(e.target.value)}
              disabled={disabled}
            />
          )}
          {/* Tabs和发布按钮在同一行，在内容下方 */}
          <HStack justify="space-between" align="center">
            <Group attached>
              <Button
                size="xs"
                variant={mode === "post" ? "solid" : "subtle"}
                onClick={(_e) => setMode("post")}
              >
                <FiFileText />
                {t("publication.postMode")}
              </Button>
              <Button
                size="xs"
                variant={mode === "file" ? "solid" : "subtle"}
                onClick={(_e) => setMode("file")}
              >
                <FiFile />
                {t("publication.fileMode")}
              </Button>
            </Group>

            <Button
              colorPalette="orange"
              size="sm"
              onClick={handleFormSubmit}
              loading={isLoading}
              loadingText={t("publication.publishing")}
              disabled={
                disabled ||
                isLoading ||
                (mode === "post" && !content.trim()) ||
                (mode === "file" && (!selectedFile || !fileDescription.trim()))
              }
            >
              <LuSend />
              {t("publication.publish")}
            </Button>
          </HStack>
        </VStack>
      </UnifiedCard.Body>
    </UnifiedCard.Root>
  )
}
