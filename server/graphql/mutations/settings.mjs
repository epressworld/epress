import mercurius from "mercurius"
import { graphql, Model } from "swiftify"
import { Setting } from "../../models/index.mjs" // 导入 Setting 模型
import { SettingsType } from "../queries/settings.mjs" // 导入 SettingsType

const { ErrorWithProps } = mercurius

// 定义 UpdateSettingsInput 输入类型 (与之前相同)
const UpdateSettingsInput = graphql.type("InputObjectType", {
  name: "UpdateSettingsInput",
  fields: {
    enableRSS: { type: graphql.type("Boolean") },
    allowFollow: { type: graphql.type("Boolean") },
    allowComment: { type: graphql.type("Boolean") },
  },
})

// 定义 updateSettings 变更
const updateSettingsMutation = {
  updateSettings: {
    type: graphql.type("NonNull", SettingsType), // 返回 Settings 对象
    args: {
      input: { type: graphql.type("NonNull", UpdateSettingsInput) },
    },
    resolve: async (_parent, { input }, context) => {
      const { request } = context

      request.log.debug(
        {
          user: context.user?.sub,
          settings: Object.keys(input).filter(
            (key) => input[key] !== undefined,
          ),
        },
        "Updating settings",
      )

      // 认证检查: 只有认证过的用户（节点所有者）才能更新设置
      if (!context.user) {
        throw new ErrorWithProps("Unauthorized: Authentication required.", {
          code: "UNAUTHENTICATED",
        })
      }

      // 使用 Knex 事务确保多条设置更新的原子性
      const updatedSettingsData = await Model.knex().transaction(
        async (trx) => {
          const settingsToReturn = {} // 用于构建最终返回的设置对象

          // 键名映射：GraphQL字段名 -> 数据库键名
          const keyMapping = {
            enableRSS: "enable_rss",
            allowFollow: "allow_follow",
            allowComment: "allow_comment",
          }

          for (const graphqlKey in input) {
            if (Object.hasOwn(input, graphqlKey)) {
              const dbKey = keyMapping[graphqlKey] || graphqlKey
              let valueToStore = input[graphqlKey]

              // 处理类型转换以便存储
              if (typeof valueToStore === "boolean") {
                valueToStore = valueToStore.toString() // 布尔值存储为 'true'/'false' 字符串
              }

              // 检查设置项是否存在
              const existingSetting = await Setting.query(trx)
                .where({ key: dbKey })
                .first()

              if (existingSetting) {
                // 如果存在，则更新
                await Setting.query(trx)
                  .where({ key: dbKey })
                  .update({ value: valueToStore })
              } else {
                // 如果不存在，则插入
                await Setting.query(trx).insert({
                  key: dbKey,
                  value: valueToStore,
                })
              }
            }
          }

          // 所有更新完成后，从数据库中获取最新的设置并返回
          // 确保在同一个事务中查询，以获取最新数据
          const settingsList = await Setting.query(trx)

          // 设置默认值
          const defaults = {
            enableRSS: false,
            allowFollow: true,
            allowComment: true,
          }

          settingsList.forEach((setting) => {
            if (setting.key === "enable_rss") {
              settingsToReturn.enableRSS = setting.value === "true"
            } else if (setting.key === "allow_follow") {
              settingsToReturn.allowFollow = setting.value === "true"
            } else if (setting.key === "allow_comment") {
              settingsToReturn.allowComment = setting.value === "true"
            }
          })

          // 合并默认值，确保所有必需字段都有值
          return { ...defaults, ...settingsToReturn }
        },
      )

      request.log.info(
        {
          user: context.user.sub,
          updated_settings: Object.keys(input).filter(
            (key) => input[key] !== undefined,
          ),
          final_settings: updatedSettingsData,
        },
        "Settings updated successfully",
      )

      return updatedSettingsData
    },
  },
}

export { updateSettingsMutation }
