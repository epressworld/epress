import { Model } from "swiftify"
import { Comment } from "./comment.mjs"
import { Content } from "./content.mjs"
import { Node } from "./node.mjs"

export class Publication extends Model {
  // 定义模型对应的数据库表名
  static tableName = "publications"

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
        nullable: true, // 核心字段，区分本地与网络发布
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
      // 一个 Publication 可以有多个 Comment
      comments: Publication.hasMany(Comment, { localKey: "publication_id" }),
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
}
