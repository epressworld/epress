import mercurius from "mercurius"
import { graphql, Model } from "solidify.js"
import { Setting } from "../../models/index.mjs"
import { SettingsType } from "../queries/settings.mjs"

const { ErrorWithProps } = mercurius

const UpdateSettingsInput = graphql.type("InputObjectType", {
  name: "UpdateSettingsInput",
  fields: {
    enableRSS: { type: graphql.type("Boolean") },
    allowFollow: { type: graphql.type("Boolean") },
    allowComment: { type: graphql.type("Boolean") },
    defaultLanguage: { type: graphql.type("String") },
    defaultTheme: { type: graphql.type("String") },
    walletConnectProjectId: { type: graphql.type("String") },
    pwaAppName: { type: graphql.type("String") },
  },
})

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

const SaveSubscriptionResult = graphql.type("ObjectType", {
  name: "SaveSubscriptionResult",
  fields: {
    success: { type: graphql.type("NonNull", graphql.type("Boolean")) },
    message: { type: graphql.type("String") },
  },
})

const updateSettingsMutation = {
  updateSettings: {
    type: graphql.type("NonNull", SettingsType),
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

      if (!context.user) {
        throw new ErrorWithProps("Unauthorized: Authentication required.", {
          code: "UNAUTHENTICATED",
        })
      }

      const updatedSettingsData = await Model.knex().transaction(
        async (trx) => {
          const settingsToReturn = {}

          const keyMapping = {
            enableRSS: "enable_rss",
            allowFollow: "allow_follow",
            allowComment: "allow_comment",
            defaultLanguage: "default_language",
            defaultTheme: "default_theme",
            walletConnectProjectId: "walletconnect_projectid",
            pwaAppName: "pwa_app_name",
          }

          for (const graphqlKey in input) {
            if (Object.hasOwn(input, graphqlKey)) {
              const dbKey = keyMapping[graphqlKey] || graphqlKey
              let valueToStore = input[graphqlKey]

              if (typeof valueToStore === "boolean") {
                valueToStore = valueToStore.toString()
              }

              const existingSetting = await Setting.query(trx)
                .where({ key: dbKey })
                .first()

              if (existingSetting) {
                await Setting.query(trx)
                  .where({ key: dbKey })
                  .update({ value: valueToStore })
              } else {
                await Setting.query(trx).insert({
                  key: dbKey,
                  value: valueToStore,
                })
              }
            }
          }

          const settingsList = await Setting.query(trx)

          const defaults = {
            enableRSS: false,
            allowFollow: true,
            allowComment: true,
            defaultLanguage: "en",
            defaultTheme: "light",
            walletConnectProjectId: "",
            pwaAppName: null,
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
            } else if (setting.key === "pwa_app_name") {
              settingsToReturn.pwaAppName = setting.value
            } else if (setting.key === "default_language") {
              settingsToReturn.defaultLanguage = setting.value
            } else if (setting.key === "default_theme") {
              settingsToReturn.defaultTheme = setting.value
            }
          })

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

      if (!context.user) {
        throw new ErrorWithProps("Unauthorized: Authentication required.", {
          code: "UNAUTHENTICATED",
        })
      }

      try {
        const subscriptions = await Setting.get("notification_subscriptions")
        const existingIndex = subscriptions.findIndex(
          (sub) => sub.endpoint === subscription.endpoint,
        )

        if (existingIndex !== -1) {
          subscriptions[existingIndex] = subscription
          request.log.info(
            { endpoint: subscription.endpoint },
            "Updated existing subscription",
          )
        } else {
          subscriptions.push(subscription)
          request.log.info(
            { endpoint: subscription.endpoint },
            "Added new subscription",
          )
        }

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

      if (!context.user) {
        throw new ErrorWithProps("Unauthorized: Authentication required.", {
          code: "UNAUTHENTICATED",
        })
      }

      try {
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
