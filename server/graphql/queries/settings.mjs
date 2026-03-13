import { graphql } from "solidify.js"
import { Setting } from "../../models/setting.mjs"

const SettingsType = graphql.type("ObjectType", {
  name: "Settings",
  fields: {
    enableRSS: { type: graphql.type("NonNull", graphql.type("Boolean")) },
    allowFollow: { type: graphql.type("NonNull", graphql.type("Boolean")) },
    allowComment: { type: graphql.type("NonNull", graphql.type("Boolean")) },
    defaultLanguage: { type: graphql.type("NonNull", graphql.type("String")) },
    defaultTheme: { type: graphql.type("NonNull", graphql.type("String")) },
    walletConnectProjectId: { type: graphql.type("String") },
    pwaAppName: { type: graphql.type("String") },
    vapidPublicKey: { type: graphql.type("String") },
  },
})

const settingsQuery = {
  settings: {
    type: SettingsType,
    resolve: async (_parent, _args, context) => {
      const { request } = context

      request.log.debug({ contextUser: !!context.user }, "Fetching settings")

      const allSettings = await Setting.getAll()

      const defaults = {
        enableRSS: false,
        allowFollow: true,
        allowComment: true,
        defaultLanguage: "en",
        defaultTheme: "light",
        walletConnectProjectId: null,
        vapidPublicKey: null,
      }

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
        pwaAppName: allSettings.pwa_app_name || null,
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
