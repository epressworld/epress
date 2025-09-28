"use client"

import { VStack } from "@chakra-ui/react"
import { FileUploadZone } from "../ui"

export function FileModeForm({
  selectedFile,
  filePreview,
  onFileSelect,
  onRemoveFile,
  fileInputRef,
  maxFileSize,
  disabled = false,
}) {
  return (
    <VStack gap={4} align="stretch">
      <FileUploadZone
        selectedFile={selectedFile}
        filePreview={filePreview}
        onFileSelect={onFileSelect}
        onRemoveFile={onRemoveFile}
        fileInputRef={fileInputRef}
        maxSize={maxFileSize}
        disabled={disabled}
        border={0}
        bg={"gray.100"}
        borderRadius={"none"}
        roundedTop={"md"}
        _dark={{
          bg: "gray.700",
        }}
      />
    </VStack>
  )
}
