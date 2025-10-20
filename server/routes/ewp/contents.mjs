import { createReadStream } from "node:fs"
import fs from "node:fs/promises"
import path from "node:path"
import sharp from "sharp"
import { Router } from "swiftify"
import { Content, Publication } from "../../models/index.mjs"

const router = new Router()

// 缩略图尺寸配置
const THUMBNAIL_SIZES = {
  sm: { maxHeight: 200, quality: 80 },
  md: { maxHeight: 400, quality: 85 },
  lg: { maxHeight: 800, quality: 90 },
}

/**
 * 生成缩略图
 * @param {string} originalPath - 原始文件路径
 * @param {string} thumbnailPath - 缩略图保存路径
 * @param {string} size - 缩略图尺寸 (sm/md/lg)
 * @param {string} mimetype - 文件MIME类型
 * @returns {Promise<void>}
 */
async function generateThumbnail(originalPath, thumbnailPath, size, mimetype) {
  const config = THUMBNAIL_SIZES[size]
  if (!config) {
    throw new Error(`Invalid thumbnail size: ${size}`)
  }

  // 确保缩略图目录存在
  await fs.mkdir(path.dirname(thumbnailPath), { recursive: true })

  // 使用 sharp 生成缩略图
  const transformer = sharp(originalPath).resize({
    height: config.maxHeight,
    fit: "inside",
    withoutEnlargement: true,
  })

  // 根据原始文件类型选择输出格式
  if (mimetype.startsWith("image/png")) {
    await transformer.png({ quality: config.quality }).toFile(thumbnailPath)
  } else if (mimetype.startsWith("image/webp")) {
    await transformer.webp({ quality: config.quality }).toFile(thumbnailPath)
  } else {
    // 默认使用 JPEG（适用于 JPEG、BMP 等格式）
    await transformer.jpeg({ quality: config.quality }).toFile(thumbnailPath)
  }
}

// 生成 Content-Disposition 头，兼容性最强
function makeContentDisposition(filename, type = "attachment") {
  if (!filename) {
    return `${type}`
  }

  // 确保是字符串
  const fname = String(filename)

  // ASCII 安全字符（RFC 定义的 token 范围）
  const asciiSafe = /^[\x20-\x7E]+$/.test(fname)

  // 如果是 ASCII 且不包含特殊符号，可以直接用 filename=
  if (asciiSafe && !/[\\"]/g.test(fname)) {
    return `${type}; filename="${fname}"`
  }

  // 否则用 fallback filename + filename*
  const fallback = fname.replace(/[^\x20-\x7E]/g, "_") // 把非 ASCII 替换成下划线
  const encoded = encodeURIComponent(fname)
    .replace(/['()]/g, escape)
    .replace(/\*/g, "%2A")

  return `${type}; filename="${fallback}"; filename*=UTF-8''${encoded}`
}

router.get("/contents/:content_hash", async (request, reply) => {
  try {
    const { content_hash } = request.params
    const { timestamp, thumb } = request.query

    const selfNode = await request.config.getSelfNode()

    let publicationQuery = Publication.query().where({
      content_hash,
      author_address: selfNode.address,
    })

    if (timestamp) {
      const unixTimestamp = parseInt(timestamp, 10)
      if (Number.isNaN(unixTimestamp)) {
        return reply.code(400).send({ error: "INVALID_TIMESTAMP" })
      }
      const startTime = new Date(unixTimestamp * 1000)
      const endTime = new Date((unixTimestamp + 1) * 1000)
      publicationQuery = publicationQuery
        .where("created_at", ">=", startTime)
        .where("created_at", "<", endTime)
        .first()
    } else {
      publicationQuery = publicationQuery.orderBy("created_at", "DESC").first()
    }

    const publication = await publicationQuery

    if (!publication) {
      return reply.code(404).send({ error: "PUBLICATION_NOT_FOUND" })
    }

    const content = await Content.query().findOne({
      content_hash: publication.content_hash,
    })

    if (!content) {
      return reply.code(404).send({ error: "CONTENT_NOT_FOUND" })
    }

    if (content.type === "POST") {
      // Markdown 内容
      reply
        .header("Content-Type", content.mimetype || "text/markdown")
        .send(content.body)
    } else if (content.type === "FILE") {
      if (!content.local_path) {
        request.log.error(
          `Content with hash ${content_hash} is type 'file' but has no local_path.`,
        )
        return reply.code(500).send({ error: "INTERNAL_ERROR" })
      }
      request.log.debug(request.headers, "Received headers")

      const uploadDir = path.join(process.cwd(), "data", "uploads")
      const fullLocalPath = path.join(uploadDir, content.local_path)

      // 检查是否请求缩略图
      const isImage = content.mimetype?.startsWith("image/")
      const isGif = content.mimetype?.startsWith("image/gif")

      // 验证缩略图尺寸参数（如果提供了thumb参数）
      if (thumb && isImage && !["sm", "md", "lg"].includes(thumb)) {
        return reply.code(400).send({ error: "INVALID_THUMBNAIL_SIZE" })
      }

      // GIF 格式不生成缩略图，保留动画效果
      const requestThumbnail =
        thumb && isImage && !isGif && THUMBNAIL_SIZES[thumb]

      let fileToServe = fullLocalPath
      let actualMimetype = content.mimetype || "application/octet-stream"

      // 如果请求缩略图且是图片类型
      if (requestThumbnail) {
        // 构建缩略图路径
        const thumbnailDir = path.join(
          process.cwd(),
          "data",
          "thumbnails",
          thumb,
        )
        const thumbnailPath = path.join(thumbnailDir, content.local_path)

        try {
          // 检查缩略图是否已存在
          await fs.access(thumbnailPath)
          fileToServe = thumbnailPath
          request.log.debug(
            { thumbnailPath, size: thumb },
            "Serving cached thumbnail",
          )
        } catch {
          // 缩略图不存在，生成新的
          try {
            request.log.info(
              { originalPath: fullLocalPath, thumbnailPath, size: thumb },
              "Generating thumbnail",
            )
            await generateThumbnail(
              fullLocalPath,
              thumbnailPath,
              thumb,
              content.mimetype,
            )
            fileToServe = thumbnailPath
            request.log.info(
              { thumbnailPath, size: thumb },
              "Thumbnail generated successfully",
            )
          } catch (thumbnailError) {
            // 如果生成缩略图失败，回退到原始文件
            request.log.error(
              { err: thumbnailError, originalPath: fullLocalPath },
              "Failed to generate thumbnail, falling back to original",
            )
            fileToServe = fullLocalPath
          }
        }

        // 根据缩略图格式设置正确的 MIME 类型
        // GIF 不会进入这里，因为 GIF 不生成缩略图
        if (fileToServe !== fullLocalPath) {
          if (content.mimetype.startsWith("image/png")) {
            actualMimetype = "image/png"
          } else if (content.mimetype.startsWith("image/webp")) {
            actualMimetype = "image/webp"
          } else {
            // 其他格式（JPEG、BMP等）转换为 JPEG
            actualMimetype = "image/jpeg"
          }
        }
      }

      try {
        const fileStat = await fs.stat(fileToServe)
        const fileSize = fileStat.size
        const lastModified = fileStat.mtime.toUTCString() // 获取文件的最后修改时间
        const safeFileName = content.filename || "download"
        const description = publication ? publication.description : ""

        // 设置通用响应头
        reply
          .header("Content-Type", actualMimetype)
          .header("Access-Control-Allow-Origin", "*")
          .header("Cache-Control", "public, max-age=3600")
          .header("Last-Modified", lastModified) // << 使用刚才获取的时间
          .header("Accept-Ranges", "bytes")
          .header(
            "Content-Disposition",
            makeContentDisposition(safeFileName, "inline"),
          )
          .header("Content-Description", encodeURIComponent(description || ""))

        const range = request.headers.range
        const ifRange = request.headers["if-range"]

        // 检查是否应该发送部分内容。条件是：
        // 1. 请求头中必须有 'range'。
        // 2. 同时，要么没有 'if-range' 头，要么 'if-range' 的值与文件的最后修改时间匹配。
        const shouldSendPartial =
          range && (!ifRange || ifRange === lastModified)

        if (shouldSendPartial) {
          // --- 处理 Range 请求 ---
          const parts = range.replace(/bytes=/, "").split("-")
          const start = parseInt(parts[0], 10)
          const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1

          if (start >= fileSize) {
            return reply
              .code(416)
              .header("Content-Range", `bytes */${fileSize}`)
              .send()
          }

          const chunksize = end - start + 1
          const fileStream = createReadStream(fileToServe, { start, end })

          return reply
            .code(206)
            .header("Content-Range", `bytes ${start}-${end}/${fileSize}`)
            .header("Content-Length", chunksize)
            .send(fileStream)
        } else {
          // --- 发送完整文件 ---
          // 发生在以下情况：
          // 1. 没有 'range' 请求头。
          // 2. 提供了 'if-range' 头，但与文件当前状态不匹配 (文件已更新)，需要发送完整的新文件。
          reply.header("Content-Length", fileSize)
          const fileStream = createReadStream(fileToServe)
          return reply.code(200).send(fileStream) // 明确指定 200 OK
        }
      } catch (fileReadError) {
        request.log.error(
          {
            err: fileReadError,
            contentHash: content_hash,
            filePath: fileToServe,
          },
          `Error reading file`,
        )
        if (fileReadError.code === "ENOENT") {
          return reply.code(404).send({ error: "CONTENT_NOT_FOUND" })
        }
        return reply.code(500).send({ error: "INTERNAL_ERROR" })
      }
    }
  } catch (error) {
    request.log.error(
      { err: error },
      "Error in /contents/:content_hash endpoint:",
    )
    reply.code(500).send({ error: "INTERNAL_ERROR" })
  }
})

export default router.plugin()
