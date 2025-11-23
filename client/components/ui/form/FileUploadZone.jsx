"use client"

import {
  Box,
  FileUpload,
  Float,
  FormatByte,
  HStack,
  Icon,
  Text,
  useFileUploadContext,
  VStack,
} from "@chakra-ui/react"
import { useEffect, useState } from "react"
import { FiFileText, FiUpload, FiX } from "react-icons/fi"
import { useIntl } from "@/hooks/utils"

const UploadOrPreview = ({ maxSize, onFileRemove }) => {
  const { acceptedFiles: files } = useFileUploadContext()
  const { t } = useIntl()
  const [previewUrls, setPreviewUrls] = useState({})

  // 为文件创建预览URL
  useEffect(() => {
    const urls = {}
    files.forEach((file) => {
      if (file.type.startsWith("image") || file.type.startsWith("video")) {
        urls[file.name] = URL.createObjectURL(file)
      }
    })
    setPreviewUrls(urls)

    // 清理URL以避免内存泄漏
    return () => {
      Object.values(urls).forEach((url) => {
        URL.revokeObjectURL(url)
      })
    }
  }, [files])

  return files.length !== 0 ? (
    <FileUpload.ItemGroup>
      {files.map((file) => {
        const previewUrl = previewUrls[file.name]
        const isImage = file.type.startsWith("image")
        const isVideo = file.type.startsWith("video")

        return (
          <FileUpload.Item
            minHeight={"110px"}
            file={file}
            key={file.name}
            p={0}
            border={0}
          >
            {isImage ? (
              <Box w="full" bg="">
                <FileUpload.ItemPreviewImage
                  display={"block"}
                  w="100%"
                  maxH={"300px"}
                  objectFit={"contain"}
                  roundedTop={"md"}
                  bg="gray.100"
                  _dark={{ bg: "gray.800" }}
                />
              </Box>
            ) : isVideo ? (
              <Box w="full">
                <Box
                  as="video"
                  controls
                  w="full"
                  maxH="400px"
                  bg="black"
                  src={previewUrl}
                  roundedTop={"md"}
                >
                  <source src={previewUrl} type={file.type} />
                  Your browser does not support the video tag.
                </Box>
              </Box>
            ) : (
              <Box
                w="full"
                bg="gray.50"
                minH="110px"
                _dark={{ bg: "gray.800" }}
                p={6}
              >
                <VStack gap={2} align="stretch">
                  <HStack justify="space-between" align="center">
                    <HStack gap={3} align="center">
                      <FiFileText color="currentColor" />
                      <Text
                        fontSize="sm"
                        fontWeight="medium"
                        color="gray.800"
                        _dark={{ color: "gray.200" }}
                      >
                        {file.name || t("publication.unknownFile")}
                      </Text>
                      {file.size != null && <FormatByte value={file.size} />}
                    </HStack>
                  </HStack>
                  <Text
                    fontSize="xs"
                    color="gray.500"
                    textAlign={"left"}
                    _dark={{ color: "gray.400" }}
                  >
                    {file.type || t("publication.unknownType")}
                  </Text>
                </VStack>
              </Box>
            )}
            <Float offset={5}>
              <FileUpload.ItemDeleteTrigger
                onClick={onFileRemove}
                boxSize="6"
                layerStyle="fill.subtle"
              >
                <FiX />
              </FileUpload.ItemDeleteTrigger>
            </Float>
          </FileUpload.Item>
        )
      })}
    </FileUpload.ItemGroup>
  ) : (
    <VStack gap={0}>
      <Icon size="xl" color="fg.muted" mb={2}>
        <FiUpload />
      </Icon>
      <Box>{t("common.clickToSelectFile")}</Box>
      <Box color="fg.muted">
        {t("common.supportAllFormats")} {maxSize / 1024 / 1024}MB
      </Box>
    </VStack>
  )
}

export function FileUploadZone({
  selectedFile,
  onFileSelect,
  onRemoveFile,
  maxSize = 100 * 1024 * 1024,
  maxFiles = 1,
}) {
  const files = selectedFile ? [selectedFile] : []
  return (
    <FileUpload.Root
      acceptedFiles={files}
      onFileChange={(e) => {
        if (e.acceptedFiles.length > 0) {
          onFileSelect({ files: e.acceptedFiles })
        } else {
          onRemoveFile({ preventDefault: () => {} })
        }
      }}
      alignItems="stretch"
      maxFiles={maxFiles}
      maxFileSize={maxSize}
    >
      <FileUpload.HiddenInput />
      <FileUpload.Dropzone
        minHeight={"110px"}
        border={0}
        bg="gray.100"
        roundedBottom={"none"}
        _dark={{ bg: "gray.800" }}
        p={0}
      >
        <UploadOrPreview onFileRemove={onRemoveFile} maxSize={maxSize} />
      </FileUpload.Dropzone>
    </FileUpload.Root>
  )
}
