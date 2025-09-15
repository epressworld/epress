// server/graphql/queries/settings.mjs
import { graphql, Model } from "swiftify"
import { Setting } from "../../models/setting.mjs"

// 定义 GraphQL Settings 对象类型
const SettingsType = graphql.type("ObjectType", {
  name: "Settings",
  fields: {
    enableRSS: { type: graphql.type("NonNull", graphql.type("Boolean")) },
    allowFollow: { type: graphql.type("NonNull", graphql.type("Boolean")) },
    allowComment: { type: graphql.type("NonNull", graphql.type("Boolean")) },
  },
})

// 定义 'settings' 查询的解析器
const settingsQuery = {
  settings: {
    type: SettingsType, // 使用新定义的 SettingsType
    resolve: async (_parent, _args, context) => {
      const { request } = context

      request.log.debug("Fetching settings")

      const settingsList = await Setting.query(Model.knex())
      const settings = {}

      // 设置默认值
      const defaults = {
        enableRSS: false,
        allowFollow: true,
        allowComment: true,
      }

      settingsList.forEach((setting) => {
        if (setting.key === "enable_rss") {
          settings.enableRSS = setting.value === "true"
        } else if (setting.key === "allow_follow") {
          settings.allowFollow = setting.value === "true"
        } else if (setting.key === "allow_comment") {
          settings.allowComment = setting.value === "true"
        }
      })

      // 合并默认值，确保所有必需字段都有值
      const result = { ...defaults, ...settings }

      request.log.debug(
        {
          settings_count: settingsList.length,
          final_settings: result,
        },
        "Settings fetched successfully",
      )

      return result
    },
  },
}

export { SettingsType, settingsQuery }
