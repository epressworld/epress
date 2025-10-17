import test from "ava"
import {
  cleanupInterval,
  VISITOR_TIMEOUT,
  visitors,
} from "../../../server/routes/api/visitors.mjs"
import "../../setup.mjs"

/**
 * Test suite for Online Visitors API
 *
 * Tests the visitor tracking functionality including:
 * - Address validation
 * - Adding/updating visitors
 * - Removing visitors
 * - Getting visitor list
 * - Automatic cleanup of expired visitors
 */

// --- Test Setup ---

test.before((_t) => {
  // Clear the cleanup interval to prevent it from interfering with tests
  clearInterval(cleanupInterval)
})

test.beforeEach((_t) => {
  // Clear visitors before each test
  visitors.clear()
})

test.afterEach((_t) => {
  // Clean up after each test
  visitors.clear()
})

// --- Test Cases ---

// Test address validation through API
test.serial("POST /api/visitors should reject empty address", async (t) => {
  const response = await t.context.app.inject({
    method: "POST",
    url: "/api/visitors",
    payload: { address: "" },
  })

  t.is(response.statusCode, 400)
  const result = response.json()
  t.false(result.success)
  t.is(result.error, "Invalid address")
})

test.serial("POST /api/visitors should reject null address", async (t) => {
  const response = await t.context.app.inject({
    method: "POST",
    url: "/api/visitors",
    payload: { address: null },
  })

  t.is(response.statusCode, 400)
  const result = response.json()
  t.false(result.success)
  t.is(result.error, "Invalid address")
})

test.serial(
  "POST /api/visitors should reject non-string address",
  async (t) => {
    const response = await t.context.app.inject({
      method: "POST",
      url: "/api/visitors",
      payload: { address: 123 },
    })

    t.is(response.statusCode, 400)
    const result = response.json()
    t.false(result.success)
    t.is(result.error, "Invalid address")
  },
)

test.serial(
  "POST /api/visitors should reject invalid Ethereum address format",
  async (t) => {
    const response = await t.context.app.inject({
      method: "POST",
      url: "/api/visitors",
      payload: { address: "invalid" },
    })

    t.is(response.statusCode, 400)
    const result = response.json()
    t.false(result.success)
    t.is(result.error, "Invalid Ethereum address format")
  },
)

test.serial(
  "POST /api/visitors should reject address without 0x prefix",
  async (t) => {
    const response = await t.context.app.inject({
      method: "POST",
      url: "/api/visitors",
      payload: { address: "1234567890123456789012345678901234567890" },
    })

    t.is(response.statusCode, 400)
    const result = response.json()
    t.false(result.success)
    t.is(result.error, "Invalid Ethereum address format")
  },
)

test.serial(
  "POST /api/visitors should reject address with wrong length",
  async (t) => {
    const response = await t.context.app.inject({
      method: "POST",
      url: "/api/visitors",
      payload: { address: "0x123" },
    })

    t.is(response.statusCode, 400)
    const result = response.json()
    t.false(result.success)
    t.is(result.error, "Invalid Ethereum address format")
  },
)

test.serial(
  "POST /api/visitors should accept valid Ethereum address",
  async (t) => {
    const address = "0x1234567890123456789012345678901234567890"
    const response = await t.context.app.inject({
      method: "POST",
      url: "/api/visitors",
      payload: { address },
    })

    t.is(response.statusCode, 200)
    const result = response.json()
    t.true(result.success)
    t.is(result.address, address)
    t.truthy(result.lastActive)
  },
)

test.serial(
  "POST /api/visitors should accept valid Ethereum address with uppercase",
  async (t) => {
    const address = "0xABCDEF1234567890ABCDEF1234567890ABCDEF12"
    const response = await t.context.app.inject({
      method: "POST",
      url: "/api/visitors",
      payload: { address },
    })

    t.is(response.statusCode, 200)
    const result = response.json()
    t.true(result.success)
    t.is(result.address, address)
  },
)

test.serial(
  "POST /api/visitors should accept valid Ethereum address with mixed case",
  async (t) => {
    const address = "0xAbCdEf1234567890aBcDeF1234567890AbCdEf12"
    const response = await t.context.app.inject({
      method: "POST",
      url: "/api/visitors",
      payload: { address },
    })

    t.is(response.statusCode, 200)
    const result = response.json()
    t.true(result.success)
    t.is(result.address, address)
  },
)

// Test visitor management
test.serial("POST /api/visitors should add visitor", async (t) => {
  const address = "0x1234567890123456789012345678901234567890"
  const response = await t.context.app.inject({
    method: "POST",
    url: "/api/visitors",
    payload: { address },
  })

  t.is(response.statusCode, 200)
  const result = response.json()
  t.true(result.success)
  t.is(result.address, address)
  t.truthy(result.lastActive)

  // Verify visitor was added
  t.is(visitors.size, 1)
  t.truthy(visitors.get(address))
})

test.serial("POST /api/visitors should update existing visitor", async (t) => {
  const address = "0x1234567890123456789012345678901234567890"

  // Add visitor first time
  const response1 = await t.context.app.inject({
    method: "POST",
    url: "/api/visitors",
    payload: { address },
  })
  const result1 = response1.json()
  const firstTime = result1.lastActive

  // Wait a bit
  await new Promise((resolve) => setTimeout(resolve, 10))

  // Update visitor
  const response2 = await t.context.app.inject({
    method: "POST",
    url: "/api/visitors",
    payload: { address },
  })
  const result2 = response2.json()
  const secondTime = result2.lastActive

  t.is(response2.statusCode, 200)
  t.true(result2.success)
  t.is(result2.address, address)
  t.true(secondTime >= firstTime)
  t.is(visitors.size, 1) // Still only one visitor
})

test.serial("DELETE /api/visitors should remove visitor", async (t) => {
  const address = "0x1234567890123456789012345678901234567890"

  // Add visitor first
  await t.context.app.inject({
    method: "POST",
    url: "/api/visitors",
    payload: { address },
  })
  t.is(visitors.size, 1)

  // Remove visitor
  const response = await t.context.app.inject({
    method: "DELETE",
    url: "/api/visitors",
    payload: { address },
  })

  t.is(response.statusCode, 200)
  const result = response.json()
  t.true(result.success)
  t.is(result.address, address)
  t.true(result.existed)
  t.is(visitors.size, 0)
})

test.serial(
  "DELETE /api/visitors should return false when removing non-existent visitor",
  async (t) => {
    const address = "0x1234567890123456789012345678901234567890"

    const response = await t.context.app.inject({
      method: "DELETE",
      url: "/api/visitors",
      payload: { address },
    })

    t.is(response.statusCode, 200)
    const result = response.json()
    t.true(result.success)
    t.is(result.address, address)
    t.false(result.existed)
  },
)

test.serial("GET /api/visitors should get all visitors", async (t) => {
  const address1 = "0x1234567890123456789012345678901234567890"
  const address2 = "0xABCDEF1234567890ABCDEF1234567890ABCDEF12"

  // Add two visitors
  await t.context.app.inject({
    method: "POST",
    url: "/api/visitors",
    payload: { address: address1 },
  })
  await t.context.app.inject({
    method: "POST",
    url: "/api/visitors",
    payload: { address: address2 },
  })

  // Get all visitors
  const response = await t.context.app.inject({
    method: "GET",
    url: "/api/visitors",
  })

  t.is(response.statusCode, 200)
  const result = response.json()
  t.true(result.success)
  t.is(result.count, 2)
  t.is(result.visitors.length, 2)
  t.truthy(result.visitors.find((v) => v.address === address1))
  t.truthy(result.visitors.find((v) => v.address === address2))
})

test.serial(
  "GET /api/visitors should not cleanup active visitors",
  async (t) => {
    const address = "0x1234567890123456789012345678901234567890"

    // Add visitor
    await t.context.app.inject({
      method: "POST",
      url: "/api/visitors",
      payload: { address },
    })

    // Get visitors (this triggers cleanup)
    const response = await t.context.app.inject({
      method: "GET",
      url: "/api/visitors",
    })

    t.is(response.statusCode, 200)
    const result = response.json()
    t.is(result.count, 1) // Visitor should still be there
    t.is(visitors.size, 1)
  },
)

test.serial("GET /api/visitors should cleanup expired visitors", async (t) => {
  const address = "0x1234567890123456789012345678901234567890"

  // Add visitor
  await t.context.app.inject({
    method: "POST",
    url: "/api/visitors",
    payload: { address },
  })

  // Manually set lastActive to expired time
  const visitor = visitors.get(address)
  visitor.lastActive = Date.now() - VISITOR_TIMEOUT - 1000

  // Get visitors (this triggers cleanup)
  const response = await t.context.app.inject({
    method: "GET",
    url: "/api/visitors",
  })

  t.is(response.statusCode, 200)
  const result = response.json()
  t.is(result.count, 0) // Visitor should be cleaned up
  t.is(visitors.size, 0)
})

test.serial("DELETE /api/visitors should reject invalid address", async (t) => {
  const response = await t.context.app.inject({
    method: "DELETE",
    url: "/api/visitors",
    payload: { address: "invalid" },
  })

  t.is(response.statusCode, 400)
  const result = response.json()
  t.false(result.success)
  t.is(result.error, "Invalid Ethereum address format")
})
