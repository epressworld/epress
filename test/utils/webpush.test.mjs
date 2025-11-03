import test from "ava"
import sinon from "sinon"
import webpush from "web-push"
import { Setting } from "../../server/models/index.mjs"
import {
  clearServiceInstances,
  getNotificationService,
  NoSubscriptionsError,
  VapidNotConfiguredError,
  WebPushNotificationService,
} from "../../server/utils/webpush.mjs"

test.beforeEach(() => {
  sinon.restore()
  clearServiceInstances()

  // Default stubs
  sinon.stub(webpush, "setVapidDetails").returns()
  sinon.stub(webpush, "sendNotification").resolves()
})

test.afterEach(() => {
  sinon.restore()
  clearServiceInstances()
})

// ============================================================
// VapidConfigManager Tests
// ============================================================

test.serial("VapidConfigManager - should load VAPID keys", async (t) => {
  const vapidKeys = { publicKey: "pub123", privateKey: "priv456" }
  sinon.stub(Setting, "get").resolves(vapidKeys)

  const service = new WebPushNotificationService()
  await service.initialize()

  t.true(service.vapidManager.isConfigured())
  t.is(service.vapidManager.getPublicKey(), "pub123")
  t.is(service.vapidManager.getPrivateKey(), "priv456")
})

test.serial(
  "VapidConfigManager - should handle missing VAPID keys",
  async (t) => {
    sinon.stub(Setting, "get").resolves(null)

    const service = new WebPushNotificationService()
    await service.initialize()

    t.false(service.vapidManager.isConfigured())
    t.is(service.vapidManager.getPublicKey(), undefined)
    t.is(service.vapidManager.getPrivateKey(), undefined)
  },
)

test.serial(
  "VapidConfigManager - should handle partial VAPID keys",
  async (t) => {
    sinon.stub(Setting, "get").resolves({ publicKey: "pub123" })

    const service = new WebPushNotificationService()
    await service.initialize()

    t.false(service.vapidManager.isConfigured())
  },
)

test("VapidConfigManager - should support custom setting key", async (t) => {
  const customKey = "custom_vapid_keys"
  const vapidKeys = { publicKey: "pub", privateKey: "priv" }

  const stub = sinon.stub(Setting, "get")
  stub.withArgs(customKey).resolves(vapidKeys)
  stub.withArgs("notification_subscriptions").resolves([])

  const service = new WebPushNotificationService({
    vapidKeysSettingKey: customKey,
  })
  await service.initialize()

  t.true(Setting.get.calledWith(customKey))
  t.true(service.vapidManager.isConfigured())
})

// ============================================================
// SubscriptionManager Tests
// ============================================================

test.serial("SubscriptionManager - should load subscriptions", async (t) => {
  const subscriptions = [
    { endpoint: "https://push1.com" },
    { endpoint: "https://push2.com" },
  ]

  const stub = sinon.stub(Setting, "get")
  stub
    .withArgs("notification_vapid_keys")
    .resolves({ publicKey: "p", privateKey: "p" })
  stub.withArgs("notification_subscriptions").resolves(subscriptions)

  const service = new WebPushNotificationService()
  await service.initialize()

  t.is(service.subscriptionManager.count(), 2)
  t.false(service.subscriptionManager.isEmpty())
})

test.serial(
  "SubscriptionManager - should handle null subscriptions",
  async (t) => {
    const stub = sinon.stub(Setting, "get")
    stub
      .withArgs("notification_vapid_keys")
      .resolves({ publicKey: "p", privateKey: "p" })
    stub.withArgs("notification_subscriptions").resolves(null)

    const service = new WebPushNotificationService()
    await service.initialize()

    t.is(service.subscriptionManager.count(), 0)
    t.true(service.subscriptionManager.isEmpty())
  },
)

test.serial(
  "SubscriptionManager - should handle non-array subscriptions",
  async (t) => {
    const stub = sinon.stub(Setting, "get")
    stub
      .withArgs("notification_vapid_keys")
      .resolves({ publicKey: "p", privateKey: "p" })
    stub.withArgs("notification_subscriptions").resolves({ invalid: "data" })

    const service = new WebPushNotificationService()
    await service.initialize()

    t.is(service.subscriptionManager.count(), 0)
    t.true(service.subscriptionManager.isEmpty())
  },
)

test.serial(
  "SubscriptionManager - should remove invalid subscriptions",
  async (t) => {
    const subscriptions = [
      { endpoint: "https://push1.com" },
      { endpoint: "https://push2.com" },
      { endpoint: "https://push3.com" },
    ]

    const stub = sinon.stub(Setting, "get")
    stub
      .withArgs("notification_vapid_keys")
      .resolves({ publicKey: "p", privateKey: "p" })
    stub.withArgs("notification_subscriptions").resolves(subscriptions)

    const setStub = sinon.stub(Setting, "set").resolves()

    const service = new WebPushNotificationService()
    await service.initialize()

    const removed = await service.subscriptionManager.removeInvalid([0, 2])

    t.is(removed, 2)
    t.is(service.subscriptionManager.count(), 1)
    t.deepEqual(service.subscriptionManager.getAll(), [subscriptions[1]])
    t.true(setStub.calledOnce)
  },
)

test.serial(
  "SubscriptionManager - should support custom setting key",
  async (t) => {
    const customKey = "custom_subscriptions"
    const subscriptions = [{ endpoint: "https://push.com" }]

    const stub = sinon.stub(Setting, "get")
    stub
      .withArgs("notification_vapid_keys")
      .resolves({ publicKey: "p", privateKey: "p" })
    stub.withArgs(customKey).resolves(subscriptions)

    const service = new WebPushNotificationService({
      subscriptionsSettingKey: customKey,
    })
    await service.initialize()

    t.true(Setting.get.calledWith(customKey))
    t.is(service.subscriptionManager.count(), 1)
  },
)

// ============================================================
// NotificationSender Tests
// ============================================================

test.serial(
  "NotificationSender - should send notification successfully",
  async (t) => {
    const subscription = { endpoint: "https://push.com" }
    const message = { title: "Test", body: "Message" }

    const stub = sinon.stub(Setting, "get")
    stub
      .withArgs("notification_vapid_keys")
      .resolves({ publicKey: "p", privateKey: "p" })
    stub.withArgs("notification_subscriptions").resolves([subscription])

    const service = new WebPushNotificationService()
    await service.initialize()

    const result = await service.notify(message)

    t.true(result.success)
    t.is(result.total, 1)
    t.is(result.succeeded, 1)
    t.is(result.failed, 0)
    t.is(result.expired, 0)
    t.true(webpush.sendNotification.calledOnce)
  },
)

test.serial(
  "NotificationSender - should handle expired subscription (410)",
  async (t) => {
    const subscription = { endpoint: "https://push.com" }

    const stub = sinon.stub(Setting, "get")
    stub
      .withArgs("notification_vapid_keys")
      .resolves({ publicKey: "p", privateKey: "p" })
    stub.withArgs("notification_subscriptions").resolves([subscription])

    sinon.stub(Setting, "set").resolves()
    webpush.sendNotification.rejects({ statusCode: 410, message: "Gone" })

    const service = new WebPushNotificationService()
    await service.initialize()

    const result = await service.notify({ title: "Test" })

    t.true(result.success)
    t.is(result.expired, 1)
    t.true(Setting.set.calledOnce)
  },
)

test.serial(
  "NotificationSender - should handle expired subscription (404)",
  async (t) => {
    const subscription = { endpoint: "https://push.com" }

    const stub = sinon.stub(Setting, "get")
    stub
      .withArgs("notification_vapid_keys")
      .resolves({ publicKey: "p", privateKey: "p" })
    stub.withArgs("notification_subscriptions").resolves([subscription])

    sinon.stub(Setting, "set").resolves()
    webpush.sendNotification.rejects({ statusCode: 404, message: "Not Found" })

    const service = new WebPushNotificationService()
    await service.initialize()

    const result = await service.notify({ title: "Test" })

    t.is(result.expired, 1)
  },
)

test.serial(
  "NotificationSender - should handle general send error",
  async (t) => {
    const subscription = { endpoint: "https://push.com" }

    const stub = sinon.stub(Setting, "get")
    stub
      .withArgs("notification_vapid_keys")
      .resolves({ publicKey: "p", privateKey: "p" })
    stub.withArgs("notification_subscriptions").resolves([subscription])

    webpush.sendNotification.rejects({
      statusCode: 500,
      message: "Server Error",
    })

    const service = new WebPushNotificationService()
    await service.initialize()

    const result = await service.notify({ title: "Test" })

    t.true(result.success)
    t.is(result.succeeded, 0)
    t.is(result.failed, 1)
    t.is(result.expired, 0)
  },
)

test.serial(
  "NotificationSender - should handle multiple subscriptions",
  async (t) => {
    const subscriptions = [
      { endpoint: "https://push1.com" },
      { endpoint: "https://push2.com" },
      { endpoint: "https://push3.com" },
    ]

    const stub = sinon.stub(Setting, "get")
    stub
      .withArgs("notification_vapid_keys")
      .resolves({ publicKey: "p", privateKey: "p" })
    stub.withArgs("notification_subscriptions").resolves(subscriptions)

    sinon.stub(Setting, "set").resolves()

    // First succeeds, second expires, third fails
    webpush.sendNotification.onFirstCall().resolves()
    webpush.sendNotification.onSecondCall().rejects({ statusCode: 410 })
    webpush.sendNotification.onThirdCall().rejects({ statusCode: 500 })

    const service = new WebPushNotificationService()
    await service.initialize()

    const result = await service.notify({ title: "Test" })

    t.is(result.total, 3)
    t.is(result.succeeded, 1)
    t.is(result.failed, 1)
    t.is(result.expired, 1)
    t.is(webpush.sendNotification.callCount, 3)
  },
)

test.serial(
  "NotificationSender - should use custom proxy resolver",
  async (t) => {
    const customProxy = "http://custom-proxy:8080"
    const proxyResolver = () => customProxy

    const subscription = { endpoint: "https://push.com" }

    const stub = sinon.stub(Setting, "get")
    stub
      .withArgs("notification_vapid_keys")
      .resolves({ publicKey: "p", privateKey: "p" })
    stub.withArgs("notification_subscriptions").resolves([subscription])

    const service = new WebPushNotificationService({
      proxyResolver,
    })
    await service.initialize()

    await service.notify({ title: "Test" })

    const options = webpush.sendNotification.firstCall.args[2]
    t.is(options.proxy, customProxy)
  },
)

test.serial(
  "NotificationSender - should use default proxy from env",
  async (t) => {
    process.env.http_proxy = "http://env-proxy:8080"

    const subscription = { endpoint: "https://push.com" }

    const stub = sinon.stub(Setting, "get")
    stub
      .withArgs("notification_vapid_keys")
      .resolves({ publicKey: "p", privateKey: "p" })
    stub.withArgs("notification_subscriptions").resolves([subscription])

    const service = new WebPushNotificationService()
    await service.initialize()

    await service.notify({ title: "Test" })

    const options = webpush.sendNotification.firstCall.args[2]
    t.is(options.proxy, "http://env-proxy:8080")

    delete process.env.http_proxy
  },
)

test.serial(
  "NotificationSender - should use custom VAPID subject",
  async (t) => {
    const customSubject = "mailto:admin@example.com"
    const subscription = { endpoint: "https://push.com" }

    const stub = sinon.stub(Setting, "get")
    stub
      .withArgs("notification_vapid_keys")
      .resolves({ publicKey: "p", privateKey: "p" })
    stub.withArgs("notification_subscriptions").resolves([subscription])

    const service = new WebPushNotificationService({
      vapidSubject: customSubject,
    })
    await service.initialize()

    await service.notify({ title: "Test" })

    t.true(webpush.setVapidDetails.calledWith(customSubject, "p", "p"))
  },
)

// ============================================================
// WebPushNotificationService Integration Tests
// ============================================================

test.serial(
  "Service - should throw VapidNotConfiguredError when VAPID not configured",
  async (t) => {
    sinon.stub(Setting, "get").resolves(null)

    const service = new WebPushNotificationService()
    await service.initialize()

    const error = await t.throwsAsync(() => service.notify({ title: "Test" }), {
      instanceOf: VapidNotConfiguredError,
    })

    t.is(error.code, "VAPID_NOT_CONFIGURED")
    t.false(webpush.sendNotification.called)
  },
)

test.serial(
  "Service - should throw NoSubscriptionsError when no subscriptions",
  async (t) => {
    const stub = sinon.stub(Setting, "get")
    stub
      .withArgs("notification_vapid_keys")
      .resolves({ publicKey: "p", privateKey: "p" })
    stub.withArgs("notification_subscriptions").resolves([])

    const service = new WebPushNotificationService()
    await service.initialize()

    const error = await t.throwsAsync(() => service.notify({ title: "Test" }), {
      instanceOf: NoSubscriptionsError,
    })

    t.is(error.code, "NO_SUBSCRIPTIONS")
    t.false(webpush.sendNotification.called)
  },
)

test.serial("Service - should auto-initialize on first notify", async (t) => {
  const subscription = { endpoint: "https://push.com" }

  const stub = sinon.stub(Setting, "get")
  stub
    .withArgs("notification_vapid_keys")
    .resolves({ publicKey: "p", privateKey: "p" })
  stub.withArgs("notification_subscriptions").resolves([subscription])

  const service = new WebPushNotificationService()

  // Don't call initialize manually
  const result = await service.notify({ title: "Test" })

  t.true(result.success)
  t.true(service._initialized)
})

test.serial("Service - should not initialize twice", async (t) => {
  const subscription = { endpoint: "https://push.com" }

  const stub = sinon.stub(Setting, "get")
  stub
    .withArgs("notification_vapid_keys")
    .resolves({ publicKey: "p", privateKey: "p" })
  stub.withArgs("notification_subscriptions").resolves([subscription])

  const service = new WebPushNotificationService()
  await service.initialize()
  await service.initialize() // Second call

  t.is(Setting.get.callCount, 2) // Should only be called once per key
})

test.serial("Service - should throw on unexpected error", async (t) => {
  sinon.stub(Setting, "get").rejects(new Error("Database error"))

  const service = new WebPushNotificationService()

  await t.throwsAsync(() => service.notify({ title: "Test" }), {
    message: "Database error",
  })
})

test.serial(
  "Service - should include detailed results in summary",
  async (t) => {
    const subscriptions = [
      { endpoint: "https://push1.com" },
      { endpoint: "https://push2.com" },
    ]

    const stub = sinon.stub(Setting, "get")
    stub
      .withArgs("notification_vapid_keys")
      .resolves({ publicKey: "p", privateKey: "p" })
    stub.withArgs("notification_subscriptions").resolves(subscriptions)

    sinon.stub(Setting, "set").resolves()
    webpush.sendNotification.onFirstCall().resolves()
    webpush.sendNotification.onSecondCall().rejects({ statusCode: 410 })

    const service = new WebPushNotificationService()
    await service.initialize()

    const result = await service.notify({ title: "Test" })

    t.true(Array.isArray(result.results))
    t.is(result.results.length, 2)
    t.true(result.results[0].success)
    t.false(result.results[1].success)
    t.true(result.results[1].isExpired)
  },
)

// ============================================================
// getNotificationService Tests
// ============================================================

test.serial(
  "getNotificationService - should return singleton instance",
  async (t) => {
    const subscription = { endpoint: "https://push.com" }

    const stub = sinon.stub(Setting, "get")
    stub
      .withArgs("notification_vapid_keys")
      .resolves({ publicKey: "p", privateKey: "p" })
    stub.withArgs("notification_subscriptions").resolves([subscription])

    const service1 = await getNotificationService()
    const service2 = await getNotificationService()

    t.is(service1, service2)
  },
)

test.serial(
  "getNotificationService - should create separate instances for different vapidSubjects",
  async (t) => {
    const subscription = { endpoint: "https://push.com" }

    const stub = sinon.stub(Setting, "get")
    stub
      .withArgs("notification_vapid_keys")
      .resolves({ publicKey: "p", privateKey: "p" })
    stub.withArgs("notification_subscriptions").resolves([subscription])

    const service1 = await getNotificationService({
      vapidSubject: "https://site1.com",
    })
    const service2 = await getNotificationService({
      vapidSubject: "https://site2.com",
    })

    t.not(service1, service2)
  },
)

test.serial("getNotificationService - should auto-initialize", async (t) => {
  const subscription = { endpoint: "https://push.com" }

  const stub = sinon.stub(Setting, "get")
  stub
    .withArgs("notification_vapid_keys")
    .resolves({ publicKey: "p", privateKey: "p" })
  stub.withArgs("notification_subscriptions").resolves([subscription])

  const service = await getNotificationService()

  t.true(service._initialized)
})

test.serial(
  "clearServiceInstances - should clear all cached instances",
  async (t) => {
    const subscription = { endpoint: "https://push.com" }

    const stub = sinon.stub(Setting, "get")
    stub
      .withArgs("notification_vapid_keys")
      .resolves({ publicKey: "p", privateKey: "p" })
    stub.withArgs("notification_subscriptions").resolves([subscription])

    const service1 = await getNotificationService()
    clearServiceInstances()
    const service2 = await getNotificationService()

    t.not(service1, service2)
  },
)

// ============================================================
// Error Classes Tests
// ============================================================

test.serial("VapidNotConfiguredError - should have correct properties", (t) => {
  const error = new VapidNotConfiguredError()

  t.is(error.name, "VapidNotConfiguredError")
  t.is(error.code, "VAPID_NOT_CONFIGURED")
  t.is(error.message, "VAPID keys not configured")
})

test.serial("VapidNotConfiguredError - should accept custom message", (t) => {
  const customMessage = "Custom error message"
  const error = new VapidNotConfiguredError(customMessage)

  t.is(error.message, customMessage)
  t.is(error.code, "VAPID_NOT_CONFIGURED")
})

test.serial("NoSubscriptionsError - should have correct properties", (t) => {
  const error = new NoSubscriptionsError()

  t.is(error.name, "NoSubscriptionsError")
  t.is(error.code, "NO_SUBSCRIPTIONS")
  t.is(error.message, "No subscriptions available")
})

test.serial("NoSubscriptionsError - should accept custom message", (t) => {
  const customMessage = "Custom error message"
  const error = new NoSubscriptionsError(customMessage)

  t.is(error.message, customMessage)
  t.is(error.code, "NO_SUBSCRIPTIONS")
})

// ============================================================
// Edge Cases
// ============================================================

test.serial("Service - should handle empty message", async (t) => {
  const subscription = { endpoint: "https://push.com" }

  const stub = sinon.stub(Setting, "get")
  stub
    .withArgs("notification_vapid_keys")
    .resolves({ publicKey: "p", privateKey: "p" })
  stub.withArgs("notification_subscriptions").resolves([subscription])

  const service = new WebPushNotificationService()
  await service.initialize()

  const result = await service.notify({})

  t.true(result.success)
  t.true(
    webpush.sendNotification.calledWith(
      subscription,
      JSON.stringify({}),
      sinon.match.any,
    ),
  )
})

test.serial("Service - should serialize complex message", async (t) => {
  const subscription = { endpoint: "https://push.com" }
  const complexMessage = {
    title: "Test",
    body: "Body",
    data: { id: 123, nested: { value: "abc" } },
    actions: [{ action: "open", title: "Open" }],
  }

  const stub = sinon.stub(Setting, "get")
  stub
    .withArgs("notification_vapid_keys")
    .resolves({ publicKey: "p", privateKey: "p" })
  stub.withArgs("notification_subscriptions").resolves([subscription])

  const service = new WebPushNotificationService()
  await service.initialize()

  await service.notify(complexMessage)

  t.true(
    webpush.sendNotification.calledWith(
      subscription,
      JSON.stringify(complexMessage),
      sinon.match.any,
    ),
  )
})

test.serial(
  "Service - should return zero expired when no subscriptions expired",
  async (t) => {
    const subscription = { endpoint: "https://push.com" }

    const stub = sinon.stub(Setting, "get")
    stub
      .withArgs("notification_vapid_keys")
      .resolves({ publicKey: "p", privateKey: "p" })
    stub.withArgs("notification_subscriptions").resolves([subscription])

    const service = new WebPushNotificationService()
    await service.initialize()

    const result = await service.notify({ title: "Test" })

    t.is(result.expired, 0)
    t.is(result.succeeded, 1)
  },
)

test.serial(
  "Service - should not save when no invalid subscriptions",
  async (t) => {
    const subscription = { endpoint: "https://push.com" }

    const stub = sinon.stub(Setting, "get")
    stub
      .withArgs("notification_vapid_keys")
      .resolves({ publicKey: "p", privateKey: "p" })
    stub.withArgs("notification_subscriptions").resolves([subscription])

    const setStub = sinon.stub(Setting, "set").resolves()

    const service = new WebPushNotificationService()
    await service.initialize()

    await service.notify({ title: "Test" })

    // Should not call Setting.set since no subscriptions were removed
    t.false(setStub.called)
  },
)
