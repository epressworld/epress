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
    commenter_username: {
      type: "string",
      constraints: {
        notNullable: true,
      },
    },
    commenter_email: {
      type: "string",
      constraints: {
        nullable: true,
      },
    },
    commenter_address: {
      type: "string",
      constraints: {
        nullable: true,
      },
    },
    signature: {
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
        foreignKey: "commenter_address",
        uniqueKey: "address",
      }),
    }
  }

  // 隐藏敏感字段以保护用户隐私
  $formatJson(json) {
    const formatted = super.$formatJson(json)
    // 移除敏感字段
    delete formatted.commenter_email
    return formatted
  }
}
