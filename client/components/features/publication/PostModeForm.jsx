"use client"

import {
  Box,
  Checkbox,
  Container,
  Flex,
  HStack,
  IconButton,
  Portal,
  Textarea,
  VStack,
} from "@chakra-ui/react"
import { forwardRef, useEffect, useImperativeHandle, useState } from "react"
import { LuMaximize2, LuMinimize2 } from "react-icons/lu"
import { RichTextEditor } from "@/components/ui/editor"
import { useIntl } from "@/hooks/utils"

/**
 * PostModeForm - 帖子模式表单组件
 * 支持所见即所得编辑和全屏模式下的源码编辑
 *
 * @param {Object} props
 * @param {Object} props.editor - TipTap 编辑器实例
 * @param {string} props.content - 当前内容
 * @param {Function} props.onContentChange - 内容变化回调
 * @param {boolean} [props.showFullscreenButton=false] - 是否显示全屏按钮
 * @param {React.ReactNode} [props.fullscreenActions=null] - 全屏模式下的额外操作按钮
 * @param {boolean} [props.disabled=false] - 是否禁用
 * @param {React.Ref} ref - 用于暴露 exitFullscreen 方法
 */
export const PostModeForm = forwardRef(function PostModeForm(
  {
    editor,
    content,
    onContentChange,
    showFullscreenButton = false,
    fullscreenLeftActions = null,
    fullscreenRightActions = null,
    onFullscreen = () => {},
    disabled = false,
  },
  ref,
) {
  const { t } = useIntl()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isSourceMode, setIsSourceMode] = useState(false)

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === "Escape" || event.keyCode === 27) {
        if (isFullscreen) {
          exitFullscreen()
        }
      }
    }

    window.addEventListener("keydown", handleEsc)

    // 清理事件监听器
    return () => {
      window.removeEventListener("keydown", handleEsc)
    }
  }, [isFullscreen])

  const exitFullscreen = () => {
    if (isFullscreen) {
      setIsFullscreen(false)
      if (isSourceMode) {
        setIsSourceMode(false)
        if (editor && content) {
          editor.commands.setContent(content)
        }
      }
    }
  }

  // 暴露 exitFullscreen 方法给父组件
  useImperativeHandle(ref, () => ({
    exitFullscreen,
    isFullscreen,
  }))

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
    // 退出全屏时自动切换回所见即所得模式
    if (isFullscreen && isSourceMode) {
      exitFullscreen()
    }
    onFullscreen(!isFullscreen)
  }

  const handleSourceModeToggle = (details) => {
    const checked = details.checked
    setIsSourceMode(checked)

    if (checked && editor) {
      // 切换到源代码模式：从编辑器获取 Markdown
      const markdown = editor.storage.markdown.getMarkdown()
      if (onContentChange) {
        onContentChange(markdown)
      }
    } else if (!checked && editor) {
      // 切换回 WYSIWYG 模式：将 Markdown 设置回编辑器
      editor.commands.setContent(content)
    }
  }

  const handleSourceContentChange = (e) => {
    const newContent = e.target.value
    if (onContentChange) {
      onContentChange(newContent)
    }
  }

  // 全屏模式下的控制栏
  const fullscreenControls = (
    <Box>
      <Container
        maxW="6xl"
        borderTop="1px solid"
        borderColor="gray.200"
        p={3}
        bg="white"
        _dark={{ borderColor: "gray.700", bg: "gray.900" }}
      >
        <HStack justify="space-between" align="center">
          <Flex alignItems={"center"} gap={2}>
            <Checkbox.Root
              checked={isSourceMode}
              onCheckedChange={handleSourceModeToggle}
            >
              <Checkbox.HiddenInput />
              <Checkbox.Control />
              <Checkbox.Label>{t("publication.sourceCodeMode")}</Checkbox.Label>
            </Checkbox.Root>
            {fullscreenLeftActions}
          </Flex>
          {fullscreenRightActions || <Box />}
        </HStack>
      </Container>
    </Box>
  )

  // 非全屏模式：只显示所见即所得编辑器
  if (!isFullscreen) {
    return (
      <VStack gap={4} align="stretch">
        <Box position="relative">
          {showFullscreenButton && (
            <IconButton
              aria-label={t("publication.enterFullscreen")}
              size="xs"
              variant="ghost"
              position="absolute"
              top={0}
              right={0}
              zIndex={10}
              onClick={toggleFullscreen}
            >
              <LuMaximize2 />
            </IconButton>
          )}
          <RichTextEditor editor={editor} minHeight="150px" />
        </Box>
      </VStack>
    )
  }

  // 全屏模式
  return (
    <Portal>
      <Box
        position="fixed"
        top={0}
        left={0}
        right={0}
        bottom={0}
        bg="white"
        _dark={{ bg: "gray.900" }}
        zIndex={9999}
        display="flex"
        flexDirection="column"
      >
        {/* 编辑区域 */}
        <Box flex={1} overflow="hidden">
          <Container maxW="6xl" h="full" p={3}>
            <Box
              position="relative"
              h="full"
              display="flex"
              flexDirection="column"
            >
              {/* 全屏退出按钮 */}
              <IconButton
                aria-label={t("publication.exitFullscreen")}
                size="xs"
                variant="ghost"
                position="absolute"
                top={0}
                right={0}
                zIndex={10}
                onClick={toggleFullscreen}
              >
                <LuMinimize2 />
              </IconButton>

              {/* 内容编辑区域 */}
              {isSourceMode ? (
                <Textarea
                  p={0}
                  name="publication-form"
                  value={content}
                  onChange={handleSourceContentChange}
                  placeholder={t("publication.writeSomething")}
                  h="full"
                  fontFamily="monospace"
                  fontSize="md"
                  disabled={disabled}
                  border="none"
                  outline="none"
                  _focus={{
                    border: "none",
                    boxShadow: "none",
                    outline: "none",
                  }}
                  _focusVisible={{
                    border: "none",
                    boxShadow: "none",
                    outline: "none",
                  }}
                  resize="none"
                  overflowY="auto"
                />
              ) : (
                <Box h="full" overflowY="auto">
                  <RichTextEditor editor={editor} minHeight="100%" />
                </Box>
              )}
            </Box>
          </Container>
        </Box>

        {/* 底部控制栏 */}
        {fullscreenControls}
      </Box>
    </Portal>
  )
})
