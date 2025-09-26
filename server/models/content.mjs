import path from "node:path"
import fs from "fs-extra"
import { Model } from "swiftify"
import { hash } from "../utils/crypto.mjs"
import { Publication } from "./publication.mjs"
// 移除日志导入 - Model 层不记录日志

export class Content extends Model {
  static idColumn = "content_hash"
  static tableName = "contents"

  static fields = {
    content_hash: {
      type: "string",
      constraints: {
        primary: true,
      },
    },
    type: {
      type: "string",
      constraints: {
        notNullable: true,
      },
    },
    body: {
      type: "text",
      constraints: {
        nullable: true,
      },
    },
    filename: {
      type: "string",
      constraints: {
        nullable: true,
      },
    },
    mimetype: {
      type: "string",
      constraints: {
        nullable: true,
      },
    },
    size: {
      type: "bigInteger",
      constraints: {
        nullable: true,
      },
    },
    local_path: {
      type: "string",
      constraints: {
        nullable: true,
      },
    },
    created_at: {
      type: "timestamp",
      timestamp: "insert",
    },
  }

  static get relations() {
    return {
      publications: Content.hasMany(Publication, {
        foreignKey: "content_hash",
      }),
    }
  }

  static async create(input) {
    if (typeof input !== "object" || input === null) {
      const error = new Error(
        "Content.create expects an object with type, optional body, and optional file.",
      )
      error.code = "VALIDATION_FAILED"
      throw error
    }

    const { body, file } = input
    const type = input?.type?.toUpperCase()

    if (!type) {
      const error = new Error("Content type is required.")
      error.code = "VALIDATION_FAILED"
      throw error
    }

    if (!["POST", "FILE"].includes(type)) {
      const error = new Error("Invalid content type. Must be 'post' or 'file'.")
      error.code = "VALIDATION_FAILED"
      throw error
    }

    if (type === "POST") {
      if (!body) {
        const error = new Error("Post type requires a body.")
        error.code = "VALIDATION_FAILED"
        throw error
      }
      const contentHash = await hash.sha256(body)
      const contentRecord = {
        type,
        content_hash: `0x${contentHash}`,
        mimetype: "text/markdown",
        body,
        size: Buffer.byteLength(body, "utf8"),
      }

      // 检查是否已存在相同内容哈希的记录
      const existingContent = await Content.query().findOne({
        content_hash: contentRecord.content_hash,
      })

      if (existingContent) {
        return existingContent
      }

      return Content.query().insert(contentRecord)
    } else {
      if (!file) {
        const error = new Error("File type requires a file.")
        error.code = "VALIDATION_FAILED"
        throw error
      }

      const { filename, createReadStream, mimetype } = await file

      const sourceStream = createReadStream()

      const chunks = []

      // biome-ignore lint: totalSize used
      let totalSize = 0

      const fileBuffer = await new Promise((resolve, reject) => {
        sourceStream.on("data", (chunk) => {
          chunks.push(chunk)
          totalSize += chunk.length
        })

        sourceStream.on("end", () => {
          const buffer = Buffer.concat(chunks)
          resolve(buffer)
        })

        sourceStream.on("error", (err) => {
          reject(err)
        })

        // 添加超时处理
        const timeoutMs = process.env.NODE_ENV === "test" ? 5000 : 30000
        const timeoutId = setTimeout(() => {
          reject(new Error("File read timeout"))
        }, timeoutMs)

        // 在流结束时清理定时器
        sourceStream.on("end", () => {
          clearTimeout(timeoutId)
        })

        sourceStream.on("error", () => {
          clearTimeout(timeoutId)
        })
      })

      // 计算哈希
      const contentHash = await hash.sha256(fileBuffer)

      // 创建本地路径和目录
      const localPath = `${contentHash.substring(0, 2)}/${contentHash}`
      const uploadDir = path.join(process.cwd(), "data", "uploads", localPath)
      await fs.ensureDir(uploadDir)

      // 写入文件
      const filePath = path.join(uploadDir, contentHash)

      await fs.writeFile(filePath, fileBuffer)

      const contentRecord = {
        type,
        content_hash: `0x${contentHash}`,
        filename,
        mimetype,
        size: fileBuffer.length, // 使用实际的文件大小
        local_path: `${localPath}/${contentHash}`,
      }

      // 检查是否已存在相同内容哈希的记录
      const existingContent = await Content.query().findOne({
        content_hash: contentRecord.content_hash,
      })

      if (existingContent) {
        return existingContent
      }

      const result = await Content.query().insert(contentRecord)
      return result
    }
  }

  /**
   * 清理孤立的Content记录（没有被Publication引用的记录）
   * @returns {Promise<{deletedCount: number, fileDeletedCount: number, totalProcessed: number}>}
   */
  static async cleanupOrphanedContents() {
    // 查找所有没有被Publication引用的Content记录
    // 使用LEFT JOIN + WHERE IS NULL来找到孤立的content_hash
    const orphanedContents = await Content.query()
      .select("contents.*")
      .leftJoin(
        "publications",
        "contents.content_hash",
        "publications.content_hash",
      )
      .whereNull("publications.content_hash")

    if (orphanedContents.length === 0) {
      return {
        deletedCount: 0,
        fileDeletedCount: 0,
        totalProcessed: 0,
      }
    }

    let deletedCount = 0
    let fileDeletedCount = 0
    const errors = [] // 收集错误信息，由上层处理

    for (const content of orphanedContents) {
      try {
        // 如果是文件类型，删除对应的物理文件
        if (content.type === "FILE" && content.local_path) {
          const filePath = path.join(
            process.cwd(),
            "data",
            "uploads",
            content.local_path,
          )

          try {
            // 检查文件是否存在
            if (await fs.pathExists(filePath)) {
              await fs.remove(filePath)
              fileDeletedCount++
            }

            // 尝试删除空的目录结构
            const dirPath = path.dirname(filePath)
            if (await fs.pathExists(dirPath)) {
              const files = await fs.readdir(dirPath)
              if (files.length === 0) {
                await fs.remove(dirPath)
              }
            }
          } catch (fileError) {
            // 收集文件删除错误，但不中断整个清理过程
            errors.push({
              type: "file_deletion",
              contentHash: content.content_hash,
              filePath: filePath,
              error: fileError.message,
            })
          }
        }

        // 删除Content记录
        await Content.query().deleteById(content.content_hash)
        deletedCount++
      } catch (error) {
        // 收集内容处理错误，但不中断整个清理过程
        errors.push({
          type: "content_deletion",
          contentHash: content.content_hash,
          error: error.message,
        })
      }
    }

    return {
      deletedCount,
      fileDeletedCount,
      totalProcessed: orphanedContents.length,
      errors, // 返回错误信息供上层处理
    }
  }
}
