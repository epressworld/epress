import test from "ava"
import nock from "nock"
import { Setting } from "../../../server/models/index.mjs"
import {
  cleanupInterval,
  evictOldestVisitor,
  MAX_VISITORS,
  VISITOR_TIMEOUT,
  visitors,
} from "../../../server/routes/api/visitors.mjs"
import { clearServiceInstances } from "../../../server/utils/webpush.mjs"
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
 * - FIFO eviction when visitor limit is reached
 * - Web push notifications for new visitors
 */

// --- Test Setup ---

test.before((_t) => {
  // Clear the cleanup interval to prevent it from interfering with tests
  clearInterval(cleanupInterval)
})

test.beforeEach(async (_t) => {
  // Clear visitors before each test
  visitors.clear()

  // Clear notification service instances
  clearServiceInstances()

  // Clear VAPID keys and subscriptions
  await Setting.set("notification_vapid_keys", null)
  await Setting.set("notification_subscriptions", null)
})

test.afterEach(async (_t) => {
  // Clean up after each test
  visitors.clear()
  clearServiceInstances()
  nock.cleanAll()

  // Clear settings
  await Setting.set("notification_vapid_keys", null)
  await Setting.set("notification_subscriptions", null)
})

// --- Helper Functions ---

/**
 * Generate a valid Ethereum address for testing
 * @param {number} seed - A number to make the address unique
 * @returns {string} - A valid Ethereum address
 */
function generateAddress(seed) {
  const hex = seed.toString(16).padStart(40, "0")
  return `0x${hex}`
}

/**
 * Setup valid VAPID keys and subscription for push notification tests
 */
async function setupPushNotification() {
  const vapidKeys = {
    publicKey:
      "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U",
    privateKey: "UUxI4O8-FbRouAevSmBQ6o18hgE4nSG3qwvJTfKc-ls",
  }

  const subscription = {
    endpoint: "https://push.notification.com/send/test123",
    keys: {
      p256dh:
        "BA3Tsi3H0Et6iVU0kuzNvtmVNCVo4QsZk/ovVfe4hF6a+A50nAwhiEqq+xOAxa7oTIGJ19PgTKlrLu01M5qd4f4=",
      auth: "YllT9DF7kLiM5W8rF8SuIw==",
    },
  }

  await Setting.set("notification_vapid_keys", vapidKeys)
  await Setting.set("notification_subscriptions", [subscription])

  return { vapidKeys, subscription }
}

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

test.serial(
  "POST /api/visitors should send push notification for new visitor",
  async (t) => {
    const address = "0x1234567890123456789012345678901234567890"

    // Setup push notification
    await setupPushNotification()

    // Mock the push notification endpoint
    const scope = nock("https://push.notification.com")
      .post("/send/test123")
      .reply(201, {})

    const response = await t.context.app.inject({
      method: "POST",
      url: "/api/visitors",
      payload: { address },
    })

    t.is(response.statusCode, 200)
    const result = response.json()
    t.true(result.success)

    // Wait for async notification to be sent
    await new Promise((resolve) => setTimeout(resolve, 100))

    t.true(scope.isDone(), "Push notification should be sent")
  },
)

test.serial(
  "POST /api/visitors should NOT send push notification for self node",
  async (t) => {
    // Get self node address from the app
    const { selfNode } = t.context
    const address = selfNode.address

    // Setup push notification
    await setupPushNotification()

    // Mock the push notification endpoint (should NOT be called)
    const scope = nock("https://push.notification.com")
      .post("/send/test123")
      .reply(201, {})

    const response = await t.context.app.inject({
      method: "POST",
      url: "/api/visitors",
      payload: { address },
    })

    t.is(response.statusCode, 200)

    // Wait to ensure notification would have been sent if it was going to
    await new Promise((resolve) => setTimeout(resolve, 100))

    t.false(
      scope.isDone(),
      "Push notification should NOT be sent for self node",
    )

    nock.cleanAll()
  },
)

test.serial(
  "POST /api/visitors should handle push notification failure gracefully",
  async (t) => {
    const address = "0x1234567890123456789012345678901234567890"

    // Setup push notification
    await setupPushNotification()

    // Mock the push notification endpoint to fail
    const scope = nock("https://push.notification.com")
      .post("/send/test123")
      .replyWithError("Network error")

    const response = await t.context.app.inject({
      method: "POST",
      url: "/api/visitors",
      payload: { address },
    })

    // Should still succeed even if push fails
    t.is(response.statusCode, 200)
    const result = response.json()
    t.true(result.success)

    // Wait for async notification attempt
    await new Promise((resolve) => setTimeout(resolve, 100))

    t.true(scope.isDone())
  },
)

test.serial(
  "POST /api/visitors should NOT send notification when VAPID not configured",
  async (t) => {
    const address = "0x1234567890123456789012345678901234567890"

    // Don't setup VAPID keys

    // Mock the push notification endpoint (should NOT be called)
    const scope = nock("https://push.notification.com")
      .post("/send/test123")
      .reply(201, {})

    const response = await t.context.app.inject({
      method: "POST",
      url: "/api/visitors",
      payload: { address },
    })

    t.is(response.statusCode, 200)

    await new Promise((resolve) => setTimeout(resolve, 100))

    t.false(
      scope.isDone(),
      "Push notification should NOT be sent when VAPID not configured",
    )

    nock.cleanAll()
  },
)

test.serial(
  "POST /api/visitors should NOT send notification when no subscriptions",
  async (t) => {
    const address = "0x1234567890123456789012345678901234567890"

    // Setup VAPID keys but no subscriptions
    const vapidKeys = {
      publicKey:
        "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U",
      privateKey: "UUxI4O8-FbRouAevSmBQ6o18hgE4nSG3qwvJTfKc-ls",
    }
    await Setting.set("notification_vapid_keys", vapidKeys)
    await Setting.set("notification_subscriptions", [])

    const scope = nock("https://push.notification.com")
      .post("/send/test123")
      .reply(201, {})

    const response = await t.context.app.inject({
      method: "POST",
      url: "/api/visitors",
      payload: { address },
    })

    t.is(response.statusCode, 200)

    await new Promise((resolve) => setTimeout(resolve, 100))

    t.false(
      scope.isDone(),
      "Push notification should NOT be sent when no subscriptions",
    )

    nock.cleanAll()
  },
)

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

test.serial(
  "POST /api/visitors should NOT send notification when updating existing visitor",
  async (t) => {
    const address = "0x1234567890123456789012345678901234567890"

    // Add visitor first time
    await t.context.app.inject({
      method: "POST",
      url: "/api/visitors",
      payload: { address },
    })

    // Clear service instances to ensure fresh notification service
    clearServiceInstances()

    // Setup push notification for second request
    await setupPushNotification()

    const scope = nock("https://push.notification.com")
      .post("/send/test123")
      .reply(201, {})

    // Update visitor (should NOT send notification)
    const response2 = await t.context.app.inject({
      method: "POST",
      url: "/api/visitors",
      payload: { address },
    })

    t.is(response2.statusCode, 200)
    t.is(visitors.size, 1)

    await new Promise((resolve) => setTimeout(resolve, 100))

    t.false(scope.isDone(), "Should NOT send notification for existing visitor")

    nock.cleanAll()
  },
)

test.serial(
  "POST /api/visitors should handle expired subscriptions gracefully",
  async (t) => {
    const address = "0x1234567890123456789012345678901234567890"

    // Setup push notification
    await setupPushNotification()

    // Mock the push notification endpoint to return 410 (Gone)
    const scope = nock("https://push.notification.com")
      .post("/send/test123")
      .reply(410, {})

    const response = await t.context.app.inject({
      method: "POST",
      url: "/api/visitors",
      payload: { address },
    })

    // Should still succeed even if subscription expired
    t.is(response.statusCode, 200)
    const result = response.json()
    t.true(result.success)

    // Wait for async notification attempt
    await new Promise((resolve) => setTimeout(resolve, 100))

    t.true(scope.isDone())

    // Verify expired subscription was removed
    const subscriptions = await Setting.get("notification_subscriptions")
    t.is(subscriptions.length, 0, "Expired subscription should be removed")
  },
)

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
  t.is(result.limit, MAX_VISITORS)
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

// --- FIFO Eviction Tests ---

test.serial(
  "evictOldestVisitor should remove the oldest visitor",
  async (t) => {
    const now = Date.now()

    // Add three visitors with different addedAt times
    visitors.set(generateAddress(1), {
      address: generateAddress(1),
      lastActive: now,
      addedAt: now - 3000,
    })
    visitors.set(generateAddress(2), {
      address: generateAddress(2),
      lastActive: now,
      addedAt: now - 2000,
    })
    visitors.set(generateAddress(3), {
      address: generateAddress(3),
      lastActive: now,
      addedAt: now - 1000,
    })

    t.is(visitors.size, 3)

    // Evict oldest
    evictOldestVisitor()

    t.is(visitors.size, 2)
    t.false(visitors.has(generateAddress(1))) // Oldest should be removed
    t.true(visitors.has(generateAddress(2)))
    t.true(visitors.has(generateAddress(3)))
  },
)

test.serial(
  "POST /api/visitors should enforce MAX_VISITORS limit",
  async (t) => {
    // Add visitors up to the limit
    for (let i = 0; i < MAX_VISITORS; i++) {
      const address = generateAddress(i)
      await t.context.app.inject({
        method: "POST",
        url: "/api/visitors",
        payload: { address },
      })
    }

    t.is(visitors.size, MAX_VISITORS)

    // Add one more visitor, should trigger eviction
    const newAddress = generateAddress(MAX_VISITORS)
    const response = await t.context.app.inject({
      method: "POST",
      url: "/api/visitors",
      payload: { address: newAddress },
    })

    t.is(response.statusCode, 200)
    const result = response.json()
    t.true(result.success)
    t.true(result.evicted) // Should indicate eviction occurred
    t.is(visitors.size, MAX_VISITORS) // Should still be at limit
    t.true(visitors.has(newAddress)) // New visitor should be added
    t.false(visitors.has(generateAddress(0))) // Oldest should be removed
  },
)

test.serial(
  "POST /api/visitors should not evict when updating existing visitor",
  async (t) => {
    // Add visitors up to the limit
    for (let i = 0; i < MAX_VISITORS; i++) {
      const address = generateAddress(i)
      await t.context.app.inject({
        method: "POST",
        url: "/api/visitors",
        payload: { address },
      })
    }

    t.is(visitors.size, MAX_VISITORS)

    // Update an existing visitor
    const existingAddress = generateAddress(500)
    const response = await t.context.app.inject({
      method: "POST",
      url: "/api/visitors",
      payload: { address: existingAddress },
    })

    t.is(response.statusCode, 200)
    const result = response.json()
    t.true(result.success)
    t.falsy(result.evicted) // Should NOT indicate eviction
    t.is(visitors.size, MAX_VISITORS) // Should still be at limit
    t.true(visitors.has(generateAddress(0))) // Oldest should NOT be removed
  },
)

test.serial(
  "POST /api/visitors FIFO eviction should maintain correct order",
  async (t) => {
    // Add 10 visitors
    for (let i = 0; i < 10; i++) {
      const address = generateAddress(i)
      visitors.set(address, {
        address,
        lastActive: Date.now(),
        addedAt: Date.now() + i,
      })
    }

    // Evict 5 times
    for (let i = 0; i < 5; i++) {
      evictOldestVisitor()
    }

    t.is(visitors.size, 5)

    // The first 5 should be removed, last 5 should remain
    for (let i = 0; i < 5; i++) {
      t.false(visitors.has(generateAddress(i)))
    }
    for (let i = 5; i < 10; i++) {
      t.true(visitors.has(generateAddress(i)))
    }
  },
)

test.serial("GET /api/visitors should return limit in response", async (t) => {
  const response = await t.context.app.inject({
    method: "GET",
    url: "/api/visitors",
  })

  t.is(response.statusCode, 200)
  const result = response.json()
  t.true(result.success)
  t.is(result.limit, MAX_VISITORS)
})

test.serial(
  "GET /api/visitors should not expose internal addedAt field",
  async (t) => {
    const address = generateAddress(1)
    await t.context.app.inject({
      method: "POST",
      url: "/api/visitors",
      payload: { address },
    })

    const response = await t.context.app.inject({
      method: "GET",
      url: "/api/visitors",
    })

    t.is(response.statusCode, 200)
    const result = response.json()
    t.is(result.visitors.length, 1)

    const visitor = result.visitors[0]
    t.truthy(visitor.address)
    t.truthy(visitor.lastActive)
    t.falsy(visitor.addedAt) // Should not be exposed
  },
)

test.serial(
  "POST /api/visitors should preserve addedAt when updating visitor",
  async (t) => {
    const address = generateAddress(1)

    // Add visitor
    await t.context.app.inject({
      method: "POST",
      url: "/api/visitors",
      payload: { address },
    })

    const originalAddedAt = visitors.get(address).addedAt

    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 10))

    // Update visitor
    await t.context.app.inject({
      method: "POST",
      url: "/api/visitors",
      payload: { address },
    })

    const updatedVisitor = visitors.get(address)
    t.is(updatedVisitor.addedAt, originalAddedAt) // addedAt should not change
    t.true(updatedVisitor.lastActive > originalAddedAt) // lastActive should update
  },
)
