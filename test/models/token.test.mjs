import crypto from "node:crypto"
import test from "ava"
import "../setup.mjs"
import { Token } from "../../server/models/index.mjs"
import { TEST_ETHEREUM_ADDRESS_NODE_A } from "../setup.mjs"

test.beforeEach(async () => {
  await Token.query().delete()
})

test("issue: should create token with default expiresIn", async (t) => {
  const mockApp = {
    jwt: {
      sign: async (payload, options) => {
        return `mock-jwt-${payload.jti}`
      },
    },
  }

  const token = await Token.issue({
    app: mockApp,
    sub: TEST_ETHEREUM_ADDRESS_NODE_A,
    aud: "client",
    iss: "https://test-node.com",
  })

  t.truthy(token, "Should return a token string")
  t.true(token.startsWith("mock-jwt-"), "Token should be a mock JWT")

  const tokenRecord = await Token.query().where("token", token).first()
  t.truthy(tokenRecord, "Token should be saved to database")
  t.falsy(tokenRecord.revoked, "Token should not be revoked by default")
  t.truthy(tokenRecord.expires_at, "Token should have expiration time")
})

test("issue: should create token with custom expiresIn", async (t) => {
  const mockApp = {
    jwt: {
      sign: async (payload, options) => {
        return `mock-jwt-${payload.jti}`
      },
    },
  }

  const token = await Token.issue({
    app: mockApp,
    sub: TEST_ETHEREUM_ADDRESS_NODE_A,
    aud: "client",
    iss: "https://test-node.com",
    expiresIn: "1h",
  })

  t.truthy(token, "Should return a token string")

  const tokenRecord = await Token.query().where("token", token).first()
  t.truthy(tokenRecord, "Token should be saved to database")

  const expiresAt = new Date(tokenRecord.expires_at)
  const now = new Date()
  const diffMs = expiresAt - now
  const oneHourMs = 60 * 60 * 1000

  t.true(
    diffMs > 0 && diffMs <= oneHourMs + 1000,
    "Token should expire in approximately 1 hour",
  )
})

test("issue: should create token with scope for integration audience", async (t) => {
  const mockApp = {
    jwt: {
      sign: async (payload, options) => {
        t.truthy(payload.scope, "Payload should include scope")
        t.deepEqual(payload.scope, ["read:publications"], "Scope should match")
        return `mock-jwt-${payload.jti}`
      },
    },
  }

  const token = await Token.issue({
    app: mockApp,
    sub: TEST_ETHEREUM_ADDRESS_NODE_A,
    aud: "integration",
    iss: "https://test-node.com",
    scope: ["read:publications"],
    expiresIn: "1h",
  })

  t.truthy(token, "Should return a token string")
})

test("issue: should create unique jti for each token", async (t) => {
  const mockApp = {
    jwt: {
      sign: async (payload, options) => {
        return `mock-jwt-${payload.jti}`
      },
    },
  }

  const token1 = await Token.issue({
    app: mockApp,
    sub: TEST_ETHEREUM_ADDRESS_NODE_A,
    aud: "client",
    iss: "https://test-node.com",
  })

  const token2 = await Token.issue({
    app: mockApp,
    sub: TEST_ETHEREUM_ADDRESS_NODE_A,
    aud: "client",
    iss: "https://test-node.com",
  })

  t.not(token1, token2, "Each token should be unique")
})

test("create: should create token record directly", async (t) => {
  const id = crypto.randomUUID()
  const tokenValue = `test-token-${id}`
  const expiresAt = new Date(Date.now() + 3600000)

  const result = await Token.create({
    id,
    token: tokenValue,
    expiresAt,
  })

  t.truthy(result, "Should return created token record")
  t.is(result.id, id, "ID should match")
  t.is(result.token, tokenValue, "Token should match")

  const savedToken = await Token.findById(id)
  t.truthy(savedToken, "Token should be saved to database")
})

test("revoke: should revoke an existing token", async (t) => {
  const mockApp = {
    jwt: {
      sign: async (payload, options) => {
        return `mock-jwt-${payload.jti}`
      },
    },
  }

  const token = await Token.issue({
    app: mockApp,
    sub: TEST_ETHEREUM_ADDRESS_NODE_A,
    aud: "client",
    iss: "https://test-node.com",
  })

  const tokenRecord = await Token.query().where("token", token).first()
  t.falsy(tokenRecord.revoked, "Token should not be revoked initially")

  await Token.revoke(tokenRecord.id)

  const revokedToken = await Token.findById(tokenRecord.id)
  t.truthy(revokedToken.revoked, "Token should be revoked")
})

test("revoke: should return updated record", async (t) => {
  const mockApp = {
    jwt: {
      sign: async (payload, options) => {
        return `mock-jwt-${payload.jti}`
      },
    },
  }

  const token = await Token.issue({
    app: mockApp,
    sub: TEST_ETHEREUM_ADDRESS_NODE_A,
    aud: "client",
    iss: "https://test-node.com",
  })

  const tokenRecord = await Token.query().where("token", token).first()

  const result = await Token.revoke(tokenRecord.id)

  t.truthy(result, "Should return the updated record")
  t.is(result.id, tokenRecord.id, "ID should match")
  t.truthy(result.revoked, "Should be revoked")
})

test("findById: should return token record by id", async (t) => {
  const id = crypto.randomUUID()
  const tokenValue = `test-token-${id}`
  const expiresAt = new Date(Date.now() + 3600000)

  await Token.create({
    id,
    token: tokenValue,
    expiresAt,
  })

  const result = await Token.findById(id)

  t.truthy(result, "Should find the token")
  t.is(result.id, id, "ID should match")
  t.is(result.token, tokenValue, "Token should match")
})

test("findById: should return undefined for non-existent id", async (t) => {
  const result = await Token.findById(crypto.randomUUID())

  t.falsy(result, "Should return undefined for non-existent token")
})

test("verify: should return token record for valid token", async (t) => {
  const mockApp = {
    jwt: {
      sign: async (payload, options) => {
        return `mock-jwt-${payload.jti}`
      },
    },
  }

  const token = await Token.issue({
    app: mockApp,
    sub: TEST_ETHEREUM_ADDRESS_NODE_A,
    aud: "client",
    iss: "https://test-node.com",
    expiresIn: "1h",
  })

  const tokenRecord = await Token.query().where("token", token).first()

  const result = await Token.verify(tokenRecord.id)

  t.truthy(result, "Should return the token record")
  t.is(result.id, tokenRecord.id, "ID should match")
})

test("verify: should throw TOKEN_NOT_FOUND for non-existent token", async (t) => {
  const error = await t.throwsAsync(async () => {
    await Token.verify(crypto.randomUUID())
  })

  t.is(error.code, "TOKEN_NOT_FOUND", "Should throw TOKEN_NOT_FOUND error")
  t.is(
    error.message,
    "Token not found in database",
    "Error message should match",
  )
})

test("verify: should throw TOKEN_REVOKED for revoked token", async (t) => {
  const mockApp = {
    jwt: {
      sign: async (payload, options) => {
        return `mock-jwt-${payload.jti}`
      },
    },
  }

  const token = await Token.issue({
    app: mockApp,
    sub: TEST_ETHEREUM_ADDRESS_NODE_A,
    aud: "client",
    iss: "https://test-node.com",
    expiresIn: "1h",
  })

  const tokenRecord = await Token.query().where("token", token).first()
  await Token.revoke(tokenRecord.id)

  const error = await t.throwsAsync(async () => {
    await Token.verify(tokenRecord.id)
  })

  t.is(error.code, "TOKEN_REVOKED", "Should throw TOKEN_REVOKED error")
  t.is(error.message, "Token has been revoked", "Error message should match")
})

test("verify: should throw TOKEN_EXPIRED for expired token", async (t) => {
  const id = crypto.randomUUID()
  const tokenValue = `test-token-${id}`
  const expiresAt = new Date(Date.now() - 1000)

  await Token.create({
    id,
    token: tokenValue,
    expiresAt,
  })

  const error = await t.throwsAsync(async () => {
    await Token.verify(id)
  })

  t.is(error.code, "TOKEN_EXPIRED", "Should throw TOKEN_EXPIRED error")
  t.is(error.message, "Token has expired", "Error message should match")
})
