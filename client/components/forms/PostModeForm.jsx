"use client"

import { VStack } from "@chakra-ui/react"
import { RichTextEditor } from "../ui"

export function PostModeForm({ editor }) {
  return (
    <VStack gap={4} align="stretch">
      <RichTextEditor editor={editor} minHeight="150px" />
    </VStack>
  )
}
