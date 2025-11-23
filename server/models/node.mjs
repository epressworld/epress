import { Readable } from "node:stream"
import { buffer } from "node:stream/consumers"
import { Model } from "solidify.js"
import { verifyTypedData } from "viem"
import { hash } from "../utils/crypto.mjs"
import { extractFileNameFromContentDisposition } from "../utils/helper.mjs"
import { Connection } from "./connection.mjs"
import { Content } from "./content.mjs"
import { Publication } from "./publication.mjs"

export class Node extends Model {
  // 定义模型对应的数据库表名
  static tableName = "nodes"

  // 指定主键字段
  static idColumn = "address"

  // 定义模型的字段、类型和约束
  static fields = {
    address: {
      type: "string",
      constraints: {
        primary: true,
        notNullable: true,
        unique: true,
      },
    },
    url: {
      type: "string",
      constraints: {
        notNullable: true,
        unique: true,
      },
    },
    title: {
      type: "string",
      constraints: {
        notNullable: true,
      },
    },
    description: {
      type: "string",
    },
    is_self: {
      type: "boolean",
      constraints: {
        notNullable: true,
        defaultsTo: false,
      },
    },
    created_at: {
      type: "timestamp",
      timestamp: "insert", // 在插入时自动设置为当前时间
    },
    updated_at: {
      type: "timestamp",
      timestamp: "update", // 在更新时自动设置为当前时间
    },
  }

  static get relations() {
    return {
      // 一个 Node 作为作者，有多个 Publication
      publications: Node.hasMany(Publication, { foreignKey: "author_address" }),
      // 一个 Node 作为关注者，有多个 Connection
      following: Node.hasMany(Connection, { foreignKey: "followee_address" }),
      // 一个 Node 作为被关注者，有多个 Connection
      followers: Node.hasMany(Connection, { foreignKey: "follower_address" }),
    }
  }

  /**
   * Get the self-node (the node representing this ePress instance)
   * @returns {Promise<Node|null>} Self-node or null if not found
   */
  static async getSelf() {
    try {
      return await Node.query().findOne({ is_self: true })
    } catch (_error) {
      // If database not available or table doesn't exist, return null
      return null
    }
  }

  /**
   * Check if the system is installed (self-node exists)
   * @returns {Promise<boolean>} True if installed, false otherwise
   */
  static async isInstalled() {
    try {
      const selfNode = await Node.getSelf()
      return !!selfNode
    } catch (_error) {
      return false
    }
  }

  get sync() {
    return {
      /**
       * 同步节点的 profile 信息
       * @param {Date} remoteUpdatedAt - 远程节点的 updated_at 时间戳（ISO 字符串或 Date 对象）
       * @returns {Promise<Object>} 同步结果
       */
      profile: async (remoteUpdatedAt) => {
        if (remoteUpdatedAt > new Date(this.updated_at)) {
          try {
            const response = await fetch(`${this.url}/ewp/profile`)
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`)
            }
            const updatedProfile = await response.json()
            if (
              new Date(updatedProfile.updated_at) > new Date(this.updated_at)
            ) {
              // 更新节点信息到数据库
              await this.$query().patch({
                url: updatedProfile.url,
                title: updatedProfile.title,
                description: updatedProfile.description,
                updated_at: remoteUpdatedAt,
              })

              return {
                success: true,
                nodeAddress: this.address,
                oldUpdatedAt: this.updated_at,
                newUpdatedAt: remoteUpdatedAt,
                syncedData: {
                  url: updatedProfile.url,
                  title: updatedProfile.title,
                  description: updatedProfile.description,
                },
              }
            }
          } catch (err) {
            // 重新抛出错误供上层处理，但添加更多上下文
            const error = new Error(
              `Profile sync failed for node ${this.address}: ${err.message}`,
            )
            error.originalError = err
            error.nodeAddress = this.address
            error.remoteUpdatedAt = remoteUpdatedAt
            error.localUpdatedAt = this.updated_at
            throw error
          }
        } else {
          return {
            success: true,
            nodeAddress: this.address,
            localUpdatedAt: this.updated_at,
            remoteUpdatedAt: remoteUpdatedAt,
            skipped: true,
            reason: "Remote updated_at is not newer than local updated_at",
          }
        }
      },

      /**
       * 同步单个内容到本地
       * @param {Object} typedData - EIP-712 类型化数据
       * @param {string} typedData.domain - 签名域
       * @param {Object} typedData.types - 类型定义
       * @param {string} typedData.primaryType - 主类型
       * @param {Object} typedData.message - 消息内容
       * @param {string} signature - 内容签名（必选）
       * @param {Object} options - 同步选项
       * @param {number} options.timeout - 请求超时时间（毫秒），默认 30000
       * @returns {Promise<Object>} 同步结果
       */
      publication: async (typedData, signature, options = {}) => {
        const { timeout = 30000, slug: jsonSlug } = options

        const result = {
          success: false,
          contentHash: typedData.message.contentHash,
          nodeAddress: this.address,
          nodeUrl: this.url,
          synced: false,
          skipped: false,
          error: null,
        }

        try {
          const startTime = new Date(typedData.message.timestamp * 1000)
          const endTime = new Date((typedData.message.timestamp + 1) * 1000)

          // 检查是否已存在
          const existingPub = await Publication.query()
            .where({
              content_hash: typedData.message.contentHash,
              author_address: this.address,
            })
            .where("created_at", ">=", startTime)
            .where("created_at", "<", endTime)
            .first()

          if (existingPub) {
            result.skipped = true
            result.success = true
            return result
          }

          if (!signature) {
            // 验证签名（必选）
            throw new Error(
              `Signature is required for content ${typedData.message.contentHash}`,
            )
          }

          // 验证签名
          const isValid = await verifyTypedData({
            address: typedData.message.publisherAddress,
            domain: typedData.domain,
            types: typedData.types,
            primaryType: typedData.primaryType,
            message: typedData.message,
            signature: signature,
          })

          if (!isValid) {
            throw new Error(
              `Invalid signature for content ${typedData.message.contentHash}`,
            )
          }

          if (
            typedData.message.publisherAddress.toLowerCase() !==
            this.address.toLowerCase()
          ) {
            // 验证签名中的地址是否是被同步节点的地址
            throw new Error(
              `Signature address mismatch for content ${typedData.message.contentHash}`,
            )
          }

          // 时间戳用于时间线排序，不需要时间窗口检查
          // 安全性由签名验证、地址验证和内容哈希验证保证

          // 获取内容详情
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), timeout)

          let contentResponse
          try {
            contentResponse = await fetch(
              `${this.url}/ewp/contents/${typedData.message.contentHash}?timestamp=${typedData.message.timestamp}`,
              {
                signal: controller.signal,
                headers: {
                  Accept: "*/*",
                  "User-Agent": "ePress-Sync/1.0",
                },
              },
            )
          } finally {
            clearTimeout(timeoutId)
          }

          if (!contentResponse.ok) {
            throw new Error(
              `Failed to fetch content ${typedData.message.contentHash}: HTTP ${contentResponse.status}`,
            )
          }

          // 处理内容，参考 replications.mjs 的做法
          const fetchedContentType =
            contentResponse.headers.get("content-type") ||
            "application/octet-stream"
          const contentDescription = decodeURIComponent(
            contentResponse.headers.get("content-description") || "",
          )
          // 从 Link header 提取 slug
          let extractedSlug = null
          const linkHeader = contentResponse.headers.get("link")
          if (linkHeader) {
            // 解析 Link header: <URI>; rel="canonical"
            const canonicalMatch = linkHeader.match(
              /<([^>]+)>;\s*rel=["']canonical["']/i,
            )
            if (canonicalMatch) {
              const canonicalUrl = canonicalMatch[1]
              // 提取 /slug/{slug} 中的 slug
              const slugMatch = canonicalUrl.match(/\/slug\/([^/]+)$/)
              if (slugMatch) {
                extractedSlug = slugMatch[1]
              }
            }
          }
          // 如果 Link header 中没有 slug，使用从 JSON 传入的 slug
          if (!extractedSlug && jsonSlug) {
            extractedSlug = jsonSlug
          }
          const isTextContent = fetchedContentType === "text/markdown"

          if (isTextContent) {
            // 如果是文本内容，直接读取并传递给 Content.create
            const textContent = await contentResponse.text()

            // 验证内容哈希是否匹配
            const calculatedHash = await hash.sha256(textContent)
            if (`0x${calculatedHash}` !== typedData.message.contentHash) {
              throw new Error(
                `Content hash mismatch for ${typedData.message.contentHash}`,
              )
            }

            await Content.create({
              type: "post",
              body: textContent,
            })
          } else {
            // 如果是二进制文件，创建模拟的文件对象传递给 Content.create
            let fileName = `${typedData.message.contentHash.substring(2)}`

            // 提取 Content-Disposition 头
            const contentDisposition = contentResponse.headers.get(
              "Content-Disposition",
            )
            if (contentDisposition) {
              // 使用正则表达式解析文件名
              fileName =
                extractFileNameFromContentDisposition(contentDisposition)
            }

            // 将 ReadableStream 转换为 Buffer
            const fileBuffer = await buffer(Readable.from(contentResponse.body))

            // 验证内容哈希是否匹配
            const calculatedHash = await hash.sha256(fileBuffer)
            if (`0x${calculatedHash}` !== typedData.message.contentHash) {
              throw new Error(
                `Content hash mismatch for ${typedData.message.contentHash}`,
              )
            }

            if (!contentDescription) {
              throw new Error(
                `Content description missing for ${typedData.message.contentHash}`,
              )
            }

            const mockFile = {
              filename: fileName,
              mimetype: fetchedContentType,
              createReadStream: () => {
                const stream = new Readable()
                stream.push(fileBuffer)
                stream.push(null)
                return stream
              },
            }
            await Content.create({
              type: "file",
              file: mockFile,
            })
          }

          // 保存 publication 到数据库，使用 typedData 中的时间戳作为 created_at
          await Publication.query().insert({
            content_hash: typedData.message.contentHash,
            author_address: this.address,
            signature: signature,
            comment_count: 0, // 同步时不包含评论计数
            created_at: new Date(
              typedData.message.timestamp * 1000,
            ).toISOString(),
            description: contentDescription, // Add description for FILE type
            slug: extractedSlug, // 从 Link header 提取的 slug
          })

          result.synced = true
          result.success = true
          return result
        } catch (err) {
          result.error = err.message
          result.success = false
          return result
        }
      },

      /**
       * 同步节点的内容数据
       * @param {string|Date} since - 同步起始时间，ISO 字符串或 Date 对象
       * @param {Object} options - 同步选项
       * @param {number} options.limit - 每页数量，默认 100
       * @param {number} options.maxPages - 最大页数，默认 10
       * @param {number} options.timeout - 请求超时时间（毫秒），默认 30000
       * @returns {Promise<Object>} 同步结果
       */
      publications: async (since, options = {}) => {
        const { limit = 100, maxPages = 10, timeout = 30000 } = options

        const results = {
          success: true,
          nodeAddress: this.address,
          nodeUrl: this.url,
          since: since,
          syncedPublications: 0,
          syncedContents: 0,
          skippedPublications: 0,
          errors: [],
          pages: 0,
          startTime: new Date(),
          endTime: null,
        }

        try {
          // 转换 since 参数为 ISO 字符串
          const sinceParam = since instanceof Date ? since.toISOString() : since

          let currentPage = 1
          let hasNextPage = true

          while (hasNextPage && currentPage <= maxPages) {
            try {
              // 构建请求 URL
              const url = new URL(`${this.url}/ewp/publications`)
              url.searchParams.set("since", sinceParam)
              url.searchParams.set("limit", limit.toString())
              url.searchParams.set("page", currentPage.toString())

              // 发送请求
              const controller = new AbortController()
              const timeoutId = setTimeout(() => controller.abort(), timeout)

              let response
              try {
                response = await fetch(url.toString(), {
                  signal: controller.signal,
                  headers: {
                    Accept: "application/json",
                    "User-Agent": "ePress-Sync/1.0",
                  },
                })
              } finally {
                clearTimeout(timeoutId)
              }

              if (!response.ok) {
                throw new Error(
                  `HTTP ${response.status}: ${response.statusText}`,
                )
              }

              const data = await response.json()
              const { data: publications, pagination } = data

              // 处理当前页的 publications
              for (const pub of publications) {
                try {
                  // 检查是否有签名，没有签名的内容直接跳过
                  if (!pub.signature) {
                    results.errors.push({
                      type: "publication",
                      content_hash: pub.content_hash,
                      error: "Signature is required but not provided",
                    })
                    continue
                  }

                  // 使用 syncPublication 方法同步单个内容
                  const syncResult = await this.sync.publication(
                    Publication.createStatementOfSource(
                      pub.content_hash,
                      pub.author_address,
                      Math.floor(new Date(pub.created_at).getTime() / 1000),
                    ),
                    pub.signature,
                    { timeout, slug: pub.slug },
                  )

                  if (syncResult.success) {
                    if (syncResult.synced) {
                      results.syncedPublications++
                      results.syncedContents++
                    } else if (syncResult.skipped) {
                      results.skippedPublications++
                    }
                  } else {
                    results.errors.push({
                      type: "publication",
                      content_hash: pub.content_hash,
                      error: syncResult.error,
                    })
                  }
                } catch (err) {
                  results.errors.push({
                    type: "publication",
                    content_hash: pub.content_hash,
                    error: err.message,
                  })
                }
              }

              // 检查是否还有下一页
              hasNextPage = pagination.hasNextPage
              currentPage++
              results.pages++
            } catch (err) {
              results.errors.push({
                type: "page",
                page: currentPage,
                error: err.message,
              })
              break
            }
          }

          results.endTime = new Date()
          results.duration = results.endTime - results.startTime

          // 如果有错误，标记为部分成功
          if (results.errors.length > 0) {
            results.partialSuccess = true
            // 只有在没有任何成功同步的情况下才标记为完全失败
            if (
              results.syncedPublications === 0 &&
              results.syncedContents === 0
            ) {
              results.success = false
            }
          }

          return results
        } catch (err) {
          results.success = false
          results.endTime = new Date()
          results.duration = results.endTime - results.startTime
          results.errors.push({
            type: "sync",
            error: err.message,
          })

          // 重新抛出错误供上层处理
          const error = new Error(
            `Sync failed for node ${this.address}: ${err.message}`,
          )
          error.originalError = err
          error.nodeAddress = this.address
          error.syncResults = results
          throw error
        }
      },
    }
  }
}
