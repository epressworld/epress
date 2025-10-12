// test/graphql/settings.test.mjs
import test from "ava"
import { Setting } from "../../server/models/index.mjs"
import { TEST_ETHEREUM_ADDRESS_NODE_A } from "../setup.mjs"

test("settings query should return settings data without mailTransport", async (t) => {
  const { graphqlClient } = t.context
  await Setting.set("mail_transport", "test")

  const query = `
    query GetSettings {
      settings {
        enableRSS
        allowFollow
        allowComment
        defaultLanguage
        defaultTheme
        mailTransport
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
  t.is(data.settings.defaultTheme, "light", "defaultLanguage should be light")
  t.is(data.settings.mailTransport, "", "defaultLanguage should be empty")
})

test("settings query should return settings data with mailTransport", async (t) => {
  const { graphqlClient } = t.context

  await Setting.set("mail_transport", "test")
  const query = `
    query GetSettings {
      settings {
        enableRSS
        allowFollow
        allowComment
        defaultLanguage
        defaultTheme
        mailTransport
      }
    }
  `

  // Arrange: Get valid JWT for self node owner
  const ownerAddress = TEST_ETHEREUM_ADDRESS_NODE_A
  const token = t.context.createClientJwt(ownerAddress)

  const { data, errors } = await graphqlClient.query(query, {
    headers: {
      authorization: `Bearer ${token}`,
    },
  })

  t.falsy(errors, "Should not have any GraphQL errors")
  t.truthy(data.settings, "Settings data should exist")

  t.is(data.settings.enableRSS, true, "enableRSS should be true")
  t.is(data.settings.allowFollow, true, "allowFollow should be true")
  t.is(data.settings.allowComment, true, "allowComment should be true")
  t.is(data.settings.defaultLanguage, "en", "defaultLanguage should be en")
  t.is(data.settings.mailTransport, "test", "mailTransport should be test")
})

// Test case 2: Successfully update settings
test("updateSettings mutation should update a public setting with valid JWT", async (t) => {
  const { graphqlClient } = t.context

  // Arrange: Get valid JWT for self node owner
  const ownerAddress = TEST_ETHEREUM_ADDRESS_NODE_A
  const token = t.context.createClientJwt(ownerAddress)

  // Act: Send mutation to update enableRSS
  const mutation = `
    mutation UpdateSettings($input: UpdateSettingsInput!) {
      updateSettings(input: $input) {
        enableRSS
        allowFollow
      }
    }
  `

  const input = { enableRSS: false } // Change enableRSS from true to false

  const { data, errors } = await graphqlClient.query(mutation, {
    variables: { input },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  // Assertions
  t.falsy(errors, "Should not have any GraphQL errors")
  t.truthy(data.updateSettings, "Should return updated settings data")
  t.is(
    data.updateSettings.enableRSS,
    false,
    "enableRSS should be updated to false",
  )

  // Verify other settings remain unchanged
  t.is(
    data.updateSettings.allowFollow,
    true,
    "allowFollow should remain unchanged",
  )

  // Cleanup: Reset settings for subsequent tests
  await Setting.knex()("settings")
    .where({ key: "enable_rss" })
    .update({ value: "true" })
})

// Test case 3: Successfully update another setting
test("updateSettings mutation should update a private setting with valid JWT", async (t) => {
  const { graphqlClient } = t.context

  // Prepare: Get valid JWT for self node owner
  const ownerAddress = TEST_ETHEREUM_ADDRESS_NODE_A
  const token = t.context.createClientJwt(ownerAddress)

  // Execute: Send mutation to update someSecretKey
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

  // Assertions
  t.falsy(errors, "Should not have any GraphQL errors")
  t.truthy(data.updateSettings, "Should return updated settings data")
  t.is(
    data.updateSettings.allowFollow,
    false,
    "allowFollow should be updated to false",
  )

  // Cleanup: Reset settings for subsequent tests
  await Setting.knex()("settings")
    .where({ key: "allow_follow" })
    .update({ value: "true" })
})

// Test case 4: Unauthenticated failure
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

// Test case 5: Invalid JWT failure
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

// Test case 6: Input type validation failure
test("updateSettings mutation should return VALIDATION_FAILED for invalid input type", async (t) => {
  const { graphqlClient } = t.context
  const token = t.context.createClientJwt(TEST_ETHEREUM_ADDRESS_NODE_A)

  const mutation = `
    mutation UpdateSettings($input: UpdateSettingsInput!) {
      updateSettings(input: $input) {
        enableRSS
      }
    }
  `

  const input = { enableRSS: "not-a-boolean" } // Invalid type

  const { data, errors } = await graphqlClient.query(mutation, {
    variables: { input },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  t.truthy(errors, "Should return GraphQL errors")
  t.is(data, null, "Data should be null")
  console.log(errors)
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
    const { graphqlClient } = t.context
    const token = t.context.createClientJwt(TEST_ETHEREUM_ADDRESS_NODE_A)

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

    // Cleanup: Restore original value
    await Setting.knex()("settings")
      .where({ key: "allow_comment" })
      .update({ value: "true" })
  },
)
