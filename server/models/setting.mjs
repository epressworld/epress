import { Model } from "swiftify"

export class Setting extends Model {
  // 定义模型对应的数据库表名
  static tableName = "settings"

  // 指定主键列名
  static idColumn = "key"

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

  /**
   * Get a single setting value by key
   * @param {string} key - Setting key
   * @param {string} defaultValue - Default value if setting not found
   * @returns {Promise<string|null>} Setting value or default
   */
  static async get(key, defaultValue = null) {
    try {
      const setting = await Setting.query().findById(key)
      return setting ? setting.value : defaultValue
    } catch (_error) {
      // If database not available or table doesn't exist, return default
      return defaultValue
    }
  }

  /**
   * Set a single setting value
   * @param {string} key - Setting key
   * @param {string} value - Setting value
   * @returns {Promise<boolean>} Success status
   */
  static async set(key, value) {
    try {
      // Check if setting exists
      const existing = await Setting.query().findById(key)

      if (existing) {
        // Update existing
        await Setting.query().patchAndFetchById(key, { value })
      } else {
        // Insert new
        await Setting.query().insert({ key, value })
      }

      return true
    } catch (error) {
      console.error("Setting.set error:", error)
      return false
    }
  }

  /**
   * Set multiple settings at once
   * @param {Object} settings - Object with key-value pairs
   * @returns {Promise<boolean>} Success status
   */
  static async setMany(settings) {
    try {
      for (const [key, value] of Object.entries(settings)) {
        await Setting.set(key, String(value))
      }
      return true
    } catch (error) {
      console.error("Setting.setMany error:", error)
      return false
    }
  }

  /**
   * Get all settings as an object
   * @returns {Promise<Object>} All settings as key-value pairs
   */
  static async getAll() {
    try {
      const settings = await Setting.query()
      const result = {}
      settings.forEach((setting) => {
        result[setting.key] = setting.value
      })
      return result
    } catch (_error) {
      return {}
    }
  }

  /**
   * Get multiple settings by keys
   * @param {string[]} keys - Array of setting keys
   * @returns {Promise<Object>} Settings as key-value pairs
   */
  static async getMany(keys) {
    try {
      const settings = await Setting.query().whereIn("key", keys)
      const result = {}
      settings.forEach((setting) => {
        result[setting.key] = setting.value
      })
      return result
    } catch (_error) {
      return {}
    }
  }
}
