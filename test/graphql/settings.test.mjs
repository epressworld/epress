import test from "ava"
import { Setting } from "../../server/models/index.mjs"
import { TEST_ETHEREUM_ADDRESS_NODE_A } from "../setup.mjs"

test.beforeEach(async (_t) => {
  await Setting.knex()("settings").where({ key: "pwa_app_name" }).delete()
})

test("settings query should return settings data", async (t) => {
  const { graphqlClient } = t.context
  await Setting.set("enableRSS", "true")

  const query = `
    query GetSettings {
      settings {
        enableRSS
        allowFollow
        allowComment
        defaultLanguage
        defaultTheme
      }
    }
  `

  const { data, errors } = await graphqlClient.query(query, {})

  t.falsy(errors, "Should not have any GraphQL errors")
  t.truthy(data.settings, "Settings data should exist")

  t.is(data.settings.enableRSS, true, "enableRSS should be true")
  t.is(data.settings.allowFollow, true, "allowFollow should be true")
  t.is(data.settings.allowComment, true, "allowComment should be true")
  t.is(data.settings.defaultLanguage, "en", "defaultLanguage should be en")
  t.is(data.settings.defaultTheme, "light", "defaultTheme should be light")
})

test("settings query should return pwaAppName when not set", async (t) => {
  const { graphqlClient } = t.context

  const query = `
    query GetSettings {
      settings {
        pwaAppName
      }
    }
  `

  const { data, errors } = await graphqlClient.query(query, {})

  t.falsy(errors, "Should not have any GraphQL errors")
  t.truthy(data.settings, "Settings data should exist")
  t.is(data.settings.pwaAppName, null, "pwaAppName should be null when not set")
})

test("settings query should return pwaAppName when set", async (t) => {
  const { graphqlClient } = t.context
  await Setting.set("pwa_app_name", "My Custom App")

  const query = `
    query GetSettings {
      settings {
        pwaAppName
      }
    }
  `

  const { data, errors } = await graphqlClient.query(query, {})

  t.falsy(errors, "Should not have any GraphQL errors")
  t.truthy(data.settings, "Settings data should exist")
  t.is(
    data.settings.pwaAppName,
    "My Custom App",
    "pwaAppName should be 'My Custom App'",
  )
})

test("updateSettings mutation should update a public setting with valid JWT", async (t) => {
  const { graphqlClient, createClientJwt } = t.context

  const ownerAddress = TEST_ETHEREUM_ADDRESS_NODE_A
  const token = await createClientJwt(ownerAddress)

  const mutation = `
    mutation UpdateSettings($input: UpdateSettingsInput!) {
      updateSettings(input: $input) {
        enableRSS
        allowFollow
      }
    }
  `

  const input = { enableRSS: false }

  const { data, errors } = await graphqlClient.query(mutation, {
    variables: { input },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  t.falsy(errors, "Should not have any GraphQL errors")
  t.truthy(data.updateSettings, "Should return updated settings data")
  t.is(
    data.updateSettings.enableRSS,
    false,
    "enableRSS should be updated to false",
  )

  t.is(
    data.updateSettings.allowFollow,
    true,
    "allowFollow should remain unchanged",
  )

  await Setting.knex()("settings")
    .where({ key: "enable_rss" })
    .update({ value: "true" })
})

test("updateSettings mutation should update pwaAppName with valid JWT", async (t) => {
  const { graphqlClient, createClientJwt } = t.context

  const ownerAddress = TEST_ETHEREUM_ADDRESS_NODE_A
  const token = await createClientJwt(ownerAddress)

  const mutation = `
    mutation UpdateSettings($input: UpdateSettingsInput!) {
      updateSettings(input: $input) {
        pwaAppName
      }
    }
  `

  const input = { pwaAppName: "My PWA App" }

  const { data, errors } = await graphqlClient.query(mutation, {
    variables: { input },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  t.falsy(errors, "Should not have any GraphQL errors")
  t.truthy(data.updateSettings, "Should return updated settings data")
  t.is(
    data.updateSettings.pwaAppName,
    "My PWA App",
    "pwaAppName should be updated to 'My PWA App'",
  )

  const savedValue = await Setting.get("pwa_app_name")
  t.is(savedValue, "My PWA App", "pwa_app_name should be saved in database")

  await Setting.knex()("settings").where({ key: "pwa_app_name" }).delete()
})

test("updateSettings mutation should update a private setting with valid JWT", async (t) => {
  const { graphqlClient, createClientJwt } = t.context

  const ownerAddress = TEST_ETHEREUM_ADDRESS_NODE_A
  const token = await createClientJwt(ownerAddress)

  const mutation = `
    mutation UpdateSettings($input: UpdateSettingsInput!) {
      updateSettings(input: $input) {
        enableRSS
        allowFollow
      }
    }
  `

  const input = { allowFollow: false }

  const { data, errors } = await graphqlClient.query(mutation, {
    variables: { input },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  t.falsy(errors, "Should not have any GraphQL errors")
  t.truthy(data.updateSettings, "Should return updated settings data")
  t.is(
    data.updateSettings.allowFollow,
    false,
    "allowFollow should be updated to false",
  )

  await Setting.knex()("settings")
    .where({ key: "allow_follow" })
    .update({ value: "true" })
})

test("updateSettings mutation should return 401 Unauthorized without JWT", async (t) => {
  const { graphqlClient } = t.context

  const mutation = `
    mutation UpdateSettings($input: UpdateSettingsInput!) {
      updateSettings(input: $input) {
        enableRSS
      }
    }
  `

  const input = { enableRSS: false }

  const { data, errors } = await graphqlClient.query(mutation, {
    variables: { input },
  })

  t.truthy(errors, "Should return GraphQL errors")
  t.is(data, null, "Data should be null")
  t.true(
    errors.some((e) => e.extensions?.code === "UNAUTHENTICATED"),
    "Error code should be UNAUTHENTICATED",
  )
})

test("updateSettings mutation should return 401 Unauthorized with invalid JWT", async (t) => {
  const { graphqlClient } = t.context

  const mutation = `
    mutation UpdateSettings($input: UpdateSettingsInput!) {
      updateSettings(input: $input) {
        enableRSS
      }
    }
  `

  const input = { enableRSS: false }
  const invalidToken = "invalid.jwt.token"

  const { data, errors } = await graphqlClient.query(mutation, {
    variables: { input },
    headers: {
      Authorization: `Bearer ${invalidToken}`,
    },
  })

  t.truthy(errors, "Should return GraphQL errors")
  t.is(data, null, "Data should be null")
  t.true(
    errors.some((e) => e.extensions?.code === "UNAUTHENTICATED"),
    "Error code should be UNAUTHENTICATED",
  )
})

test("updateSettings mutation should return VALIDATION_FAILED for invalid input type", async (t) => {
  const { graphqlClient, createClientJwt } = t.context
  const token = await createClientJwt(TEST_ETHEREUM_ADDRESS_NODE_A)

  const mutation = `
    mutation UpdateSettings($input: UpdateSettingsInput!) {
      updateSettings(input: $input) {
        enableRSS
      }
    }
  `

  const input = { enableRSS: "not-a-boolean" }

  const { data, errors } = await graphqlClient.query(mutation, {
    variables: { input },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  t.truthy(errors, "Should return GraphQL errors")
  t.is(data, null, "Data should be null")
  t.true(
    errors.some((e) =>
      e.message.includes("Boolean cannot represent a non boolean value"),
    ),
    "Error message should indicate type mismatch",
  )
})

test.serial(
  "updateSettings mutation should update allowComment setting with valid JWT",
  async (t) => {
    const { graphqlClient, createClientJwt } = t.context
    const token = await createClientJwt(TEST_ETHEREUM_ADDRESS_NODE_A)

    const mutation = `
    mutation UpdateSettings($input: UpdateSettingsInput!) {
      updateSettings(input: $input) {
        enableRSS
        allowFollow
        allowComment
      }
    }
  `

    const input = { allowComment: false }

    const { data, errors } = await graphqlClient.query(mutation, {
      variables: { input },
      headers: { Authorization: `Bearer ${token}` },
    })

    t.falsy(errors, "Should not have any GraphQL errors")
    t.truthy(data.updateSettings, "updateSettings should return data")
    t.is(
      data.updateSettings.allowComment,
      false,
      "allowComment should be updated to false",
    )
    t.is(
      data.updateSettings.enableRSS,
      true,
      "enableRSS should remain unchanged",
    )
    t.is(
      data.updateSettings.allowFollow,
      true,
      "allowFollow should remain unchanged",
    )

    await Setting.knex()("settings")
      .where({ key: "allow_comment" })
      .update({ value: "true" })
  },
)

test.serial(
  "settings query should return vapidPublicKey when configured",
  async (t) => {
    const { graphqlClient } = t.context

    const query = `
    query GetSettings {
      settings {
        vapidPublicKey
      }
    }
  `

    const { data, errors } = await graphqlClient.query(query, {})

    t.falsy(errors, "Should not have any GraphQL errors")
    t.truthy(data.settings, "Settings data should exist")
    t.true(
      data.settings.vapidPublicKey.length > 0,
      "vapidPublicKey should be returned",
    )
  },
)

test.serial(
  "settings query should return vapidPublicKey without authentication",
  async (t) => {
    const { graphqlClient } = t.context

    await Setting.set("notification_vapid_keys", {
      publicKey: "test-vapid-public-key-12345",
    })

    const query = `
    query GetSettings {
      settings {
        vapidPublicKey
      }
    }
  `

    const { data, errors } = await graphqlClient.query(query, {})

    t.falsy(errors, "Should not have any GraphQL errors")
    t.truthy(data.settings, "Settings data should exist")
    t.true(
      data.settings.vapidPublicKey.length > 0,
      "vapidPublicKey should be accessible without authentication",
    )
  },
)

test.serial(
  "subscribeNotification should save new subscription with valid JWT",
  async (t) => {
    const { graphqlClient, createClientJwt } = t.context
    const token = await createClientJwt(TEST_ETHEREUM_ADDRESS_NODE_A)

    const mutation = `
    mutation subscribe($subscription: PushSubscriptionInput!) {
      subscribeNotification(subscription: $subscription) {
        success
        message
      }
    }
  `

    const subscription = {
      endpoint: "https://push.example.com/subscription/test123",
      keys: {
        p256dh: "test-p256dh-key",
        auth: "test-auth-key",
      },
    }

    const { data, errors } = await graphqlClient.query(mutation, {
      variables: { subscription },
      headers: { Authorization: `Bearer ${token}` },
    })

    t.falsy(errors, "Should not have any GraphQL errors")
    t.truthy(data.subscribeNotification, "subscribe should return data")
    t.true(data.subscribeNotification.success, "success should be true")
    t.truthy(data.subscribeNotification.message, "message should exist")

    const savedSubscriptions = await Setting.get("notification_subscriptions")
    t.truthy(savedSubscriptions, "Subscriptions should be saved")
    t.is(savedSubscriptions.length, 1, "Should have one subscription")
    t.is(
      savedSubscriptions[0].endpoint,
      subscription.endpoint,
      "Endpoint should match",
    )

    await Setting.set("notification_subscriptions", [])
  },
)

test.serial(
  "saveSubscription should return UNAUTHENTICATED without JWT",
  async (t) => {
    const { graphqlClient } = t.context

    const mutation = `
    mutation subscribe($subscription: PushSubscriptionInput!) {
      subscribeNotification(subscription: $subscription) {
        success
        message
      }
    }
  `

    const subscription = {
      endpoint: "https://push.example.com/subscription/test123",
      keys: {
        p256dh: "test-p256dh-key",
        auth: "test-auth-key",
      },
    }

    const { data, errors } = await graphqlClient.query(mutation, {
      variables: { subscription },
    })

    t.truthy(errors, "Should return GraphQL errors")
    t.is(data, null, "Data should be null")
    t.true(
      errors.some((e) => e.extensions?.code === "UNAUTHENTICATED"),
      "Error code should be UNAUTHENTICATED",
    )
  },
)

test.serial(
  "subscribeNotification should update existing subscription with same endpoint",
  async (t) => {
    const { graphqlClient, createClientJwt } = t.context
    const token = await createClientJwt(TEST_ETHEREUM_ADDRESS_NODE_A)

    const mutation = `
    mutation subscribe($subscription: PushSubscriptionInput!) {
      subscribeNotification(subscription: $subscription) {
        success
        message
      }
    }
  `

    const subscription1 = {
      endpoint: "https://push.example.com/subscription/test123",
      keys: {
        p256dh: "test-p256dh-key-old",
        auth: "test-auth-key-old",
      },
    }

    await graphqlClient.query(mutation, {
      variables: { subscription: subscription1 },
      headers: { Authorization: `Bearer ${token}` },
    })

    const subscription2 = {
      endpoint: "https://push.example.com/subscription/test123",
      keys: {
        p256dh: "test-p256dh-key-new",
        auth: "test-auth-key-new",
      },
    }

    const { data, errors } = await graphqlClient.query(mutation, {
      variables: { subscription: subscription2 },
      headers: { Authorization: `Bearer ${token}` },
    })

    t.falsy(errors, "Should not have any GraphQL errors")
    t.true(data.subscribeNotification.success, "success should be true")

    const savedSubscriptions = await Setting.get("notification_subscriptions")
    t.is(savedSubscriptions.length, 1, "Should still have one subscription")
    t.is(
      savedSubscriptions[0].keys.p256dh,
      "test-p256dh-key-new",
      "Keys should be updated",
    )

    await Setting.set("notification_subscriptions", [])
  },
)

test.serial(
  "subscribeNotification should handle multiple subscriptions from different devices",
  async (t) => {
    const { graphqlClient, createClientJwt } = t.context
    const token = await createClientJwt(TEST_ETHEREUM_ADDRESS_NODE_A)

    const mutation = `
    mutation subscribe($subscription: PushSubscriptionInput!) {
      subscribeNotification(subscription: $subscription) {
        success
        message
      }
    }
  `

    const subscription1 = {
      endpoint: "https://push.example.com/subscription/device1",
      keys: {
        p256dh: "device1-p256dh",
        auth: "device1-auth",
      },
    }

    const subscription2 = {
      endpoint: "https://push.example.com/subscription/device2",
      keys: {
        p256dh: "device2-p256dh",
        auth: "device2-auth",
      },
    }

    await graphqlClient.query(mutation, {
      variables: { subscription: subscription1 },
      headers: { Authorization: `Bearer ${token}` },
    })

    const { data, errors } = await graphqlClient.query(mutation, {
      variables: { subscription: subscription2 },
      headers: { Authorization: `Bearer ${token}` },
    })

    t.falsy(errors, "Should not have any GraphQL errors")
    t.true(data.subscribeNotification.success, "success should be true")

    const savedSubscriptions = await Setting.get("notification_subscriptions")
    t.is(savedSubscriptions.length, 2, "Should have two subscriptions")
    t.truthy(
      savedSubscriptions.find((s) => s.endpoint === subscription1.endpoint),
      "First subscription should exist",
    )
    t.truthy(
      savedSubscriptions.find((s) => s.endpoint === subscription2.endpoint),
      "Second subscription should exist",
    )

    await Setting.set("notification_subscriptions", [])
  },
)

test.serial("unsubscribeNotification should remove subscription", async (t) => {
  const { graphqlClient, createClientJwt } = t.context
  const token = await createClientJwt(TEST_ETHEREUM_ADDRESS_NODE_A)

  const subscribeMutation = `
    mutation subscribe($subscription: PushSubscriptionInput!) {
      subscribeNotification(subscription: $subscription) {
        success
        message
      }
    }
  `
  const unsubscribeMutation = `
    mutation unsubscribe($endpoint: String!) {
      unsubscribeNotification(endpoint: $endpoint) {
        success
        message
      }
    }
  `

  const subscription1 = {
    endpoint: "https://push.example.com/subscription/device_to_unscribe",
    keys: {
      p256dh: "device1-p256dh",
      auth: "device1-auth",
    },
  }

  const { data: subscribeData } = await graphqlClient.query(subscribeMutation, {
    variables: { subscription: subscription1 },
    headers: { Authorization: `Bearer ${token}` },
  })
  t.true(
    subscribeData.subscribeNotification.success,
    "subscribe should be true",
  )

  const { data, errors } = await graphqlClient.query(unsubscribeMutation, {
    variables: { endpoint: subscription1.endpoint },
    headers: { Authorization: `Bearer ${token}` },
  })

  t.falsy(errors, "Should not have any GraphQL errors")
  t.true(data.unsubscribeNotification.success, "success should be true")

  const savedSubscriptions = await Setting.get("notification_subscriptions")
  t.is(savedSubscriptions.length, 0, "Should have 0 subscriptions")
})
