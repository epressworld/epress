"use client"

import { Box } from "@chakra-ui/react"
import { BubbleMenu, EditorContent } from "@tiptap/react"
import { EditorToolbar } from "./EditorToolbar"

export function RichTextEditor({
  editor,
  minHeight = "120px",
  autoHeight = false,
}) {
  return (
    <Box
      border="1px"
      borderColor="gray.200"
      borderRadius="md"
      p={0}
      minH={minHeight}
      h={autoHeight ? "auto" : undefined}
    >
      <EditorContent
        editor={editor}
        style={{
          minHeight: minHeight,
          height: autoHeight ? "auto" : undefined,
          overflow: "auto",
        }}
      />

      {editor && (
        <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
          <EditorToolbar editor={editor} />
        </BubbleMenu>
      )}
    </Box>
  )
}
