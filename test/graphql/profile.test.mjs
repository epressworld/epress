import fs from "node:fs"
import test from "ava"
import nock from "nock"
import { Connection, Node, Setting } from "../../server/models/index.mjs"
import {
  createGraphQLUploadRequest,
  generateSignature,
  TEST_ACCOUNT_NODE_A,
  TEST_ETHEREUM_ADDRESS_NODE_A,
  TEST_NODE_A,
} from "../setup.mjs"

// EIP-712 comment signature typed data structure (CREATE)
const PROFILE_UPDATE_DOMAIN = {
  name: "epress world",
  version: "1",
  chainId: 1, // Temporarily assume chainId is 1
}

const PROFILE_UPDATE_TYPES = {
  EIP712Domain: [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "chainId", type: "uint256" },
  ],
  NodeProfileUpdate: [
    { name: "publisherAddress", type: "address" },
    { name: "url", type: "string" },
    { name: "title", type: "string" },
    { name: "description", type: "string" },
    { name: "profileVersion", type: "uint256" },
    { name: "timestamp", type: "uint256" },
  ],
}

test.afterEach.always(async () => {
  // Restore the original state of the self node
  const selfNode = await Node.query().findOne({ is_self: true })
  if (selfNode) {
    await selfNode.$query().patch({
      title: TEST_NODE_A.title,
      description: TEST_NODE_A.description,
      url: TEST_NODE_A.url,
      profile_version: 0,
    })
  }
  // Clean up any other nodes and connections created in tests
  await Connection.query().delete()
  await Node.query().where("is_self", false).delete()
})

test("Success: profile query should return the self node public info", async (t) => {
  const { graphqlClient, selfNode } = t.context

  const query = `
    query GetProfile {
      profile {
        address
        url
        title
        description
        profile_version
        created_at
      }
    }
  `

  const { data, errors } = await graphqlClient.query(query, {})

  t.falsy(errors, "Should not have any GraphQL errors")

  t.truthy(data.profile, "Profile data should exist")
  t.is(
    data.profile.address,
    TEST_NODE_A.address,
    "Ethereum address should match",
  )
  t.is(data.profile.url, TEST_NODE_A.url, "URL should match")
  t.is(data.profile.title, TEST_NODE_A.title, "Title should match")
  t.is(
    data.profile.description,
    TEST_NODE_A.description,
    "Description should match",
  )
  t.is(
    data.profile.profile_version,
    selfNode.profile_version,
    "Profile version should match",
  )

  // Assertions for the new field
  t.truthy(data.profile.created_at, "created_at should exist")
  t.is(
    data.profile.created_at,
    new Date(selfNode.created_at).toISOString(),
    "created_at should match the node creation time",
  )
  t.false(
    Number.isNaN(new Date(data.profile.created_at).getTime()),
    "created_at should be a valid date string",
  )
})

// --- updateProfile Mutation Tests ---

test.serial(
  "updateProfile: Authenticated user should be able to successfully update profile",
  async (t) => {
    const { graphqlClient, selfNode } = t.context
    const token = t.context.createClientJwt(TEST_ETHEREUM_ADDRESS_NODE_A)

    const mutation = `
    mutation UpdateProfile($input: UpdateProfileInput!) {
      updateProfile(input: $input) {
        title
        description
        address
        url
        profile_version
      }
    }
  `
    const variables = {
      input: {
        title: "My New Blog Title",
        description: "A short new personal description.",
        url: "https://example.com",
      },
    }

    const { data, errors } = await graphqlClient.query(mutation, {
      variables,
      headers: { Authorization: `Bearer ${token}` },
    })

    t.falsy(errors, "A valid request should not return any GraphQL errors")
    t.is(
      data.updateProfile.title,
      variables.input.title,
      "Returned title should be updated",
    )
    t.is(
      data.updateProfile.description,
      variables.input.description,
      "Returned description should be updated",
    )
    t.is(
      data.updateProfile.url,
      variables.input.url,
      "Returned URL should be updated",
    )
    t.is(
      data.updateProfile.profile_version,
      selfNode.profile_version + 1,
      "Returned version should be updated",
    )

    const _selfNode = await Node.query().findOne({ is_self: true })
    t.is(
      _selfNode.title,
      variables.input.title,
      "Title in database should be updated",
    )
    t.is(
      _selfNode.description,
      variables.input.description,
      "Description in database should be updated",
    )
    t.is(
      _selfNode.url,
      variables.input.url,
      "URL in database should be updated",
    )
  },
)

test("updateProfile: Unauthenticated user should not be able to update profile", async (t) => {
  const { graphqlClient } = t.context

  const mutation = `
    mutation UpdateProfile($input: UpdateProfileInput!) {
      updateProfile(input: $input) {
        title
      }
    }
  `
  const variables = {
    input: {
      title: "This operation should not succeed",
    },
  }

  const { data, errors } = await graphqlClient.query(mutation, { variables })

  t.truthy(errors, "An unauthenticated request should return GraphQL errors")
  t.is(
    data.updateProfile,
    null,
    "When error occurs, data.updateProfile field should be null",
  )

  const hasAuthError = errors.some(
    (e) => e.extensions?.code === "UNAUTHENTICATED",
  )
  t.true(
    hasAuthError,
    "Error should be authentication failure error (UNAUTHENTICATED)",
  )
})

test("updateProfile: Should return validation error if title is too long", async (t) => {
  const { graphqlClient } = t.context
  const token = t.context.createClientJwt(TEST_ETHEREUM_ADDRESS_NODE_A)

  const mutation = `
      mutation UpdateProfile($input: UpdateProfileInput!) {
        updateProfile(input: $input) {
          title
        }
      }
    `
  const variables = {
    input: {
      title: "a".repeat(256),
    },
  }

  const { data, errors } = await graphqlClient.query(mutation, {
    variables,
    headers: { Authorization: `Bearer ${token}` },
  })

  t.truthy(errors, "Invalid input should return GraphQL errors")
  t.is(
    data.updateProfile,
    null,
    "When error occurs, data.updateProfile field should be null",
  )

  const hasValidationError = errors.some(
    (e) => e.extensions?.code === "VALIDATION_FAILED",
  )
  t.true(
    hasValidationError,
    "Error should be validation failure error (VALIDATION_FAILED)",
  )
})

test.serial(
  "updateProfile: Should be able to successfully update URL field",
  async (t) => {
    const { graphqlClient, selfNode } = t.context
    const token = t.context.createClientJwt(TEST_ETHEREUM_ADDRESS_NODE_A)

    const mutation = `
    mutation UpdateProfile($input: UpdateProfileInput!) {
      updateProfile(input: $input) {
        title
        description
        address
        url
        profile_version
      }
    }
  `
    const variables = {
      input: {
        title: "My New Blog Title",
        description: "A short new personal description.",
        url: "https://new-node-url.example.com",
      },
    }

    const { data, errors } = await graphqlClient.query(mutation, {
      variables,
      headers: { Authorization: `Bearer ${token}` },
    })

    t.falsy(errors, "A valid request should not return any GraphQL errors")
    t.is(
      data.updateProfile.title,
      variables.input.title,
      "Returned title should be updated",
    )
    t.is(
      data.updateProfile.description,
      variables.input.description,
      "Returned description should be updated",
    )
    t.is(
      data.updateProfile.url,
      variables.input.url,
      "Returned URL should be updated",
    )
    t.is(
      data.updateProfile.profile_version,
      selfNode.profile_version + 1,
      "Returned version should be updated",
    )

    const _selfNode = await Node.query().findOne({ is_self: true })
    t.is(
      _selfNode.title,
      variables.input.title,
      "Title in database should be updated",
    )
    t.is(
      _selfNode.description,
      variables.input.description,
      "Description in database should be updated",
    )
    t.is(
      _selfNode.url,
      variables.input.url,
      "URL in database should be updated",
    )
  },
)

test("updateProfile: Should return validation error if URL format is invalid", async (t) => {
  const { graphqlClient } = t.context
  const token = t.context.createClientJwt(TEST_ETHEREUM_ADDRESS_NODE_A)

  const mutation = `
    mutation UpdateProfile($input: UpdateProfileInput!) {
      updateProfile(input: $input) {
        url
      }
    }
  `
  const variables = {
    input: {
      url: "invalid-url-format",
    },
  }

  const { data, errors } = await graphqlClient.query(mutation, {
    variables,
    headers: { Authorization: `Bearer ${token}` },
  })

  t.truthy(errors, "Invalid URL format should return GraphQL errors")
  t.is(
    data.updateProfile,
    null,
    "When error occurs, data.updateProfile field should be null",
  )

  const hasValidationError = errors.some(
    (e) => e.extensions?.code === "VALIDATION_FAILED",
  )
  t.true(
    hasValidationError,
    "Error should be validation failure error (VALIDATION_FAILED)",
  )
})

test("updateProfile: Should return validation error if URL is not HTTP or HTTPS", async (t) => {
  const { graphqlClient } = t.context
  const token = t.context.createClientJwt(TEST_ETHEREUM_ADDRESS_NODE_A)

  const mutation = `
    mutation UpdateProfile($input: UpdateProfileInput!) {
      updateProfile(input: $input) {
        url
      }
    }
  `
  const variables = {
    input: {
      url: "ftp://invalid-protocol.example.com",
    },
  }

  const { data, errors } = await graphqlClient.query(mutation, {
    variables,
    headers: { Authorization: `Bearer ${token}` },
  })

  t.truthy(errors, "Non-HTTP/HTTPS URL should return GraphQL errors")
  t.is(
    data.updateProfile,
    null,
    "When error occurs, data.updateProfile field should be null",
  )

  const hasValidationError = errors.some(
    (e) => e.extensions?.code === "VALIDATION_FAILED",
  )
  t.true(
    hasValidationError,
    "Error should be validation failure error (VALIDATION_FAILED)",
  )
})

test.serial(
  "updateProfile: Should be able to successfully upload avatar",
  async (t) => {
    const { app } = t.context
    const token = t.context.createClientJwt(TEST_ETHEREUM_ADDRESS_NODE_A)

    const tempFilePath = "/tmp/temp_avatar.png"
    fs.writeFileSync(tempFilePath, "fake-png-data")

    const { body, headers } = createGraphQLUploadRequest({
      query: `
      mutation UpdateProfile($input: UpdateProfileInput!) {
        updateProfile(input: $input) {
          title
        }
      }
    `,
      filePath: tempFilePath,
      variables: { input: { avatar: null } },
      uploadFieldName: "input.avatar",
      fileName: "avatar.png",
    })

    const response = await app.inject({
      method: "POST",
      url: "/api/graphql",
      payload: body,
      headers: {
        ...headers,
        Authorization: `Bearer ${token}`,
      },
    })

    t.is(response.statusCode, 200)
    const responseBody = JSON.parse(response.body)
    t.falsy(responseBody.errors, "Should not return GraphQL errors")

    const avatarSetting = await Setting.query().findOne({ key: "avatar" })
    t.truthy(avatarSetting)
    t.true(avatarSetting.value.startsWith("data:image/png;base64,"))

    fs.unlinkSync(tempFilePath)
    await Setting.query().delete().where({ key: "avatar" })
  },
)

test("updateProfile: Should return error if avatar file exceeds 2MB", async (t) => {
  const { app } = t.context
  const token = t.context.createClientJwt(TEST_ETHEREUM_ADDRESS_NODE_A)

  const tempFilePath = "/tmp/large_avatar.png"
  const largeBuffer = Buffer.alloc(2 * 1024 * 1024 + 1)
  fs.writeFileSync(tempFilePath, largeBuffer)

  const { body, headers } = createGraphQLUploadRequest({
    query: `
      mutation UpdateProfile($input: UpdateProfileInput!) {
        updateProfile(input: $input) {
          title
        }
      }
    `,
    filePath: tempFilePath,
    variables: { input: { avatar: null } },
    uploadFieldName: "input.avatar",
    fileName: "large_avatar.png",
  })

  const response = await app.inject({
    method: "POST",
    url: "/api/graphql",
    payload: body,
    headers: {
      ...headers,
      Authorization: `Bearer ${token}`,
    },
  })

  t.is(response.statusCode, 200)
  const responseBody = JSON.parse(response.body)
  t.truthy(responseBody.errors, "Should return GraphQL errors")
  const hasValidationError = responseBody.errors.some(
    (e) => e.extensions.code === "VALIDATION_FAILED",
  )
  t.true(hasValidationError, "Error message should indicate file is too large")

  fs.unlinkSync(tempFilePath)
})

test.serial(
  "broadcastProfileUpdate: should broadcast profile update to followers",
  async (t) => {
    const { graphqlClient, selfNode } = t.context
    const token = t.context.createClientJwt(selfNode.address)

    // 1. Create a follower node and establish connection
    const followerNode = await Node.query().insertAndFetch({
      address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // Hardhat #1
      url: "http://follower-node.test",
      title: "Follower Node",
      is_self: false,
      profile_version: 0,
    })
    await Connection.query().insert({
      follower_address: followerNode.address,
      followee_address: selfNode.address,
    })

    const typedData = {
      domain: PROFILE_UPDATE_DOMAIN,
      types: PROFILE_UPDATE_TYPES,
      primaryType: "NodeProfileUpdate",
      message: {
        publisherAddress: selfNode.address,
        url: selfNode.url,
        title: selfNode.title,
        description: selfNode.description,
        profileVersion: selfNode.profile_version,
        timestamp: Math.floor(Date.now() / 1000),
      },
    }

    // 3. Sign the data using the node owner's account
    const signature = await generateSignature(
      TEST_ACCOUNT_NODE_A,
      typedData,
      "typedData",
    )
    t.truthy(signature, "should generate a valid signature")

    // 4. Mock the follower node's receiving endpoint
    const nockScope = nock(followerNode.url)
      .post("/ewp/nodes/updates", (body) => {
        t.deepEqual(
          body.typedData,
          typedData,
          "Broadcasted typedData should match prepared data",
        )
        t.is(
          body.signature,
          signature,
          "Broadcasted signature should match generated signature",
        )
        return true
      })
      .reply(204)

    // 5. Execute executeProfileBroadcast
    const broadcastProfileUpdateMutation = `
    mutation ExecuteProfileBroadcast($typedData: JSON!, $signature: String!) {
      broadcastProfileUpdate(typedData: $typedData, signature: $signature)
    }
  `
    const { data: executeData, errors: executeErrors } =
      await graphqlClient.query(broadcastProfileUpdateMutation, {
        variables: { typedData, signature },
        headers: { Authorization: `Bearer ${token}` },
      })

    // 6. Assertions
    t.falsy(executeErrors, "broadcastProfileUpdate should not have errors")
    t.true(
      executeData.broadcastProfileUpdate,
      "broadcastProfileUpdate should return true on success",
    )

    // Wait briefly to ensure asynchronous fetch calls complete
    await new Promise((resolve) => setTimeout(resolve, 100))

    t.true(
      nockScope.isDone(),
      "Follower node /ewp/nodes/updates endpoint must be called",
    )

    // Cleanup
    await Connection.query().delete()
    await Node.query().deleteById(followerNode.address)
  },
)
