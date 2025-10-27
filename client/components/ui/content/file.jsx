"use client"

import {
  Box,
  FormatByte,
  HStack,
  Image,
  Link,
  Text,
  VStack,
} from "@chakra-ui/react"
import dynamic from "next/dynamic"
import { useState } from "react"
import {
  LuDownload,
  LuFile,
  LuFileAudio,
  LuFileImage,
  LuFileVideo,
} from "react-icons/lu"
import { useIntl } from "@/hooks/utils"

// 动态导入 Lightbox 组件以减少初始包大小
// Lightbox 只在用户点击图片时才需要加载
const ImageLightbox = dynamic(
  () =>
    import("../ImageLightbox").then((mod) => ({
      default: mod.ImageLightbox,
    })),
  {
    ssr: false, // Lightbox 不需要服务端渲染
  },
)

/**
 * 为图片URL添加缩略图参数
 * @param {string} url - 原始URL
 * @param {string} size - 缩略图尺寸 (sm/md/lg)
 * @returns {string} 带缩略图参数的URL
 */
function addThumbnailParam(url, size) {
  if (!url) return url
  const separator = url.includes("?") ? "&" : "?"
  return `${url}${separator}thumb=${size}`
}

/**
 * FileRenderer - 文件预览组件
 *
 * 根据文件类型展示不同的预览界面
 * 支持图片、视频、音频和通用文件
 * 图片支持缩略图和 lightbox 查看
 *
 * @param {Object} props
 * @param {Object} props.content - 内容对象
 * @param {string} props.content.mimetype - MIME 类型
 * @param {string} props.content.url - 文件 URL
 * @param {string} props.content.filename - 文件名
 * @param {number} props.content.size - 文件大小
 * @param {boolean} [props.showDownload=true] - 是否显示下载按钮
 * @param {Function} [props.onDownload] - 下载回调
 *
 * @example
 * <FileRenderer content={fileContent} />
 */
export function FileRenderer({
  content,
  showDownload = true,
  onDownload,
  ...props
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const { mimetype, url, filename, size } = content
  const renderFile = () => {
    const isImage = mimetype?.startsWith("image/")
    const isVideo = mimetype?.startsWith("video/")
    const isAudio = mimetype?.startsWith("audio/")

    // 图片预览
    if (isImage) {
      // 使用中等尺寸缩略图作为预览
      const thumbnailUrl = addThumbnailParam(url, "md")

      return (
        <>
          <Box w="full" {...props}>
            <Image
              src={thumbnailUrl}
              alt={filename || "Image"}
              w="full"
              h="auto"
              maxH="400px"
              objectFit="contain"
              cursor="pointer"
              onClick={() => setLightboxOpen(true)}
              bg="gray.100"
              _dark={{ bg: "gray.800" }}
            />
            {showDownload && (
              <FileInfo
                filename={filename}
                size={size}
                mimetype={mimetype}
                url={url}
                onDownload={onDownload}
                showPreview={true}
              />
            )}
          </Box>

          {/* Lightbox for full-size image viewing - 动态加载 */}
          {lightboxOpen && (
            <ImageLightbox
              open={lightboxOpen}
              onClose={() => setLightboxOpen(false)}
              src={url}
              alt={filename || "Image"}
            />
          )}
        </>
      )
    }

    // 视频预览
    if (isVideo) {
      return (
        <Box w="full" {...props}>
          <Box as="video" controls w="full" maxH="400px" bg="black">
            <source src={url} type={mimetype} />
            Your browser does not support the video tag.
          </Box>
          {showDownload && (
            <FileInfo
              filename={filename}
              size={size}
              mimetype={mimetype}
              url={url}
              onDownload={onDownload}
              showPreview={true}
            />
          )}
        </Box>
      )
    }

    // 音频预览
    if (isAudio) {
      return (
        <Box w="full" {...props} py={3}>
          <Box as="audio" controls w="full">
            <source src={url} type={mimetype} />
            Your browser does not support the audio tag.
          </Box>
          {showDownload && (
            <FileInfo
              filename={filename}
              size={size}
              mimetype={mimetype}
              url={url}
              onDownload={onDownload}
              showPreview={true}
            />
          )}
        </Box>
      )
    }

    // 通用文件
    return (
      <FileInfo
        filename={filename}
        size={size}
        mimetype={mimetype}
        url={url}
        onDownload={onDownload}
        showIcon
        {...props}
      />
    )
  }
  return content ? (
    <Box bg="gray.100" _dark={{ bg: "gray.800" }}>
      {renderFile()}
    </Box>
  ) : null
}

/**
 * FileInfo - 文件信息组件
 * 内部组件,用于显示文件详细信息
 */
function FileInfo({
  filename,
  size,
  mimetype,
  url,
  onDownload,
  showIcon = false,
  showPreview = false,
}) {
  const { t } = useIntl()
  const getFileIcon = () => {
    if (mimetype?.startsWith("image/")) return <LuFileImage size={24} />
    if (mimetype?.startsWith("video/")) return <LuFileVideo size={24} />
    if (mimetype?.startsWith("audio/")) return <LuFileAudio size={24} />
    return <LuFile size={24} />
  }

  const handleDownload = () => {
    if (onDownload) {
      onDownload()
    } else {
      window.open(url, "_blank")
    }
  }

  return (
    <Box p={3} mt={showIcon ? 0 : 2}>
      <HStack justify="space-between" align="center">
        <HStack gap={3} flex={1} minW={0}>
          {showIcon && (
            <Box color="gray.500" _dark={{ color: "gray.400" }}>
              {getFileIcon()}
            </Box>
          )}
          <VStack gap={0} align="start" flex={1} minW={0}>
            <Text
              fontSize="sm"
              fontWeight="medium"
              noOfLines={1}
              wordBreak="break-all"
            >
              {filename || "Unknown file"}
            </Text>
            <HStack gap={2} fontSize="xs" color="gray.500">
              {size && (
                <Text>
                  <FormatByte value={size} />
                </Text>
              )}
              {mimetype && <Text>{mimetype}</Text>}
            </HStack>
          </VStack>
        </HStack>
        <Link
          onClick={handleDownload}
          color="orange.500"
          _hover={{ color: "orange.600" }}
          cursor="pointer"
          mr={!showPreview ? 5 : 0}
          flexShrink={0}
        >
          <HStack gap={1}>
            <LuDownload />
            <Text fontSize="sm">{t("common.download")}</Text>
          </HStack>
        </Link>
      </HStack>
    </Box>
  )
}
