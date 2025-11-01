import { Model } from "swiftify"
import { Publication } from "./index.mjs"

export class Hashtag extends Model {
  // 定义模型对应的数据库表名
  static tableName = "hashtags"

  static get foreignKeyName() {
    return "hashtag_id"
  }

  // 定义模型的字段、类型和约束
  static fields = {
    id: {
      type: "increments",
      constraints: {
        primary: true,
      },
    },
    hashtag: {
      type: "string",
      constraints: {
        notNullable: true,
        unique: true,
      },
    },
    created_at: {
      type: "timestamp",
      timestamp: "insert",
    },
  }

  // 定义关联关系
  static get relations() {
    // 延迟导入避免循环依赖

    return {
      // 多对多关系：一个hashtag可以关联多个publications
      publications: Hashtag.manyToMany(Publication, {
        throughTable: "publication2hashtag",
      }),
    }
  }

  /**
   * 从文本中提取hashtags
   * @param {string} text - 要解析的文本
   * @returns {Array<string>} 提取的hashtag数组（去重、小写）
   */
  static extractHashtags(text) {
    if (!text || typeof text !== "string") return []

    // 匹配 #word 格式，支持字母、数字、下划线、中文、日文、韩文等
    // \p{L} 匹配任何语言的字母，\p{N} 匹配数字
    const hashtagRegex = /#([\p{L}\p{N}_-]+)/gu
    const matches = text.matchAll(hashtagRegex)

    const hashtags = new Set()
    for (const match of matches) {
      // 转为小写并去重
      hashtags.add(match[1].toLowerCase())
    }

    return Array.from(hashtags)
  }

  /**
   * 查找或创建hashtag
   * @param {string} hashtagText - hashtag文本（不含#号）
   * @param {Object} trx - 事务对象（可选）
   * @returns {Promise<Hashtag>} Hashtag实例
   */
  static async findOrCreate(hashtagText, trx = null) {
    const normalizedTag = hashtagText.toLowerCase()

    const query = trx ? Hashtag.query(trx) : Hashtag.query()

    // 先尝试查找
    let hashtag = await query.findOne({ hashtag: normalizedTag })

    if (!hashtag) {
      // 不存在则创建
      hashtag = await query.insert({ hashtag: normalizedTag })
    }

    return hashtag
  }
}
