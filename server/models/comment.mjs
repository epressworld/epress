import { Model } from "swiftify"
import { Node } from "./node.mjs"
import { Publication } from "./publication.mjs"

export class Comment extends Model {
  // 定义模型对应的数据库表名
  static tableName = "comments"

  // 定义模型的字段、类型和约束
  static fields = {
    id: {
      type: "increments",
      constraints: {
        primary: true,
      },
    },
    publication_id: {
      type: "integer",
      constraints: {
        notNullable: true,
        references: "publications.id",
      },
    },
    body: {
      type: "text",
      constraints: {
        notNullable: true,
      },
    },
    status: {
      type: "string",
      constraints: {
        notNullable: true,
      },
    },
    auth_type: {
      type: "string",
      constraints: {
        notNullable: true,
      },
    },
    author_name: {
      type: "string",
      constraints: {
        notNullable: true,
      },
    },
    author_id: {
      type: "string",
      constraints: {
        notNullable: true,
      },
    },
    credential: {
      type: "string",
      constraints: {
        nullable: true,
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
  }

  // 定义关联关系
  static get relations() {
    return {
      publication: Comment.belongsTo(Publication, {
        foreignKey: "publication_id",
      }),
      commenter: Comment.belongsTo(Node, {
        foreignKey: "author_id",
        uniqueKey: "address",
        filter: (query) => query.where("auth_type", "ETHEREUM"),
      }),
    }
  }

  // 隐藏敏感字段以保护用户隐私
  $formatJson(json) {
    const formatted = super.$formatJson(json)
    // 对于邮箱认证的评论，隐藏author_id字段以保护用户隐私
    if (formatted.auth_type === "EMAIL") {
      delete formatted.author_id
    }
    return formatted
  }
}
