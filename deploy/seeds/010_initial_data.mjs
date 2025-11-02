import crypto from "node:crypto"
import webpush from "web-push"

/**
 * @param { import("knex").Knex } knex
 * @param { Object } installData - 安装时提供的数据
 * @returns { Promise<void> }
 */
export const seed = async (knex) => {
  await knex("nodes").insert({
    address: process.env.INITIAL_DATA_NODE_ADDRESS,
    url: process.env.INITIAL_DATA_NODE_URL,
    title: process.env.INITIAL_DATA_NODE_TITLE || "My epress node",
    description:
      process.env.INITIAL_DATA_NODE_DESCRIPTION ||
      "rebuild the entire internet",
    is_self: true,
    created_at: new Date(),
    updated_at: new Date(),
  })
  const vapidKeys = webpush.generateVAPIDKeys()
  // 插入设置记录
  const settingsToInsert = [
    { key: "enable_rss", value: "true" },
    { key: "allow_follow", value: "true" },
    { key: "allow_comment", value: "true" },
    {
      key: "default_language",
      value: process.env.INITIAL_DATA_DEFAULT_LANGUAGE || "en",
    },
    {
      key: "default_theme",
      value: process.env.INITIAL_DATA_DEFAULT_THEME || "light",
    },
    {
      key: "walletconnect_projectid",
      value: process.env.INITIAL_DATA_WALLETCONNECT_PROJECT_ID || "",
    },
    {
      key: "mail_transport",
      value: process.env.INITIAL_DATA_MAIL_TRANSPORT || "",
    },
    { key: "mail_from", value: process.env.INITIAL_DATA_MAIL_FROM || "" },
    { key: "avatar", value: process.env.INITIAL_DATA_NODE_AVATAR || "" },
    { key: "jwt_secret", value: crypto.randomBytes(32).toString("hex") },
    { key: "jwt_expires_in", value: "24h" },
    { key: "notification_vapid_keys", value: JSON.stringify(vapidKeys) },
    { key: "notification_subscriptions", value: "[]" },
  ]

  // 批量插入设置
  await knex("settings").insert(settingsToInsert)
}
