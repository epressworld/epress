import { Box } from "@chakra-ui/react"
import { EditorContent } from "@tiptap/react"
import { BubbleMenu } from "@tiptap/react/menus"
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
        <BubbleMenu editor={editor}>
          <EditorToolbar editor={editor} />
        </BubbleMenu>
      )}
    </Box>
  )
}
