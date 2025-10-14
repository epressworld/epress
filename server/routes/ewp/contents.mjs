import { createReadStream } from "node:fs"
import fs from "node:fs/promises"
import path from "node:path"
import { Router } from "swiftify"
import { Content, Publication } from "../../models/index.mjs"

const router = new Router()

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
    const { timestamp } = request.query

    const selfNode = await request.config.getSelfNode()
    if (!selfNode) {
      return reply.code(503).send({ error: "Node not configured" })
    }

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

      try {
        const fileStat = await fs.stat(fullLocalPath)
        const fileSize = fileStat.size
        const lastModified = fileStat.mtime.toUTCString() // 获取文件的最后修改时间
        const safeFileName = content.filename || "download"
        const description = publication ? publication.description : ""

        // 设置通用响应头
        reply
          .header(
            "Content-Type",
            content.mimetype || "application/octet-stream",
          )
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
          const fileStream = createReadStream(fullLocalPath, { start, end })

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
          const fileStream = createReadStream(fullLocalPath)
          return reply.code(200).send(fileStream) // 明确指定 200 OK
        }
      } catch (fileReadError) {
        request.log.error(
          {
            err: fileReadError,
            contentHash: content_hash,
            filePath: fullLocalPath,
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
