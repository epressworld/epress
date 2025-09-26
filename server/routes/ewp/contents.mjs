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

    const authorAddress = process.env.EPRESS_NODE_ADDRESS

    let publicationQuery = Publication.query().where({
      content_hash,
      author_address: authorAddress,
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

      const uploadDir = path.join(process.cwd(), "data", "uploads")
      const fullLocalPath = path.join(uploadDir, content.local_path)

      try {
        const fileBuffer = await fs.readFile(fullLocalPath)

        const safeFileName = content.filename || "download"

        const description = publication ? publication.description : ""

        reply
          .header(
            "Content-Type",
            content.mimetype || "application/octet-stream",
          )
          .header("Content-Description", encodeURIComponent(description || ""))
          .header(
            "Content-Disposition",
            makeContentDisposition(safeFileName, "attachment"),
          )
          .send(fileBuffer)
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
    } else {
      request.log.error(
        `Content with hash ${content_hash} has unknown type: ${content.type}`,
      )
      return reply.code(500).send({ error: "INTERNAL_ERROR" })
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
