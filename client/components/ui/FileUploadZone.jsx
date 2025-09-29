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
import { FiFileText, FiUpload, FiX } from "react-icons/fi"
import { useTranslation } from "../../hooks/useTranslation"

const UploadOrPreview = ({ maxSize, onFileRemove }) => {
  const { acceptedFiles: files } = useFileUploadContext()
  const { common, publication: pub } = useTranslation()
  return files.length !== 0 ? (
    <FileUpload.ItemGroup>
      {files.map((file) => (
        <FileUpload.Item
          minHeight={"110px"}
          file={file}
          key={file.name}
          p={0}
          border={0}
        >
          {file.type.startsWith("image") ? (
            <Box w="full">
              <FileUpload.ItemPreviewImage
                display={"block"}
                w="100%"
                maxH={"400px"}
                objectFit={"cover"}
                roundedTop={"md"}
              />
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
                      {file.name || pub.unknownFile()}
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
                  {file.type || pub.unknownType()}
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
      ))}
    </FileUpload.ItemGroup>
  ) : (
    <>
      <Icon size="md" color="fg.muted">
        <FiUpload />
      </Icon>
      <FileUpload.DropzoneContent>
        <Box>{common.clickToSelectFile()}</Box>
        <Box color="fg.muted">
          {common.supportAllFormats()} {maxSize / 1024 / 1024}MB
        </Box>
      </FileUpload.DropzoneContent>
    </>
  )
}

export function FileUploadZone({
  onFileSelect,
  onRemoveFile,
  maxSize = 100 * 1024 * 1024,
  maxFiles = 1,
}) {
  return (
    <FileUpload.Root
      alignItems="stretch"
      maxFiles={maxFiles}
      maxFileSize={maxSize}
      onFileAccept={onFileSelect}
    >
      <FileUpload.HiddenInput />
      <FileUpload.Dropzone
        minHeight={"110px"}
        border={0}
        bg="gray.100"
        _dark={{ bg: "gray.800" }}
        p={0}
      >
        <UploadOrPreview onFileRemove={onRemoveFile} maxSize={maxSize} />
      </FileUpload.Dropzone>
    </FileUpload.Root>
  )

  // return (
  //   <Box
  //     border="2px dashed"
  //     borderColor="gray.300"
  //     borderRadius="md"
  //     p={4}
  //     textAlign="center"
  //     cursor={disabled ? "not-allowed" : "pointer"}
  //     onClick={handleClick}
  //     _hover={disabled ? {} : { borderColor: "orange.400" }}
  //     opacity={disabled ? 0.6 : 1}
  //     minH="80px"
  //     display="flex"
  //     alignItems="center"
  //     justifyContent="center"
  //     {...props}
  //   >
  //     <input
  //       ref={fileInputRef}
  //       type="file"
  //       onChange={onFileSelect}
  //       style={{ display: "none" }}
  //       accept={accept}
  //       disabled={disabled}
  //     />

  //     {selectedFile ? (
  //       <VStack gap={2}>
  //         {filePreview && (
  //           <Image
  //             src={filePreview}
  //             alt={common.preview()}
  //             maxH="60px"
  //             objectFit="contain"
  //           />
  //         )}
  //         <Text fontSize="sm" color="gray.600">
  //           {common.selected()} {selectedFile.name}
  //         </Text>
  //         <Text fontSize="xs" color="gray.500">
  //           {common.size()} {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
  //         </Text>
  //         <IconButton
  //           size="sm"
  //           onClick={onRemoveFile}
  //           aria-label={common.removeFile()}
  //           disabled={disabled}
  //         >
  //           <FiX />
  //         </IconButton>
  //       </VStack>
  //     ) : (
  //       <VStack gap={2}>
  //         <FiUpload size={24} />
  //         <Text></Text>
  //         <Text fontSize="sm" color="gray.500">
  //
  //         </Text>
  //       </VStack>
  //     )}
  //   </Box>
  // )
}
