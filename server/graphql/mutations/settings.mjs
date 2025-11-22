import mercurius from "mercurius"
import { graphql, Model } from "solidify.js"
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
    defaultLanguage: { type: graphql.type("String") },
    defaultTheme: { type: graphql.type("String") },
    walletConnectProjectId: { type: graphql.type("String") },
    mailTransport: { type: graphql.type("String") },
    mailFrom: { type: graphql.type("String") },
  },
})

// 定义 PushSubscription 输入类型
const PushSubscriptionInput = graphql.type("InputObjectType", {
  name: "PushSubscriptionInput",
  fields: {
    endpoint: { type: graphql.type("NonNull", graphql.type("String")) },
    keys: {
      type: graphql.type(
        "NonNull",
        graphql.type("InputObjectType", {
          name: "PushSubscriptionKeys",
          fields: {
            p256dh: { type: graphql.type("NonNull", graphql.type("String")) },
            auth: { type: graphql.type("NonNull", graphql.type("String")) },
          },
        }),
      ),
    },
  },
})

// 定义 SaveSubscriptionResult 返回类型
const SaveSubscriptionResult = graphql.type("ObjectType", {
  name: "SaveSubscriptionResult",
  fields: {
    success: { type: graphql.type("NonNull", graphql.type("Boolean")) },
    message: { type: graphql.type("String") },
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

      // 认证检查: 只有认证过的用户(节点所有者)才能更新设置
      if (!context.user) {
        throw new ErrorWithProps("Unauthorized: Authentication required.", {
          code: "UNAUTHENTICATED",
        })
      }

      // 使用 Knex 事务确保多条设置更新的原子性
      const updatedSettingsData = await Model.knex().transaction(
        async (trx) => {
          const settingsToReturn = {} // 用于构建最终返回的设置对象

          // 键名映射:GraphQL字段名 -> 数据库键名
          const keyMapping = {
            enableRSS: "enable_rss",
            allowFollow: "allow_follow",
            allowComment: "allow_comment",
            defaultLanguage: "default_language",
            defaultTheme: "default_theme",
            walletConnectProjectId: "walletconnect_projectid",
            mailTransport: "mail_transport",
            mailFrom: "mail_from",
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
                // 如果存在,则更新
                await Setting.query(trx)
                  .where({ key: dbKey })
                  .update({ value: valueToStore })
              } else {
                // 如果不存在,则插入
                await Setting.query(trx).insert({
                  key: dbKey,
                  value: valueToStore,
                })
              }
            }
          }

          // 所有更新完成后,从数据库中获取最新的设置并返回
          // 确保在同一个事务中查询,以获取最新数据
          const settingsList = await Setting.query(trx)

          // 设置默认值
          const defaults = {
            enableRSS: false,
            allowFollow: true,
            allowComment: true,
            defaultLanguage: "en",
            defaultTheme: "light",
            walletConnectProjectId: "",
            mailTransport: "",
            mailFrom: "",
          }

          settingsList.forEach((setting) => {
            if (setting.key === "enable_rss") {
              settingsToReturn.enableRSS = setting.value === "true"
            } else if (setting.key === "allow_follow") {
              settingsToReturn.allowFollow = setting.value === "true"
            } else if (setting.key === "allow_comment") {
              settingsToReturn.allowComment = setting.value === "true"
            } else if (setting.key === "walletconnect_projectid") {
              settingsToReturn.walletConnectProjectId = setting.value
            } else if (setting.key === "default_language") {
              settingsToReturn.defaultLanguage = setting.value
            } else if (setting.key === "default_theme") {
              settingsToReturn.defaultTheme = setting.value
            } else if (setting.key === "mail_transport") {
              settingsToReturn.mailTransport = setting.value
            } else if (setting.key === "mail_from") {
              settingsToReturn.mailFrom = setting.value
            }
          })

          // 合并默认值,确保所有必需字段都有值
          const mergedSettings = { ...defaults, ...settingsToReturn }

          // 检查邮件是否已配置
          const mailEnabled = !!(
            mergedSettings.mailTransport && mergedSettings.mailFrom
          )

          // 添加新的 mail 对象结构
          return {
            ...mergedSettings,
            mail: {
              enabled: mailEnabled,
              mailTransport: mergedSettings.mailTransport,
              mailFrom: mergedSettings.mailFrom,
            },
          }
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

// 定义 saveSubscription 变更
const notificationMutation = {
  subscribeNotification: {
    type: graphql.type("NonNull", SaveSubscriptionResult),
    args: {
      subscription: { type: graphql.type("NonNull", PushSubscriptionInput) },
    },
    resolve: async (_parent, { subscription }, context) => {
      const { request } = context

      request.log.debug(
        {
          user: context.user?.sub,
          endpoint: subscription.endpoint,
        },
        "Saving push subscription",
      )

      // 认证检查: 只有认证过的用户(节点所有者)才能保存订阅
      if (!context.user) {
        throw new ErrorWithProps("Unauthorized: Authentication required.", {
          code: "UNAUTHENTICATED",
        })
      }

      try {
        // 获取现有的订阅列表
        const subscriptions = await Setting.get("notification_subscriptions")
        // 检查是否已存在相同的 endpoint
        const existingIndex = subscriptions.findIndex(
          (sub) => sub.endpoint === subscription.endpoint,
        )

        if (existingIndex !== -1) {
          // 更新现有订阅
          subscriptions[existingIndex] = subscription
          request.log.info(
            { endpoint: subscription.endpoint },
            "Updated existing subscription",
          )
        } else {
          // 添加新订阅
          subscriptions.push(subscription)
          request.log.info(
            { endpoint: subscription.endpoint },
            "Added new subscription",
          )
        }

        // 保存回数据库
        await Setting.set("notification_subscriptions", subscriptions)

        request.log.info(
          {
            user: context.user.sub,
            total_subscriptions: subscriptions.length,
          },
          "Subscription saved successfully",
        )

        return {
          success: true,
          message: "Subscription saved successfully",
        }
      } catch (error) {
        request.log.error(
          {
            error: error.message,
            stack: error.stack,
          },
          "Failed to save subscription",
        )

        throw new ErrorWithProps("Failed to save subscription", {
          code: "INTERNAL_SERVER_ERROR",
        })
      }
    },
  },
  unsubscribeNotification: {
    type: graphql.type("NonNull", SaveSubscriptionResult),
    args: {
      endpoint: { type: graphql.type("NonNull", graphql.type("String")) },
    },
    resolve: async (_parent, { endpoint }, context) => {
      const { request } = context

      request.log.debug(
        {
          user: context.user?.sub,
          endpoint: endpoint,
        },
        "Saving push subscription",
      )

      // 认证检查: 只有认证过的用户(节点所有者)才能保存订阅
      if (!context.user) {
        throw new ErrorWithProps("Unauthorized: Authentication required.", {
          code: "UNAUTHENTICATED",
        })
      }

      try {
        // 获取现有的订阅列表
        const subscriptions = await Setting.get("notification_subscriptions")
        await Setting.set(
          "notification_subscriptions",
          subscriptions.filter((sub) => sub.endpoint !== endpoint),
        )

        request.log.info(
          {
            user: context.user.sub,
            total_subscriptions: subscriptions.length,
          },
          "Subscription saved successfully",
        )

        return {
          success: true,
          message: "Subscription saved successfully",
        }
      } catch (error) {
        request.log.error(
          {
            error: error.message,
            stack: error.stack,
          },
          "Failed to save subscription",
        )

        throw new ErrorWithProps("Failed to save subscription", {
          code: "INTERNAL_SERVER_ERROR",
        })
      }
    },
  },
}

export { updateSettingsMutation, notificationMutation }
