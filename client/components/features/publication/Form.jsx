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

const SLUG_PATTERN = /^[a-z0-9-]+$/

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
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isSlugPopoverOpen, setIsSlugPopoverOpen] = useState(false)
  const [slugError, setSlugError] = useState("")

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

  // Slug validation
  const validateSlug = (value) => {
    if (!value.trim()) {
      setSlugError("")
      return true
    }

    if (!SLUG_PATTERN.test(value)) {
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

  const handleFullscreenChange = (fullscreen) => {
    setIsFullscreen(fullscreen)
  }

  const handleFormSubmit = async () => {
    const formData = handleSubmit()
    if (formData && onSubmit) {
      await onSubmit(formData)
      postModeFormRef.current?.exitFullscreen()
    }
  }

  const handleContentChange = (newContent) => {
    setContent(newContent)
    onContentChange?.(newContent, mode, fileDescription, selectedFile)
  }

  const isPublishDisabled =
    disabled ||
    isLoading ||
    (mode === "post" && !content.trim()) ||
    (mode === "file" && (!selectedFile || !fileDescription.trim()))

  const renderSlugButton = (variant = "subtle", zIndex = null) => (
    <Popover.Root
      open={isSlugPopoverOpen}
      onOpenChange={(e) => setIsSlugPopoverOpen(e.open)}
    >
      <Popover.Trigger asChild>
        <IconButton
          size="xs"
          variant={variant}
          aria-label={t("publication.setSlug") || "Set slug"}
        >
          <LuLink />
        </IconButton>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content zIndex={zIndex}>
            <Popover.Arrow />
            <Popover.Body>
              <VStack gap={2} align="stretch">
                <Field.Root invalid={!!slugError}>
                  <Field.Label>{t("publication.slug")}</Field.Label>
                  <Input
                    value={slug}
                    onChange={handleSlugChange}
                    placeholder={t("publication.slugPlaceholder")}
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

  const renderPublishButton = () => (
    <Button
      colorPalette="orange"
      size="sm"
      onClick={handleFormSubmit}
      loading={isLoading}
      loadingText={t("publication.publishing")}
      disabled={isPublishDisabled}
    >
      <LuSend />
      {t("publication.publish")}
    </Button>
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
          {/* Content Area */}
          {mode === "post" ? (
            <Box minH="120px">
              <PostModeForm
                ref={postModeFormRef}
                editor={editor}
                content={content}
                onContentChange={handleContentChange}
                showFullscreenButton={true}
                onFullscreen={handleFullscreenChange}
                fullscreenLeftActions={renderSlugButton("plain", 10000)}
                fullscreenRightActions={renderPublishButton()}
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

          {/* Mode Tabs and Publish Button */}
          <HStack justify="space-between" align="center">
            <HStack gap={2}>
              <Group attached>
                <Button
                  size="xs"
                  variant={mode === "post" ? "solid" : "subtle"}
                  onClick={() => setMode("post")}
                  disabled={disabled}
                >
                  <FiFileText />
                  {t("publication.postMode")}
                </Button>
                <Button
                  size="xs"
                  variant={mode === "file" ? "solid" : "subtle"}
                  onClick={() => setMode("file")}
                  disabled={disabled}
                >
                  <FiFile />
                  {t("publication.fileMode")}
                </Button>
              </Group>

              {!isFullscreen && renderSlugButton()}
            </HStack>

            {renderPublishButton()}
          </HStack>
        </VStack>
      </UnifiedCard.Body>
    </UnifiedCard.Root>
  )
}
