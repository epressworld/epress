import { Model } from "solidify.js"
import { Node } from "./node.mjs"
import { Publication } from "./publication.mjs"

export class Comment extends Model {
  static tableName = "comments"

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
    author_name: {
      type: "string",
      constraints: {
        notNullable: true,
      },
    },
    author_address: {
      type: "string",
      constraints: {
        notNullable: true,
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

  static get relations() {
    return {
      publication: Comment.belongsTo(Publication, {
        foreignKey: "publication_id",
      }),
      commenter: Comment.belongsTo(Node, {
        foreignKey: "author_address",
        uniqueKey: "address",
      }),
    }
  }

  $formatJson(json) {
    const formatted = super.$formatJson(json)
    return formatted
  }
}
