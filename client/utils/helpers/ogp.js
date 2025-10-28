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
      fetchPolicy: "cache-first",
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
 *
 * @param {string} markdown - Markdown 格式的内容
 * @param {number} maxLength - 最大长度，默认 200
 * @returns {Promise<string>} 纯文本内容
 */
export async function extractPlainText(markdown, maxLength = 200) {
  if (!markdown) return ""

  const plainText = markdown
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\n+/g, " ")
    .trim()

  if (!plainText) return ""

  const truncated = plainText.substring(0, maxLength).trim()
  return truncated.length < plainText.length ? `${truncated}...` : truncated
}

/**
 * 从 Markdown 内容中提取第一张图片 URL
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
  if (!mimeType) return null
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
 * @param {string} options.siteName - 网站名称
 * @returns {Object} Next.js metadata 对象
 */
export function generateBaseMetadata({
  title,
  description,
  url,
  locale = "en",
  type = "website",
  siteName = null,
}) {
  const finalDescription = description || title || "View content"

  const metadata = {
    title,
    description: finalDescription,
    openGraph: {
      title,
      description: finalDescription,
      url,
      locale,
      type,
      siteName: siteName || title,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: finalDescription,
    },
  }

  return metadata
}

/**
 * 为 metadata 添加图片
 * @param {Object} metadata - 现有的 metadata 对象
 * @param {string|string[]} images - 图片 URL 或 URL 数组
 * @param {string} alt - 图片 alt 文本
 * @param {number} width - 图片宽度 (推荐 1200)
 * @param {number} height - 图片高度 (推荐 630)
 * @returns {Object} 更新后的 metadata 对象
 */
export function addImagesToMetadata(
  metadata,
  images,
  alt = "",
  width = 1200,
  height = 630,
) {
  if (!images) return metadata

  const imageArray = Array.isArray(images) ? images : [images]

  const imageObjects = imageArray.map((url) => ({
    url,
    alt: alt || metadata.title || "Image",
    width,
    height,
    type: "image/jpeg",
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
 * @param {number} width - 视频宽度
 * @param {number} height - 视频高度
 * @returns {Object} 更新后的 metadata 对象
 */
export function addVideosToMetadata(
  metadata,
  videos,
  width = 1280,
  height = 720,
) {
  if (!videos) return metadata

  const videoArray = Array.isArray(videos) ? videos : [videos]
  const videoObjects = videoArray.map((url) => ({
    url,
    width,
    height,
    type: "video/mp4",
  }))

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
  const audioObjects = audioArray.map((url) => ({
    url,
    type: "audio/mpeg",
  }))

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

/**
 * 生成带头像的基础页面 metadata（用于列表页、连接页等）
 * @param {Object} options - 配置选项
 * @param {string} options.title - 页面标题（可选，默认使用 profile.title）
 * @param {string} options.description - 页面描述（可选，默认使用 profile.description）
 * @param {string} options.path - 页面路径
 * @param {Object} options.searchParams - URL 查询参数（可选）
 * @param {string} options.type - OGP 类型（可选，默认 "website"）
 * @param {string} options.fallbackTitle - 失败时的 fallback 标题
 * @param {string} options.fallbackDescription - 失败时的 fallback 描述
 * @returns {Promise<Object>} metadata 对象
 */
export async function generatePageMetadata({
  title = null,
  description = null,
  path,
  searchParams = {},
  type = "website",
  fallbackTitle = "Page",
  fallbackDescription = "View content",
}) {
  try {
    const { profile, defaultLanguage } = await getPageData()

    const finalTitle = title || profile.title || fallbackTitle
    const finalDescription =
      description || profile.description || fallbackDescription

    let metadata = generateBaseMetadata({
      title: finalTitle,
      description: finalDescription,
      url: getFullUrl(profile.url, path, searchParams),
      locale: defaultLanguage,
      type,
      siteName: profile.title,
    })

    const avatarUrl = `${profile.url}/ewp/avatar`
    metadata = addImagesToMetadata(
      metadata,
      avatarUrl,
      `${profile.title || "Node"} - Avatar`,
      400,
      400,
    )

    return metadata
  } catch (error) {
    console.error("Error generating page metadata:", error)
    return {
      title: fallbackTitle,
      description: fallbackDescription,
      openGraph: {
        title: fallbackTitle,
        description: fallbackDescription,
        type,
      },
      twitter: {
        card: "summary",
        title: fallbackTitle,
        description: fallbackDescription,
      },
    }
  }
}

/**
 * 生成 Publication 详情页 metadata
 * @param {Object} options - 配置选项
 * @param {Object} options.publication - publication 数据对象
 * @param {string} options.id - publication ID
 * @param {Object} options.profile - profile 数据对象
 * @param {string} options.defaultLanguage - 默认语言
 * @returns {Promise<Object>} metadata 对象
 */
export async function generatePublicationMetadata({
  publication,
  id,
  profile,
  defaultLanguage,
}) {
  const publicationType = publication.content?.type
  const avatar = `${profile.url}/ewp/avatar`
  const pageTitle = profile.title || "Publication"

  let metadata = generateBaseMetadata({
    title: pageTitle,
    description: "",
    url: getFullUrl(profile.url, `/publications/${id}`),
    locale: defaultLanguage,
    type: "article",
    siteName: profile.title,
  })

  if (publicationType === "POST") {
    // POST 类型：提取纯文本和第一张图片
    const description = await extractPlainText(publication.content?.body)
    const firstImage = extractFirstImage(publication.content?.body)
    const finalDescription =
      description || publication.description || `Post by ${profile.title}`

    metadata.description = finalDescription
    metadata.openGraph.description = finalDescription
    metadata.twitter.description = finalDescription

    if (firstImage) {
      metadata = addImagesToMetadata(metadata, firstImage, pageTitle, 1200, 630)
    } else {
      metadata = addImagesToMetadata(
        metadata,
        avatar,
        `${profile.title} - Avatar`,
        400,
        400,
      )
    }
  } else if (publicationType === "FILE") {
    // FILE 类型：根据媒体类型处理
    const mimeType = publication.content?.mimetype
    const mediaType = getMediaType(mimeType)
    const fileTypeLabel = mediaType
      ? mediaType.charAt(0).toUpperCase() + mediaType.slice(1)
      : "File"

    const description =
      publication.description || `${fileTypeLabel} shared by ${profile.title}`
    const contentHash = publication.content?.content_hash
    const fileUrl = contentHash
      ? `${publication.author?.url || profile.url}/ewp/contents/${contentHash}`
      : null

    metadata.description = description
    metadata.openGraph.description = description
    metadata.twitter.description = description

    if (mediaType === "image" && fileUrl) {
      metadata = addImagesToMetadata(
        metadata,
        `${fileUrl}?thumb=md`,
        pageTitle,
        1200,
        630,
      )
    } else if (mediaType === "video" && fileUrl) {
      metadata = addVideosToMetadata(metadata, fileUrl, 1280, 720)
      metadata = addImagesToMetadata(
        metadata,
        avatar,
        `${profile.title} - Avatar`,
        400,
        400,
      )
    } else if (mediaType === "audio" && fileUrl) {
      metadata = addAudioToMetadata(metadata, fileUrl)
      metadata = addImagesToMetadata(
        metadata,
        avatar,
        `${profile.title} - Avatar`,
        400,
        400,
      )
    } else {
      metadata = addImagesToMetadata(
        metadata,
        avatar,
        `${profile.title} - Avatar`,
        400,
        400,
      )
    }
  } else {
    // 未知类型：使用基础信息
    const description = publication.description || `Content by ${profile.title}`
    metadata.description = description
    metadata.openGraph.description = description
    metadata.twitter.description = description
    metadata = addImagesToMetadata(
      metadata,
      avatar,
      `${profile.title} - Avatar`,
      400,
      400,
    )
  }

  return metadata
}
