import { Model } from "solidify.js"
import { Comment } from "./comment.mjs"
import { Content } from "./content.mjs"
import { Hashtag } from "./hashtag.mjs"
import { Node } from "./node.mjs"

export class Publication extends Model {
  // 定义模型对应的数据库表名
  static tableName = "publications"

  static get foreignKeyName() {
    return "publication_id"
  }

  // 定义模型的字段、类型和约束
  static fields = {
    id: {
      type: "increments",
      constraints: {
        primary: true,
      },
    },
    content_hash: {
      type: "string",
      constraints: {
        notNullable: true,
        references: "contents.content_hash",
      },
    },
    author_address: {
      type: "string",
      constraints: {
        notNullable: true,
        references: "nodes.address",
      },
    },
    signature: {
      type: "string",
      constraints: {
        nullable: true,
      },
    },
    comment_count: {
      type: "integer",
      constraints: {
        nullable: true,
        defaultsTo: 0,
      },
    },
    created_at: {
      type: "timestamp",
      timestamp: "insert",
    },
    updated_at: {
      type: "timestamp",
      timestamp: "update",
    },
    description: {
      type: "text",
      constraints: {
        nullable: true,
      },
    },
  }

  // 定义关联关系
  static get relations() {
    return {
      author: Publication.belongsTo(Node, { foreignKey: "author_address" }),
      content: Publication.belongsTo(Content, { foreignKey: "content_hash" }),
      comments: Publication.hasMany(Comment, { localKey: "id" }),
      hashtags: Publication.manyToMany(Hashtag, {
        throughTable: "publication2hashtag",
      }),
    }
  }

  // 更新评论计数
  static async updateCommentCount(publicationId) {
    const count = await Comment.query()
      .where("publication_id", publicationId)
      .where("status", "CONFIRMED")
      .resultSize()

    await Publication.query()
      .findById(publicationId)
      .patch({ comment_count: count })

    return count
  }

  get statementOfSource() {
    return Publication.createStatementOfSource(
      this.content_hash,
      this.author_address,
      Math.floor(new Date(this.created_at).getTime() / 1000),
    )
  }

  static createStatementOfSource(contentHash, publisherAddress, timestamp) {
    return {
      domain: {
        name: "epress world",
        version: "1",
        chainId: 1,
      },
      primaryType: "StatementOfSource",
      types: {
        EIP712Domain: [
          { name: "name", type: "string" },
          { name: "version", type: "string" },
          { name: "chainId", type: "uint256" },
        ],
        StatementOfSource: [
          { name: "contentHash", type: "bytes32" },
          { name: "publisherAddress", type: "address" },
          { name: "timestamp", type: "uint64" },
        ],
      },
      message: {
        contentHash,
        publisherAddress,
        timestamp,
      },
    }
  }

  /**
   * 处理hashtags - 从内容和描述中提取并关联（优化版）
   * 使用 delete all + insert all 策略，比逐个对比更高效
   * @param {Object} trx - 事务对象（可选）
   * @returns {Promise<void>}
   */
  async processHashtags(trx = null) {
    // 确保已加载content
    if (!this.content) {
      await this.$fetchGraph("content", { transaction: trx })
    }

    const textSource =
      this.content?.type === "POST" ? this.content.body : this.description

    const tags = Hashtag.extractHashtags(textSource)

    await this.$relatedQuery("hashtags", trx).unrelate()

    // 查找或创建所有hashtags
    const hashtagInstances = await Promise.all(
      tags.map((tag) => Hashtag.findOrCreate(tag, trx)),
    )
    await Promise.all(
      hashtagInstances.map((h) =>
        this.$relatedQuery("hashtags", trx).relate(h.id),
      ),
    )
  }

  /**
   * 在插入后自动处理hashtags
   */
  async $afterInsert(queryContext) {
    await super.$afterInsert(queryContext)
    await this.processHashtags(queryContext.transaction)
  }

  /**
   * 在更新后自动处理hashtags
   */
  async $afterUpdate(opt, queryContext) {
    const result = await super.$afterUpdate(opt, queryContext)

    // 只有在内容或描述发生变化时才重新处理hashtags
    if (
      opt.old &&
      (opt.old.content_hash !== this.content_hash ||
        opt.old.description !== this.description)
    ) {
      await this.processHashtags(queryContext.transaction)
    }
    return result
  }

  /**
   * 在删除后清理hashtags
   */
  async $afterDelete(queryContext) {
    const result = await super.$afterDelete(queryContext)
    await this.$relatedQuery("hashtags").unrelate()
    return result
  }
}
