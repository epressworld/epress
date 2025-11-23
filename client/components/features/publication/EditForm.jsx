"use client"

import {
  Box,
  Button,
  Field,
  HStack,
  IconButton,
  Input,
  Popover,
  Portal,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useEffect, useRef, useState } from "react"
import { FiArrowLeft, FiSave } from "react-icons/fi"
import { LuLink } from "react-icons/lu"
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
    slug,
    setSlug,
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

  // 设置初始 slug
  useEffect(() => {
    if (publication?.slug) {
      setSlug(publication.slug)
    }
  }, [publication?.slug, setSlug])

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
        slug: slug.trim() || null,
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

  const renderSlugButton = (props = { variant: "plain", zIndex: 1500 }) => (
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
    <UnifiedCard.Root overflow="hidden">
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
                fullscreenLeftActions={renderSlugButton({
                  zIndex: 10000,
                  variant: "plain",
                })}
                fullscreenRightActions={
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
                    {t("publication.editFileDescription")}
                  </Text>
                  <Input
                    placeholder={t("publication.addFileDescription")}
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
              {t("publication.signedNotEditable")}
            </Text>
          )}

          <HStack justify="space-between" align="center">
            <HStack gap={2}>
              <Button
                size="sm"
                variant="plain"
                onClick={onCancel}
                gap={2}
                p={0}
              >
                <FiArrowLeft />
                {t("publication.cancelEdit")}
              </Button>
              {postModeFormRef?.current?.isFullscreen
                ? null
                : renderSlugButton()}
            </HStack>
            <Button
              colorPalette="orange"
              onClick={handleSave}
              size="sm"
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
