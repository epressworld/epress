"use client"

import { Input, VStack } from "@chakra-ui/react"
import { useTranslation } from "../../hooks/useTranslation"
import { FileUploadZone } from "../ui"

export function FileModeForm({
  fileDescription,
  setFileDescription,
  selectedFile,
  filePreview,
  onFileSelect,
  onRemoveFile,
  fileInputRef,
  maxFileSize,
  disabled = false,
}) {
  const { common } = useTranslation()

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
      />

      <Input
        placeholder={common.addFileDescription()}
        value={fileDescription}
        onChange={(e) => setFileDescription(e.target.value)}
        disabled={disabled}
      />
    </VStack>
  )
}
