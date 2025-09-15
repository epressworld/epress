import { Model } from "swiftify"

export class Setting extends Model {
  // 定义模型对应的数据库表名
  static tableName = "settings"

  // 定义模型的字段、类型和约束
  static fields = {
    key: {
      type: "string",
      constraints: {
        primary: true, // 设为主键
      },
    },
    value: {
      type: "text",
    },
  }
}
