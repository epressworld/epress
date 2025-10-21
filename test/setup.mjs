import fs from "node:fs"
import test from "ava"
import FormData from "form-data"
import { createMercuriusTestClient } from "mercurius-integration-testing"
import nock from "nock"
import nodemailer from "nodemailer"
import setupServer from "../server/index.mjs"
import { Comment, Model, Node } from "../server/models/index.mjs"
import { cleanupInterval } from "../server/routes/api/visitors.mjs"
import { generateTestAccount, TEST_ETHEREUM_ADDRESS_NODE_A } from "./env.mjs"

// --- Global test setup ---
test.before(async (t) => {
  // 2. Migrate database using standard Knex migrations
  const knex = Model.knex()

  // Run migrations
  await knex.migrate.latest()

  const testAccount = await nodemailer.createTestAccount()
  process.env.INITIAL_DATA_NODE_AVATAR =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
  process.env.INITIAL_DATA_NODE_ADDRESS = TEST_ETHEREUM_ADDRESS_NODE_A
  process.env.INITIAL_DATA_NODE_URL = "https://node-a.com"
  process.env.INITIAL_DATA_NODE_TITLE = "Test Node A"
  process.env.INITIAL_DATA_NODE_DESCRIPTION =
    "Local epress instance we are testing."
  process.env.INITIAL_DATA_DEFAULT_LANGUAGE = "en"
  process.env.INITIAL_DATA_DEFAULT_THEME = "light"
  process.env.INITIAL_DATA_WALLETCONNECT_PROJECT_ID = ""
  process.env.INITIAL_DATA_MAIL_TRANSPORT = `smtp://${testAccount.user}:${testAccount.pass}@smtp.ethereal.email:587`
  process.env.INITIAL_DATA_MAIL_FROM = "no-reply@epress.world"
  await knex.seed.run()
  // 3. Initialize Fastify app and GraphQL client
  const app = await setupServer() // Call the actual createServer function to build the complete app
  await app.ready()

  const otherUserAccount = generateTestAccount()
  const selfNode = await Node.getSelf()
  const otherUserNode = await Node.query().insert({
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
  t.context.createClientJwt = async (address) => {
    return await app.jwt.sign({
      aud: "client",
      sub: address,
      iss: selfNode.address,
    })
  }
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
      const comment = await Comment.query()
        .findOne({ id: commentId, auth_type: "EMAIL" })
        .throwIfNotFound()
      if (comment?.author_id) {
        payload.sub = comment.author_id
      }
    }
    payload.iss = selfNode.address
    return await app.jwt.sign(payload, { expiresIn })
  }
  t.context.createIntegrationJwt = async (scope, expiresIn = "24h") =>
    await app.jwt.sign(
      {
        aud: "integration",
        sub: TEST_ETHEREUM_ADDRESS_NODE_A,
        scope,
        iss: selfNode.address,
      },
      { expiresIn },
    )
  t.context.createNonceJwt = async (address, expiresIn = "3m") =>
    await app.jwt.sign(
      {
        aud: "nonce",
        sub: address,
        nonce: "test-nonce",
        iss: selfNode.address,
      },
      { expiresIn },
    )

  t.context.app = app
  t.context.graphqlClient = createMercuriusTestClient(app, {
    url: "/api/graphql",
  })
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

  clearInterval(cleanupInterval)
})

// --- Helper functions (for generating credentials in tests) ---
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
  throw new Error("Unsupported credential type")
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
