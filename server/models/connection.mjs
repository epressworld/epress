import { Model } from "swiftify"
import { Node } from "./node.mjs"

export class Connection extends Model {
  // 定义模型对应的数据库表名
  static tableName = "connections"

  // 定义模型的字段、类型和约束
  static fields = {
    id: {
      type: "increments",
      constraints: {
        primary: true,
      },
    },
    follower_address: {
      type: "string",
      constraints: {
        notNullable: true,
        references: "nodes.address", // 外键
      },
    },
    followee_address: {
      type: "string",
      constraints: {
        notNullable: true,
        references: "nodes.address", // 外键
      },
    },
    created_at: {
      type: "timestamp",
      timestamp: "insert",
    },
  }

  // 定义关联关系
  static get relations() {
    return {
      follower: Connection.belongsTo(Node, { foreignKey: "follower_address" }),
      followee: Connection.belongsTo(Node, { foreignKey: "followee_address" }),
    }
  }
}
