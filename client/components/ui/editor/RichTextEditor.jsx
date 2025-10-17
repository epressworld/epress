"use client"
import { Box, IconButton, Portal } from "@chakra-ui/react"
import { EditorContent } from "@tiptap/react"
import { BubbleMenu } from "@tiptap/react/menus"
import { useState } from "react"
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

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const editorBox = (
    <Box
      border="1px"
      borderColor="gray.200"
      borderRadius="md"
      p={0}
      minH={minHeight}
      h={autoHeight ? "auto" : undefined}
      position="relative"
    >
      {showFullscreenButton && (
        <IconButton
          aria-label={isFullscreen ? "退出全屏" : "进入全屏"}
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
        <BubbleMenu editor={editor}>
          <EditorToolbar editor={editor} />
        </BubbleMenu>
      )}
    </Box>
  )

  if (isFullscreen) {
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
