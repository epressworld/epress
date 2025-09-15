"use client"

import { Box, Field, IconButton, Image, Text, VStack } from "@chakra-ui/react"
import { useRef } from "react"
import { FiUpload, FiX } from "react-icons/fi"
import { useFileUpload } from "../../hooks/useFileUpload"
import { useTranslation } from "../../hooks/useTranslation"

export function FileUpload({
  label,
  accept = "image/*",
  maxSize = 2 * 1024 * 1024, // 2MB
  preview,
  onFileChange,
  onFileRemove,
  helperText,
  error,
  disabled = false,
  required = false,
  ...props
}) {
  const fileInputRef = useRef()
  const { common } = useTranslation()

  const {
    selectedFile,
    preview: hookPreview,
    error: hookError,
    handleFileSelect,
    handleRemoveFile,
  } = useFileUpload({
    maxSize,
    accept,
    onFileChange,
    onError: (error) => {
      if (props.onError) {
        props.onError(error)
      }
    },
  })

  const currentPreview = preview || hookPreview
  const currentError = error || hookError

  const handleRemove = () => {
    handleRemoveFile()
    if (onFileRemove) {
      onFileRemove()
    }
  }

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  return (
    <Field.Root invalid={!!currentError}>
      {label && (
        <Field.Label>
          {label} {required && "*"}
        </Field.Label>
      )}

      <VStack gap={3} align="stretch">
        {currentPreview && (
          <Box>
            <Image
              src={currentPreview}
              alt={common.preview()}
              maxW="200px"
              maxH="200px"
              borderRadius="md"
              objectFit="cover"
            />
          </Box>
        )}

        <Box
          border="2px dashed"
          borderColor={currentError ? "red.300" : "gray.300"}
          borderRadius="md"
          p={6}
          textAlign="center"
          cursor={disabled ? "not-allowed" : "pointer"}
          onClick={handleClick}
          _hover={disabled ? {} : { borderColor: "orange.400" }}
          opacity={disabled ? 0.6 : 1}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            style={{ display: "none" }}
            disabled={disabled}
          />

          {selectedFile ? (
            <VStack gap={2}>
              <Text fontSize="sm" color="gray.600">
                {common.selected()} {selectedFile.name}
              </Text>
              <Text fontSize="xs" color="gray.500">
                {common.size()} {(selectedFile.size / 1024 / 1024).toFixed(2)}{" "}
                MB
              </Text>
              <IconButton
                size="sm"
                onClick={handleRemove}
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
                {accept === "image/*"
                  ? common.supportImageFormats()
                  : common.supportAllFormatsShort()}
              </Text>
            </VStack>
          )}
        </Box>

        {helperText && (
          <Field.HelperText fontSize="xs">{helperText}</Field.HelperText>
        )}

        {currentError && <Field.ErrorText>{currentError}</Field.ErrorText>}
      </VStack>
    </Field.Root>
  )
}
