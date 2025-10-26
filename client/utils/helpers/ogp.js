import { PAGE_DATA } from "@/lib/apollo"
import { query } from "@/lib/apollo/client"

/**
 * 获取页面基础数据（profile 和 settings）
 * @returns {Promise<Object>} 包含 profile 和 settings 的对象
 */
export async function getPageData() {
  try {
    const { data } = await query({
      query: PAGE_DATA,
      fetchPolicy: "cache-first", // 使用缓存，因为 layout 已经查询过了
    })

    return {
      profile: data?.profile || {},
      settings: data?.settings || {},
      defaultLanguage: data?.settings?.defaultLanguage || "en",
    }
  } catch (error) {
    console.error("Error fetching page data:", error)
    return {
      profile: {},
      settings: {},
      defaultLanguage: "en",
    }
  }
}

/**
 * 从 Markdown 内容中提取纯文本
 * 使用 remark 和 strip-markdown 来移除 Markdown 语法
 * @param {string} markdown - Markdown 格式的内容
 * @param {number} maxLength - 最大长度，默认 200
 * @returns {Promise<string>} 纯文本内容
 */
export async function extractPlainText(markdown, maxLength = 200) {
  if (!markdown) return ""
  return `${markdown
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .substring(0, maxLength)
    .trim()}...`
}

/**
 * 从 Markdown 内容中提取第一张图片 URL
 * 使用 mdast-util-from-markdown 解析 AST
 * @param {string} markdown - Markdown 格式的内容
 * @returns {string|null} 图片 URL 或 null
 */
export function extractFirstImage(markdown) {
  if (!markdown) return null
  const imageRegex = /!\[.*?\]\((.*?)\)/
  const match = markdown.match(imageRegex)
  return match ? match[1] : null
}

/**
 * 根据文件 URL 或 MIME type 判断媒体类型
 * @param {string} mimeType - 可选的 MIME type
 * @returns {'image'|'video'|'audio'|null} 媒体类型
 */
export function getMediaType(mimeType = null) {
  // 优先使用 MIME type 判断
  if (mimeType.startsWith("image/")) return "image"
  if (mimeType.startsWith("video/")) return "video"
  if (mimeType.startsWith("audio/")) return "audio"
  return null
}

/**
 * 生成基础的 OGP metadata 结构
 * @param {Object} options - 配置选项
 * @param {string} options.title - 页面标题
 * @param {string} options.description - 页面描述
 * @param {string} options.url - 页面 URL
 * @param {string} options.locale - 语言代码
 * @param {string} options.type - OGP 类型 (website, article 等)
 * @returns {Object} Next.js metadata 对象
 */
export function generateBaseMetadata({
  title,
  description,
  url,
  locale = "en",
  type = "website",
}) {
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      locale,
      type,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  }
}

/**
 * 为 metadata 添加图片
 * @param {Object} metadata - 现有的 metadata 对象
 * @param {string|string[]} images - 图片 URL 或 URL 数组
 * @param {string} alt - 图片 alt 文本
 * @returns {Object} 更新后的 metadata 对象
 */
export function addImagesToMetadata(metadata, images, alt = "") {
  if (!images) return metadata

  const imageArray = Array.isArray(images) ? images : [images]
  const imageObjects = imageArray.map((url) => ({
    url,
    alt: alt || metadata.title,
  }))

  return {
    ...metadata,
    openGraph: {
      ...metadata.openGraph,
      images: imageObjects,
    },
    twitter: {
      ...metadata.twitter,
      card: "summary_large_image",
      images: imageArray,
    },
  }
}

/**
 * 为 metadata 添加视频
 * @param {Object} metadata - 现有的 metadata 对象
 * @param {string|string[]} videos - 视频 URL 或 URL 数组
 * @returns {Object} 更新后的 metadata 对象
 */
export function addVideosToMetadata(metadata, videos) {
  if (!videos) return metadata

  const videoArray = Array.isArray(videos) ? videos : [videos]
  const videoObjects = videoArray.map((url) => ({ url }))

  return {
    ...metadata,
    openGraph: {
      ...metadata.openGraph,
      videos: videoObjects,
    },
  }
}

/**
 * 为 metadata 添加音频
 * @param {Object} metadata - 现有的 metadata 对象
 * @param {string|string[]} audio - 音频 URL 或 URL 数组
 * @returns {Object} 更新后的 metadata 对象
 */
export function addAudioToMetadata(metadata, audio) {
  if (!audio) return metadata

  const audioArray = Array.isArray(audio) ? audio : [audio]
  const audioObjects = audioArray.map((url) => ({ url }))

  return {
    ...metadata,
    openGraph: {
      ...metadata.openGraph,
      audio: audioObjects,
    },
  }
}

/**
 * 获取完整的 URL
 * @param {string} baseUrl - 基础 URL (通常是 profile.url)
 * @param {string} path - 路径
 * @param {Object} searchParams - 查询参数对象
 * @returns {string} 完整 URL
 */
export function getFullUrl(baseUrl, path, searchParams = {}) {
  if (!baseUrl) {
    console.warn("Base URL is missing, using path only")
    return path
  }

  const url = new URL(path, baseUrl)

  Object.entries(searchParams).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value)
  })

  return url.toString()
}
