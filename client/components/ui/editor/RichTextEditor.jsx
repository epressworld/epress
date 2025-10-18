"use client"
import { Box, IconButton, Portal } from "@chakra-ui/react"
import { EditorContent } from "@tiptap/react"
import { BubbleMenu } from "@tiptap/react/menus"
import { useRef, useState } from "react"
import { LuMaximize2, LuMinimize2 } from "react-icons/lu"
import { EditorToolbar } from "./EditorToolbar"

export function RichTextEditor({
  editor,
  minHeight = "120px",
  autoHeight = false,
  showFullscreenButton = false,
  fullscreenContent = null,
}) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const editorContainerRef = useRef(null)
  const fullscreenContainerRef = useRef(null)

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  // 根据模式选择正确的 scrollTarget
  const getScrollTarget = () => {
    if (isFullscreen && fullscreenContainerRef.current) {
      return fullscreenContainerRef.current
    }
    return editorContainerRef.current
  }

  const editorBox = (
    <Box
      ref={editorContainerRef}
      p={0}
      minH={minHeight}
      h={autoHeight ? "auto" : undefined}
    >
      {showFullscreenButton && (
        <IconButton
          aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          size="xs"
          variant="ghost"
          position="absolute"
          top={2}
          right={2}
          zIndex={10}
          onClick={toggleFullscreen}
        >
          {isFullscreen ? <LuMinimize2 size={14} /> : <LuMaximize2 size={14} />}
        </IconButton>
      )}

      <EditorContent
        editor={editor}
        style={{
          minHeight: minHeight,
          height: autoHeight ? "auto" : undefined,
          overflow: "auto",
        }}
      />

      {editor && (
        <BubbleMenu
          editor={editor}
          options={{ scrollTarget: getScrollTarget() }}
        >
          <EditorToolbar editor={editor} />
        </BubbleMenu>
      )}
    </Box>
  )

  if (isFullscreen) {
    return (
      <Portal>
        <Box
          ref={fullscreenContainerRef}
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
          p={4}
        >
          <Box flex={1} overflow="auto" mb={4}>
            {editorBox}
          </Box>
          {fullscreenContent}
        </Box>
      </Portal>
    )
  }

  return editorBox
}
