"use client"

import { Box, Button, HStack, Tabs, VStack } from "@chakra-ui/react"
import { FiFile, FiFileText } from "react-icons/fi"
import { LuSend } from "react-icons/lu"
import { usePublicationForm } from "../../../hooks/usePublicationForm"
import { useTranslation } from "../../../hooks/useTranslation"
import { FileModeForm, PostModeForm } from "../../forms"
import { UnifiedCard } from "../../ui"

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
  const { publication } = useTranslation()

  const {
    mode,
    setMode,
    content,
    fileDescription,
    setFileDescription,
    selectedFile,
    filePreview,
    editor,
    fileInputRef,
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
      onSubmit(formData)
    }
  }

  return (
    <UnifiedCard.Root mb={2}>
      <UnifiedCard.Body>
        <VStack gap={4} align="stretch">
          {/* 内容区域 */}
          <Box minH="120px">
            {mode === "post" ? (
              <PostModeForm editor={editor} />
            ) : (
              <FileModeForm
                fileDescription={fileDescription}
                setFileDescription={setFileDescription}
                selectedFile={selectedFile}
                filePreview={filePreview}
                onFileSelect={handleFileSelect}
                onRemoveFile={handleRemoveFile}
                fileInputRef={fileInputRef}
                maxFileSize={maxFileSize}
                disabled={disabled}
              />
            )}
          </Box>

          {/* Tabs和发布按钮在同一行，在内容下方 */}
          <HStack justify="space-between" align="center">
            <Tabs.Root
              value={mode}
              onValueChange={(e) => setMode(e.value)}
              variant="subtle"
            >
              <Tabs.List>
                <Tabs.Trigger value="post">
                  <FiFileText />
                  {publication.postMode()}
                </Tabs.Trigger>
                <Tabs.Trigger value="file">
                  <FiFile />
                  {publication.fileMode()}
                </Tabs.Trigger>
              </Tabs.List>
            </Tabs.Root>

            <Button
              colorPalette="orange"
              size="sm"
              onClick={handleFormSubmit}
              loading={isLoading}
              loadingText={publication.publishing()}
              disabled={
                disabled ||
                isLoading ||
                (mode === "post" && !content.trim()) ||
                (mode === "file" && (!selectedFile || !fileDescription.trim()))
              }
            >
              <LuSend />
              {publication.publish()}
            </Button>
          </HStack>
        </VStack>
      </UnifiedCard.Body>
    </UnifiedCard.Root>
  )
}
