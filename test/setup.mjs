import fs from "node:fs"
import test from "ava"
import FormData from "form-data"
import { createMercuriusTestClient } from "mercurius-integration-testing"
import nock from "nock"
import nodemailer from "nodemailer"
import { knexMigration, Model } from "swiftify"
import { generateTestAccount, TEST_ETHEREUM_ADDRESS_NODE_A } from "./env.mjs"

// --- Global test setup ---
test.before(async (t) => {
  // 1. Database setup (in-memory SQLite for isolation)
  Model.connect({
    client: "sqlite3",
    connection: ":memory:", // Use in-memory database to ensure each test run is fresh
    useNullAsDefault: true,
  })

  // Dynamic import for default export
  const { default: setupServer } = await import("../server/index.mjs")

  // Dynamic import for all models
  const models = await import("../server/models/index.mjs")

  // Dynamic import for specific named export
  const { Comment } = await import("../server/models/index.mjs")

  // 2. Migrate database, create clean schema
  await knexMigration(Object.values(models), { drop: true }) // Drop and recreate tables
  await knexMigration(Object.values(models))

  const selfNode = await models.Node.query().insert({
    address: TEST_ETHEREUM_ADDRESS_NODE_A,
    url: "https://node-a.com",
    title: "Test Node A",
    description: "Local epress instance we are testing.",
    is_self: true,
    profile_version: 0,
  })
  // Define the settings to insert
  const settings = [
    { key: "enable_rss", value: "true" },
    { key: "allow_follow", value: "true" },
    { key: "allow_comment", value: "true" },
    {
      key: "avatar",
      value:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    }, // Existing default avatar
  ]

  // Insert settings using a for loop
  for (const setting of settings) {
    await models.Setting.query().insert(setting)
  }

  // 3. Initialize Fastify app and GraphQL client
  const app = await setupServer() // Call the actual createServer function to build the complete app
  await app.ready()

  const otherUserAccount = generateTestAccount()
  const otherUserNode = await models.Node.query().insert({
    address: otherUserAccount.address,
    url: `https://other-epress-node.com`,
    title: "Other User Node",
    description: "A node for testing ownership permissions.",
    is_self: false,
    profile_version: 0,
  })

  t.context.selfNode = selfNode
  t.context.otherUserNode = otherUserNode

  // JWT generation helper functions
  t.context.createJwt = (address) =>
    app.jwt.sign({ aud: "client", sub: address })
  t.context.createClientJwt = (address) =>
    app.jwt.sign({ aud: "client", sub: address })
  t.context.createCommentJwt = async (
    commentId,
    action,
    email = null,
    expiresIn = "24h",
  ) => {
    const payload = { aud: "comment", comment_id: commentId, action }
    if (email) {
      payload.sub = email
    } else {
      // 如果没有提供 email，从数据库中获取评论的 email
      const comment = await Comment.query().findById(commentId)
      if (comment?.commenter_email) {
        payload.sub = comment.commenter_email
      }
    }
    return app.jwt.sign(payload, { expiresIn })
  }
  t.context.createIntegrationJwt = (scope, expiresIn = "24h") =>
    app.jwt.sign(
      { aud: "integration", sub: process.env.EPRESS_NODE_ADDRESS, scope },
      { expiresIn },
    )
  t.context.createNonceJwt = (address, expiresIn = "3m") =>
    app.jwt.sign(
      { aud: "nonce", sub: address, nonce: "test-nonce" },
      { expiresIn },
    )

  t.context.app = app
  t.context.graphqlClient = createMercuriusTestClient(app, {
    url: "/api/graphql",
  })

  // 4. Mocking setup (Nock for HTTP)
  const testAccount = await nodemailer.createTestAccount()
  process.env.EPRESS_MAIL_TRANSPORT = `smtp://${testAccount.user}:${testAccount.pass}@smtp.ethereal.email:587`
})

test.after.always(async (t) => {
  // 1. Clean up Nock mocks
  nock.cleanAll()
  nock.restore() // Restore nock to prevent affecting other tests

  // 2. Close Fastify app
  if (t.context.app) {
    try {
      await t.context.app.close()
    } catch {
      // Ignore close errors
    }
  }

  // 3. Close database connection
  if (Model.knex()) {
    try {
      await Model.knex().destroy()
    } catch {
      // Ignore close errors
    }
  }
})

// --- Helper functions (for generating signatures in tests) ---
// account: viem Account object (e.g., TEST_ACCOUNT_NODE_A, TEST_ACCOUNT_NODE_B)
export async function generateSignature(account, message, type = "message") {
  if (type === "message") {
    return await account.signMessage({
      account: account,
      message: message,
    })
  } else if (type === "typedData") {
    // For EIP-712 typed data, you need the complete typedData object
    // This is a placeholder, actual implementation will depend on specific typedData structure
    return await account.signTypedData({
      account: account,
      domain: message.domain,
      types: message.types,
      primaryType: message.primaryType,
      message: message.message,
    })
  }
  throw new Error("Unsupported signature type")
}

// --- File upload test cases ---

// Helper function: Create mock file and FormData
export const createGraphQLUploadRequest = ({
  query,
  filePath,
  variables,
  uploadFieldName,
  fileName,
}) => {
  const form = new FormData()
  const fileStream = fs.createReadStream(filePath)

  const operations = JSON.stringify({
    query,
    variables,
  })

  form.append("operations", operations)
  form.append("map", JSON.stringify({ 0: [`variables.${uploadFieldName}`] }))
  form.append("0", fileStream, { filename: fileName })

  return { body: form, headers: form.getHeaders() }
}

export * from "./env.mjs"
