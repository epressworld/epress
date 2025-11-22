// server/graphql/queries/settings.mjs
import { graphql } from "solidify.js"
import { Setting } from "../../models/setting.mjs"

// 定义 Mail 配置对象类型
const MailType = graphql.type("ObjectType", {
  name: "Mail",
  fields: {
    enabled: { type: graphql.type("NonNull", graphql.type("Boolean")) },
    mailTransport: { type: graphql.type("String") },
    mailFrom: { type: graphql.type("String") },
  },
})

// 定义 GraphQL Settings 对象类型
const SettingsType = graphql.type("ObjectType", {
  name: "Settings",
  fields: {
    enableRSS: { type: graphql.type("NonNull", graphql.type("Boolean")) },
    allowFollow: { type: graphql.type("NonNull", graphql.type("Boolean")) },
    allowComment: { type: graphql.type("NonNull", graphql.type("Boolean")) },
    defaultLanguage: { type: graphql.type("NonNull", graphql.type("String")) },
    defaultTheme: { type: graphql.type("NonNull", graphql.type("String")) },
    walletConnectProjectId: { type: graphql.type("String") },
    mail: { type: graphql.type("NonNull", MailType) },
    vapidPublicKey: { type: graphql.type("String") },
  },
})

// 定义 'settings' 查询的解析器
const settingsQuery = {
  settings: {
    type: SettingsType, // 使用新定义的 SettingsType
    resolve: async (_parent, _args, context) => {
      const { request } = context

      request.log.debug({ contextUser: !!context.user }, "Fetching settings")

      const allSettings = await Setting.getAll()

      // 设置默认值
      const defaults = {
        enableRSS: false,
        allowFollow: true,
        allowComment: true,
        defaultLanguage: "en",
        defaultTheme: "light",
        walletConnectProjectId: null,
        mailTransport: "",
        mailFrom: "",
        vapidPublicKey: null,
      }

      // 检查邮件是否已配置
      const mailTransport = allSettings.mail_transport || defaults.mailTransport
      const mailFrom = allSettings.mail_from || defaults.mailFrom
      const mailEnabled = !!(mailTransport && mailFrom)

      // 映射数据库字段到 GraphQL 字段
      const result = {
        enableRSS: allSettings.enable_rss === "true" || defaults.enableRSS,
        allowFollow:
          allSettings.allow_follow === "true" || defaults.allowFollow,
        allowComment:
          allSettings.allow_comment === "true" || defaults.allowComment,
        defaultLanguage:
          allSettings.default_language || defaults.defaultLanguage,
        defaultTheme: allSettings.default_theme || defaults.defaultTheme,
        walletConnectProjectId:
          allSettings.walletconnect_projectid ||
          defaults.walletConnectProjectId,
        // 新的 mail 对象结构
        mail: {
          enabled: mailEnabled,
          mailTransport: context.user ? mailTransport : null,
          mailFrom: context.user ? mailFrom : null,
        },
        // VAPID 公钥 - 所有人都可以访问
        vapidPublicKey: allSettings.notification_vapid_keys?.publicKey,
      }

      request.log.debug(
        {
          settings_count: Object.keys(allSettings).length,
          final_settings: result,
        },
        "Settings fetched successfully",
      )

      return result
    },
  },
}

export { SettingsType, settingsQuery }
