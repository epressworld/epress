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
} from "@chakra-ui/react"
import { forwardRef, useEffect, useImperativeHandle, useState } from "react"
import { LuMaximize2, LuMinimize2 } from "react-icons/lu"
import { RichTextEditor } from "@/components/ui/editor"
import { useIntl } from "@/hooks/utils"

/**
 * PostModeForm - Post mode form component with WYSIWYG and fullscreen support
 *
 * @param {Object} props
 * @param {Object} props.editor - TipTap editor instance
 * @param {string} props.content - Current content
 * @param {Function} props.onContentChange - Content change callback
 * @param {boolean} [props.showFullscreenButton=false] - Show fullscreen button
 * @param {Function} [props.onFullscreen] - Fullscreen state change callback
 * @param {React.ReactNode} [props.fullscreenLeftActions] - Left actions in fullscreen
 * @param {React.ReactNode} [props.fullscreenRightActions] - Right actions in fullscreen
 * @param {boolean} [props.disabled=false] - Disabled state
 */
export const PostModeForm = forwardRef(function PostModeForm(
  {
    editor,
    content,
    onContentChange,
    showFullscreenButton = false,
    onFullscreen,
    fullscreenLeftActions = null,
    fullscreenRightActions = null,
    disabled = false,
  },
  ref,
) {
  const { t } = useIntl()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isSourceMode, setIsSourceMode] = useState(false)

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    if (!isFullscreen) return

    const handleEscape = (event) => {
      if (event.key === "Escape" || event.keyCode === 27) {
        setFullscreenState(false)
      }
    }

    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [isFullscreen])

  const setFullscreenState = (fullscreen) => {
    if (isFullscreen === fullscreen) return

    setIsFullscreen(fullscreen)
    onFullscreen?.(fullscreen)

    // Auto exit source mode when leaving fullscreen
    if (!fullscreen && isSourceMode) {
      setIsSourceMode(false)
      if (editor && content) {
        editor.commands.setContent(content)
      }
    }
  }

  const toggleFullscreen = () => setFullscreenState(!isFullscreen)

  const handleSourceModeToggle = (details) => {
    const checked = details.checked
    setIsSourceMode(checked)

    if (!editor) return

    if (checked) {
      // Switch to source mode: get Markdown from editor
      const markdown = editor.storage.markdown.getMarkdown()
      onContentChange?.(markdown)
    } else {
      // Switch to WYSIWYG: set Markdown back to editor
      editor.commands.setContent(content)
    }
  }

  const handleSourceContentChange = (e) => {
    onContentChange?.(e.target.value)
  }

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    exitFullscreen: () => setFullscreenState(false),
    isFullscreen,
  }))

  // Normal mode: WYSIWYG editor only
  if (!isFullscreen) {
    return (
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
            disabled={disabled}
          >
            <LuMaximize2 />
          </IconButton>
        )}
        <RichTextEditor editor={editor} minHeight="150px" />
      </Box>
    )
  }

  // Fullscreen mode
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
        {/* Editor Area */}
        <Box flex={1} overflow="hidden">
          <Container maxW="6xl" h="full" p={3}>
            <Box
              position="relative"
              h="full"
              display="flex"
              flexDirection="column"
            >
              {/* Exit Fullscreen Button */}
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

              {/* Content Editor */}
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

        {/* Bottom Control Bar */}
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
              <Flex alignItems="center" gap={2}>
                <Checkbox.Root
                  checked={isSourceMode}
                  onCheckedChange={handleSourceModeToggle}
                  disabled={disabled}
                >
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                  <Checkbox.Label>
                    {t("publication.sourceCodeMode")}
                  </Checkbox.Label>
                </Checkbox.Root>
                {fullscreenLeftActions}
              </Flex>
              {fullscreenRightActions}
            </HStack>
          </Container>
        </Box>
      </Box>
    </Portal>
  )
})
