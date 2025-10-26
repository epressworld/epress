"use client"

import { Box, VStack } from "@chakra-ui/react"
import { useMemo } from "react"
import { FileUploadZone } from "@/components/ui"

export function FileModeForm({
  selectedFile,
  filePreview,
  onFileSelect,
  onRemoveFile,
  maxFileSize,
  disabled = false,
}) {
  const memoizedFileUpload = useMemo(
    () => (
      <FileUploadZone
        selectedFile={selectedFile}
        filePreview={filePreview}
        onFileSelect={onFileSelect}
        onRemoveFile={onRemoveFile}
        maxSize={maxFileSize}
        disabled={disabled}
      />
    ),
    [selectedFile, filePreview, maxFileSize, disabled],
  )
  return (
    <VStack gap={4} align="stretch">
      <Box
        p={0}
        textAlign="center"
        minH="80px"
        display="flex"
        alignItems="center"
        justifyContent="center"
        bg={"gray.100"}
        borderRadius={"none"}
        roundedTop={"md"}
        _dark={{
          bg: "gray.700",
        }}
      >
        {memoizedFileUpload}
      </Box>
    </VStack>
  )
}
