"use client"

import { Box, IconButton, Image, Text, VStack } from "@chakra-ui/react"
import { FiUpload, FiX } from "react-icons/fi"
import { useTranslation } from "../../hooks/useTranslation"

export function FileUploadZone({
  selectedFile,
  filePreview,
  onFileSelect,
  onRemoveFile,
  disabled = false,
  maxSize = 100 * 1024 * 1024,
  accept = "*/*",
  fileInputRef,
  ...props
}) {
  const { common } = useTranslation()

  const handleClick = () => {
    if (!disabled && fileInputRef?.current) {
      fileInputRef.current.click()
    }
  }

  return (
    <Box
      border="2px dashed"
      borderColor="gray.300"
      borderRadius="md"
      p={4}
      textAlign="center"
      cursor={disabled ? "not-allowed" : "pointer"}
      onClick={handleClick}
      _hover={disabled ? {} : { borderColor: "orange.400" }}
      opacity={disabled ? 0.6 : 1}
      minH="80px"
      display="flex"
      alignItems="center"
      justifyContent="center"
      {...props}
    >
      <input
        ref={fileInputRef}
        type="file"
        onChange={onFileSelect}
        style={{ display: "none" }}
        accept={accept}
        disabled={disabled}
      />

      {selectedFile ? (
        <VStack gap={2}>
          {filePreview && (
            <Image
              src={filePreview}
              alt={common.preview()}
              maxH="60px"
              objectFit="contain"
            />
          )}
          <Text fontSize="sm" color="gray.600">
            {common.selected()} {selectedFile.name}
          </Text>
          <Text fontSize="xs" color="gray.500">
            {common.size()} {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
          </Text>
          <IconButton
            size="sm"
            onClick={onRemoveFile}
            aria-label={common.removeFile()}
            disabled={disabled}
          >
            <FiX />
          </IconButton>
        </VStack>
      ) : (
        <VStack gap={2}>
          <FiUpload size={24} />
          <Text>{common.clickToSelectFile()}</Text>
          <Text fontSize="sm" color="gray.500">
            {common.supportAllFormats()} {maxSize / 1024 / 1024}MB
          </Text>
        </VStack>
      )}
    </Box>
  )
}
