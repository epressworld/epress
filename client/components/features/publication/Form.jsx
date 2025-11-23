"use client"

import {
  Box,
  Button,
  Field,
  Group,
  HStack,
  IconButton,
  Input,
  Popover,
  Portal,
  VStack,
} from "@chakra-ui/react"
import { useRef, useState } from "react"
import { FiFile, FiFileText } from "react-icons/fi"
import { LuLink, LuSend } from "react-icons/lu"
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
  const [hideSlugButton, setHideSlugButton] = useState(false)
  const [isSlugPopoverOpen, setIsSlugPopoverOpen] = useState(false)
  const [slugError, setSlugError] = useState("")

  // Slug 验证
  const validateSlug = (value) => {
    if (!value.trim()) {
      setSlugError("")
      return true
    }
    if (!/^[a-z0-9-]+$/.test(value)) {
      setSlugError(
        t("publication.slugInvalid") ||
          "Slug can only contain lowercase letters, numbers, and hyphens.",
      )
      return false
    }
    setSlugError("")
    return true
  }

  const handleSlugChange = (e) => {
    const value = e.target.value
    setSlug(value)
    validateSlug(value)
  }

  const {
    mode,
    setMode,
    content,
    setContent,
    fileDescription,
    setFileDescription,
    selectedFile,
    slug,
    setSlug,
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
  const renderSlugButton = (props = { variant: "subtle", zIndex: null }) => (
    <Popover.Root
      open={isSlugPopoverOpen}
      onOpenChange={(e) => setIsSlugPopoverOpen(e.open)}
    >
      <Popover.Trigger asChild>
        <IconButton
          size="xs"
          variant={props.variant}
          aria-label={t("publication.setSlug") || "Set slug"}
        >
          <LuLink />
        </IconButton>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content zIndex={props.zIndex}>
            <Popover.Arrow />
            <Popover.Body>
              <VStack gap={2} align="stretch">
                <Field.Root invalid={!!slugError}>
                  <Field.Label>{t("publication.slug") || "Slug"}</Field.Label>
                  <Input
                    value={slug}
                    onChange={handleSlugChange}
                    placeholder={
                      t("publication.slugPlaceholder") || "my-custom-slug"
                    }
                    disabled={disabled}
                  />
                  {slugError && <Field.ErrorText>{slugError}</Field.ErrorText>}
                  <Field.HelperText>
                    {t("publication.slugHelper") ||
                      "Only lowercase letters, numbers, and hyphens allowed"}
                  </Field.HelperText>
                </Field.Root>
              </VStack>
            </Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  )

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
                onFullscreen={(isFullscreen) => setHideSlugButton(isFullscreen)}
                fullscreenLeftActions={renderSlugButton({
                  zIndex: 10000,
                  variant: "plain",
                })}
                fullscreenRightActions={
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
            <HStack gap={2}>
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
              {!hideSlugButton && renderSlugButton()}
            </HStack>

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
