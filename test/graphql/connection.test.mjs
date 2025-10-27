import test from "ava"
import nock from "nock"
import { Connection, Node, Setting } from "../../server/models/index.mjs"
import {
  generateSignature,
  generateTestAccount,
  TEST_ACCOUNT_NODE_A, // Local node (followee)
  TEST_ACCOUNT_NODE_B, // Simulated external node (follower)
  TEST_NODE_A,
  TEST_NODE_B,
} from "../setup.mjs"

// Define EIP-712 domain and types for CreateConnection
const CREATE_CONNECTION_DOMAIN = {
  name: "epress world",
  version: "1",
  chainId: 1,
}

const CREATE_CONNECTION_TYPES = {
  EIP712Domain: [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "chainId", type: "uint256" },
  ],
  CreateConnection: [
    { name: "followeeAddress", type: "address" },
    { name: "followeeUrl", type: "string" },
    { name: "followerUrl", type: "string" },
    { name: "timestamp", type: "uint256" },
  ],
}

// Define EIP-712 domain and types for DeleteConnection
const DELETE_CONNECTION_DOMAIN = {
  name: "epress world",
  version: "1",
  chainId: 1,
}

const DELETE_CONNECTION_TYPES = {
  EIP712Domain: [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "chainId", type: "uint256" },
  ],
  DeleteConnection: [
    { name: "followeeAddress", type: "address" },
    { name: "followerAddress", type: "address" },
    { name: "timestamp", type: "uint256" },
  ],
}

// Clean up environment before each test to prevent interference
test.serial.beforeEach(async () => {
  await Connection.query().delete()
  await Node.query().where({ address: TEST_NODE_B.address }).delete()
  await Setting.query().where({ key: "allow_follow" }).delete()
})

// Test case 1: Successfully create connection
test.serial(
  "createConnection: Should successfully create connection",
  async (t) => {
    const { graphqlClient } = t.context

    // Step 1: Mock EWP protocol callback
    // Our server (Node A) will make this request to the follower's server (Node B) after receiving the GraphQL request

    const profileScope = nock(TEST_NODE_B.url).get("/ewp/profile").reply(200, {
      address: TEST_NODE_B.address,
      title: TEST_NODE_B.title,
      url: TEST_NODE_B.url,
      description: TEST_NODE_B.description,
    })

    const scope = nock(TEST_NODE_B.url)
      .post("/ewp/connections")
      .reply(201, { status: "created" })

    // Step 2: Prepare EIP-712 signature data
    // Follower (Node B) signs a message indicating they want to follow the followee (our Node A)
    const timestamp = Math.floor(Date.now() / 1000)
    const message = {
      followeeAddress: TEST_NODE_A.address,
      followeeUrl: TEST_NODE_A.url,
      followerUrl: TEST_NODE_B.url,
      timestamp,
    }
    const typedData = {
      domain: CREATE_CONNECTION_DOMAIN,
      types: CREATE_CONNECTION_TYPES,
      primaryType: "CreateConnection",
      message,
    }
    // Sign using follower's (TEST_ACCOUNT_NODE_B) private key
    const signature = await generateSignature(
      TEST_ACCOUNT_NODE_B,
      typedData,
      "typedData",
    )

    // Step 3: Define and execute GraphQL Mutation
    const mutation = `
    mutation CreateConnection($typedData: JSON!, $signature: String!) {
      createConnection(typedData: $typedData, signature: $signature) {
        address
        url
        title
      }
    }
  `
    const variables = { typedData, signature }
    const { data, errors } = await graphqlClient.query(mutation, { variables })

    // Step 4: Assertions
    t.falsy(errors, "Should not return any GraphQL errors")
    t.true(
      scope.isDone(),
      "Must call EWP POST /connections interface on follower node",
    )
    t.true(
      profileScope.isDone(),
      "Must call EWP GET /profile interface on follower node",
    )

    const returnedNode = data.createConnection
    t.truthy(returnedNode, "Should return followed node information")
    t.is(
      returnedNode.address,
      TEST_NODE_B.address,
      "Returned should be followed node (our Node B)",
    )

    // Step 5: Verify database state
    const followerNode = await Node.query().findOne({
      address: TEST_NODE_B.address,
    })
    t.truthy(
      followerNode,
      "Follower node information should be created in database",
    )

    const selfNode = await Node.query().findOne({ is_self: true })
    const connection = await Connection.query().findOne({
      follower_address: followerNode.address,
      followee_address: selfNode.address,
    })
    t.truthy(
      connection,
      "Connection record should be successfully created in database",
    )
  },
)

// Test case 2: EWP returning 409 status code should be considered success
test.serial(
  "createConnection: EWP returning 409 status code should be considered success",
  async (t) => {
    const { graphqlClient } = t.context

    // Step 1: Mock EWP protocol callback
    // Simulate follower node returning 409 status code, indicating connection already exists
    const profileScope = nock(TEST_NODE_B.url).get("/ewp/profile").reply(200, {
      address: TEST_NODE_B.address,
      title: TEST_NODE_B.title,
      url: TEST_NODE_B.url,
      description: TEST_NODE_B.description,
    })

    const scope = nock(TEST_NODE_B.url)
      .post("/ewp/connections")
      .reply(409, { error: "CONNECTION_ALREADY_EXISTS" })

    // Step 2: Prepare EIP-712 signature data
    const timestamp = Math.floor(Date.now() / 1000)
    const message = {
      followeeAddress: TEST_NODE_A.address,
      followeeUrl: TEST_NODE_A.url,
      followerUrl: TEST_NODE_B.url,
      timestamp,
    }
    const typedData = {
      domain: CREATE_CONNECTION_DOMAIN,
      types: CREATE_CONNECTION_TYPES,
      primaryType: "CreateConnection",
      message,
    }
    // Sign using follower's (TEST_ACCOUNT_NODE_B) private key
    const signature = await generateSignature(
      TEST_ACCOUNT_NODE_B,
      typedData,
      "typedData",
    )

    // Step 3: Define and execute GraphQL Mutation
    const mutation = `
    mutation CreateConnection($typedData: JSON!, $signature: String!) {
      createConnection(typedData: $typedData, signature: $signature) {
        address
        url
        title
      }
    }
  `
    const variables = { typedData, signature }
    const { data, errors } = await graphqlClient.query(mutation, { variables })

    // Step 4: Assertions
    t.falsy(errors, "Should not return any GraphQL errors")
    t.true(
      scope.isDone(),
      "Must call EWP POST /connections interface on follower node",
    )
    t.true(
      profileScope.isDone(),
      "Must call EWP GET /profile interface on follower node",
    )

    const returnedNode = data.createConnection
    t.truthy(returnedNode, "Should return followed node information")
    t.is(
      returnedNode.address,
      TEST_NODE_B.address,
      "Returned should be followed node (our Node B)",
    )

    // Step 5: Verify database state
    const followerNode = await Node.query().findOne({
      address: TEST_NODE_B.address,
    })
    t.truthy(
      followerNode,
      "Follower node information should be created in database",
    )

    const selfNode = await Node.query().findOne({ is_self: true })
    const connection = await Connection.query().findOne({
      follower_address: followerNode.address,
      followee_address: selfNode.address,
    })
    t.truthy(
      connection,
      "Connection record should be successfully created in database",
    )
  },
)

// Test case 3: Using invalid signature should fail
test("createConnection: Using invalid signature should fail", async (t) => {
  const { graphqlClient } = t.context

  // Prepare same payload as test case 1, but use an invalid signature
  const timestamp = Math.floor(Date.now() / 1000)
  const message = {
    followeeAddress: TEST_NODE_A.address,
    followeeUrl: TEST_NODE_A.url,
    followerUrl: TEST_NODE_B.url,
    timestamp,
  }
  const typedData = {
    domain: CREATE_CONNECTION_DOMAIN,
    types: CREATE_CONNECTION_TYPES,
    primaryType: "CreateConnection",
    message,
  }
  const signature = "0xinvalid_signature_string" // Fake invalid signature

  const mutation = `
        mutation CreateConnection($typedData: JSON!, $signature: String!) {
            createConnection(typedData: $typedData, signature: $signature) {
                address
                url
                title
            }
        }
    `
  const variables = { typedData, signature }
  const { data, errors } = await graphqlClient.query(mutation, { variables })

  // Assertions
  t.truthy(errors, "Should return GraphQL errors")
  t.is(data, null, "When error occurs, data field should be null")
  t.true(
    errors.some((e) => e.extensions?.code === "INVALID_SIGNATURE"),
    "Error code should be INVALID_SIGNATURE",
  )
})

// Test case 4: Successfully unfollow connection
test.serial(
  "destroyConnection: Should successfully unfollow connection",
  async (t) => {
    const { graphqlClient } = t.context

    // Step 1: First create a connection for subsequent testing
    const createTimestamp = Math.floor(Date.now() / 1000)
    const createMessage = {
      followeeAddress: TEST_NODE_A.address,
      followeeUrl: TEST_NODE_A.url,
      followerUrl: TEST_NODE_B.url,
      timestamp: createTimestamp,
    }
    const createTypedData = {
      domain: CREATE_CONNECTION_DOMAIN,
      types: CREATE_CONNECTION_TYPES,
      primaryType: "CreateConnection",
      message: createMessage,
    }
    const createSignature = await generateSignature(
      TEST_ACCOUNT_NODE_B,
      createTypedData,
      "typedData",
    )

    // Mock EWP protocol callback
    const _createProfileScope = nock(TEST_NODE_B.url)
      .get("/ewp/profile")
      .reply(200, {
        address: TEST_NODE_B.address,
        title: TEST_NODE_B.title,
        url: TEST_NODE_B.url,
        description: TEST_NODE_B.description,
        updated_at: TEST_NODE_B.updated_at,
      })

    const _createScope = nock(TEST_NODE_B.url)
      .post("/ewp/connections")
      .reply(201, { status: "created" })

    // Create connection
    const createMutation = `
    mutation CreateConnection($typedData: JSON!, $signature: String!) {
      createConnection(typedData: $typedData, signature: $signature) {
        address
        url
        title
      }
    }
  `
    const createVariables = {
      typedData: createTypedData,
      signature: createSignature,
    }
    await graphqlClient.query(createMutation, { variables: createVariables })

    // Verify connection has been created
    const selfNode = await Node.query().findOne({ is_self: true })
    const followerNode = await Node.query().findOne({
      address: TEST_NODE_B.address,
    })
    const existingConnection = await Connection.query().findOne({
      follower_address: followerNode.address,
      followee_address: selfNode.address,
    })
    t.truthy(
      existingConnection,
      "Connection should have been successfully created",
    )

    // Step 2: Mock EWP DELETE /connections call
    const deleteScope = nock(TEST_NODE_B.url)
      .delete("/ewp/connections")
      .reply(204)

    // Step 3: Prepare EIP-712 signature data for DeleteConnection
    const deleteTimestamp = Math.floor(Date.now() / 1000)
    const deleteMessage = {
      followeeAddress: TEST_NODE_A.address,
      followerAddress: TEST_NODE_B.address,
      timestamp: deleteTimestamp,
    }
    const deleteTypedData = {
      domain: DELETE_CONNECTION_DOMAIN,
      types: DELETE_CONNECTION_TYPES,
      primaryType: "DeleteConnection",
      message: deleteMessage,
    }
    // Sign using follower's (TEST_ACCOUNT_NODE_B) private key
    const deleteSignature = await generateSignature(
      TEST_ACCOUNT_NODE_B,
      deleteTypedData,
      "typedData",
    )

    // Step 4: Define and execute destroyConnection GraphQL Mutation
    const deleteMutation = `
    mutation DestroyConnection($typedData: JSON!, $signature: String!) {
      destroyConnection(typedData: $typedData, signature: $signature) {
        address
        url
        title
      }
    }
  `
    const deleteVariables = {
      typedData: deleteTypedData,
      signature: deleteSignature,
    }
    const { data, errors } = await graphqlClient.query(deleteMutation, {
      variables: deleteVariables,
    })

    // Step 5: Assertions
    t.falsy(errors, "Should not return any GraphQL errors")
    t.true(
      deleteScope.isDone(),
      "Must call EWP DELETE /connections interface on follower node",
    )

    const returnedNode = data.destroyConnection
    t.truthy(returnedNode, "Should return unfollowed node information")
    t.is(
      returnedNode.address,
      TEST_NODE_B.address,
      "Returned should be followed node (our Node B)",
    )

    // Step 6: Verify database state
    const deletedConnection = await Connection.query().findOne({
      follower_address: followerNode.address,
      followee_address: selfNode.address,
    })
    t.falsy(
      deletedConnection,
      "Connection record should be successfully deleted",
    )

    // Clean up Mock (since we manually created nodes and connections, these Mocks were not called)
    // createProfileScope.done();
    // createScope.done();
  },
)

// Test case 5: Using invalid signature should fail
test("destroyConnection: Using invalid signature should fail", async (t) => {
  const { graphqlClient } = t.context

  // Prepare DeleteConnection payload, but use invalid signature
  const timestamp = Math.floor(Date.now() / 1000)
  const message = {
    followeeAddress: TEST_NODE_A.address,
    followerAddress: TEST_NODE_B.address,
    timestamp,
  }
  const typedData = {
    domain: DELETE_CONNECTION_DOMAIN,
    types: DELETE_CONNECTION_TYPES,
    primaryType: "DeleteConnection",
    message,
  }
  const signature = "0xinvalid_signature_string" // Fake invalid signature

  const mutation = `
    mutation DestroyConnection($typedData: JSON!, $signature: String!) {
      destroyConnection(typedData: $typedData, signature: $signature) {
        address
        url
        title
      }
    }
  `
  const variables = { typedData, signature }
  const { data, errors } = await graphqlClient.query(mutation, { variables })

  // Assertions
  t.truthy(errors, "Should return GraphQL errors")
  t.is(data, null, "When error occurs, data field should be null")
  t.true(
    errors.some((e) => e.extensions?.code === "INVALID_SIGNATURE"),
    "Error code should be INVALID_SIGNATURE",
  )
})

// Test case 6: Attempting to unfollow non-existent connection should fail
test("destroyConnection: Attempting to unfollow non-existent connection should fail", async (t) => {
  const { graphqlClient } = t.context

  // Ensure no connections exist
  await Connection.query().delete()

  // Prepare DeleteConnection payload
  const timestamp = Math.floor(Date.now() / 1000)
  const message = {
    followeeAddress: TEST_NODE_A.address,
    followerAddress: TEST_NODE_B.address,
    timestamp,
  }
  const typedData = {
    domain: DELETE_CONNECTION_DOMAIN,
    types: DELETE_CONNECTION_TYPES,
    primaryType: "DeleteConnection",
    message,
  }
  const signature = await generateSignature(
    TEST_ACCOUNT_NODE_B,
    typedData,
    "typedData",
  )

  const mutation = `
    mutation DestroyConnection($typedData: JSON!, $signature: String!) {
      destroyConnection(typedData: $typedData, signature: $signature) {
        address
        url
        title
      }
    }
  `
  const variables = { typedData, signature }
  const { data, errors } = await graphqlClient.query(mutation, { variables })

  // Assertions
  t.truthy(errors, "Should return GraphQL errors")
  t.is(data, null, "When error occurs, data field should be null")
  t.true(
    errors.some((e) => e.extensions?.code === "NOT_FOUND"),
    "Error code should be NOT_FOUND",
  )
})

// Test case 7: Signer address mismatch with address in message should fail
test("destroyConnection: Signer address mismatch with address in message should fail", async (t) => {
  const { graphqlClient } = t.context
  const testAccount = await generateTestAccount()

  // Prepare DeleteConnection payload, but use wrong address
  const timestamp = Math.floor(Date.now() / 1000)
  const message = {
    followeeAddress: TEST_NODE_A.address,
    followerAddress: testAccount.address, // Wrong address format
    timestamp,
  }
  const typedData = {
    domain: DELETE_CONNECTION_DOMAIN,
    types: DELETE_CONNECTION_TYPES,
    primaryType: "DeleteConnection",
    message,
  }
  // Use TEST_ACCOUNT_NODE_B private key to sign, but address in message doesn't match
  const signature = await generateSignature(
    TEST_ACCOUNT_NODE_B,
    typedData,
    "typedData",
  )

  const mutation = `
    mutation DestroyConnection($typedData: JSON!, $signature: String!) {
      destroyConnection(typedData: $typedData, signature: $signature) {
        address
        url
        title
      }
    }
  `
  const variables = { typedData, signature }
  const { data, errors } = await graphqlClient.query(mutation, { variables })

  // Assertions
  t.truthy(errors, "Should return GraphQL errors")
  t.is(data, null, "When error occurs, data field should be null")
  t.true(
    errors.some((e) => e.extensions?.code === "SIGNER_MISMATCH"),
    "Error code should be SIGNER_MISMATCH",
  )
})

// Test case 8: Payload format error should fail
test("destroyConnection: Payload format error should fail", async (t) => {
  const { graphqlClient } = t.context

  // Prepare malformed typedData
  const invalidTypedData = {
    domain: DELETE_CONNECTION_DOMAIN,
    types: DELETE_CONNECTION_TYPES,
    primaryType: "DeleteConnection",
    message: {
      // Missing required fields
      followeeAddress: TEST_NODE_A.address,
      // followerAddress missing
      timestamp: Math.floor(Date.now() / 1000),
    },
  }
  // For payload format error test, we don't need real signature as validation should happen before signing
  const signature = "0xinvalid_signature_for_format_test"

  const mutation = `
    mutation DestroyConnection($typedData: JSON!, $signature: String!) {
      destroyConnection(typedData: $typedData, signature: $signature) {
        address
        url
        title
      }
    }
  `
  const variables = { typedData: invalidTypedData, signature }
  const { data, errors } = await graphqlClient.query(mutation, { variables })

  // Assertions
  t.truthy(errors, "Should return GraphQL errors")
  t.is(data, null, "When error occurs, data field should be null")
  t.true(
    errors.some((e) => e.extensions?.code === "VALIDATION_FAILED"),
    "Error code should be VALIDATION_FAILED",
  )
})

// Test case 9: Timestamp out of range should fail
test("destroyConnection: Timestamp out of range should fail", async (t) => {
  const { graphqlClient } = t.context

  // Prepare expired timestamp
  const expiredTimestamp = Math.floor(Date.now() / 1000) - 7200 // 2 hours ago
  const message = {
    followeeAddress: TEST_NODE_A.address,
    followerAddress: TEST_NODE_B.address,
    timestamp: expiredTimestamp,
  }
  const typedData = {
    domain: DELETE_CONNECTION_DOMAIN,
    types: DELETE_CONNECTION_TYPES,
    primaryType: "DeleteConnection",
    message,
  }
  const signature = await generateSignature(
    TEST_ACCOUNT_NODE_B,
    typedData,
    "typedData",
  )

  const mutation = `
    mutation DestroyConnection($typedData: JSON!, $signature: String!) {
      destroyConnection(typedData: $typedData, signature: $signature) {
        address
        url
        title
      }
    }
  `
  const variables = { typedData, signature }
  const { data, errors } = await graphqlClient.query(mutation, { variables })

  // Assertions
  t.truthy(errors, "Should return GraphQL errors")
  t.is(data, null, "When error occurs, data field should be null")
  t.true(
    errors.some((e) => e.extensions?.code === "VALIDATION_FAILED"),
    "Error code should be VALIDATION_FAILED",
  )
})

// Test case 10: Scenario 1 - Unfollow initiated from follower node (connection list page)
test.serial(
  "destroyConnection: Scenario 1 - Should successfully unfollow when initiated from follower node",
  async (t) => {
    const { graphqlClient } = t.context

    // Step 1: First create a connection for subsequent testing
    const createTimestamp = Math.floor(Date.now() / 1000)
    const createMessage = {
      followeeAddress: TEST_NODE_B.address, // Followee is TEST_NODE_B
      followeeUrl: TEST_NODE_B.url,
      followerUrl: TEST_NODE_A.url, // Follower is current node TEST_NODE_A
      timestamp: createTimestamp,
    }
    const createTypedData = {
      domain: CREATE_CONNECTION_DOMAIN,
      types: CREATE_CONNECTION_TYPES,
      primaryType: "CreateConnection",
      message: createMessage,
    }
    const createSignature = await generateSignature(
      TEST_ACCOUNT_NODE_A,
      createTypedData,
      "typedData",
    ) // Use current node private key to sign

    // Mock EWP protocol callback
    const _createProfileScope = nock(TEST_NODE_B.url)
      .get("/ewp/profile")
      .reply(200, {
        address: TEST_NODE_B.address,
        title: TEST_NODE_B.title,
        url: TEST_NODE_B.url,
        description: TEST_NODE_B.description,
      })

    const _createScope = nock(TEST_NODE_B.url)
      .post("/ewp/connections")
      .reply(201, { status: "created" })

    // Create connection
    const createMutation = `
    mutation CreateConnection($typedData: JSON!, $signature: String!) {
      createConnection(typedData: $typedData, signature: $signature) {
        address
        url
        title
      }
    }
  `
    const createVariables = {
      typedData: createTypedData,
      signature: createSignature,
    }
    await graphqlClient.query(createMutation, { variables: createVariables })

    // Manually create followee node (because createConnection won't create followee node)
    const followeeNode = await Node.query().insert({
      address: TEST_NODE_B.address,
      url: TEST_NODE_B.url,
      title: TEST_NODE_B.title,
      description: TEST_NODE_B.description,
      is_self: false,
    })

    // Manually create connection record (because createConnection won't create connection record on current node)
    const selfNode = await Node.query().findOne({ is_self: true })
    const existingConnection = await Connection.query().insert({
      follower_address: selfNode.address, // Current node is follower
      followee_address: followeeNode.address, // TEST_NODE_B is followee
    })
    t.truthy(
      existingConnection,
      "Connection should have been successfully created",
    )

    // Step 2: Mock EWP DELETE /connections call (send to followee node)
    const deleteScope = nock(TEST_NODE_B.url)
      .delete("/ewp/connections")
      .reply(204)

    // Step 3: Prepare scenario 1 DeleteConnection signature data
    // Scenario 1: Initiated from follower node, current node is follower
    const deleteTimestamp = Math.floor(Date.now() / 1000)
    const deleteMessage = {
      followeeAddress: TEST_NODE_B.address, // Followee address
      followerAddress: TEST_NODE_A.address, // Follower address (current node)
      timestamp: deleteTimestamp,
    }
    const deleteTypedData = {
      domain: DELETE_CONNECTION_DOMAIN,
      types: DELETE_CONNECTION_TYPES,
      primaryType: "DeleteConnection",
      message: deleteMessage,
    }
    // Use follower (TEST_ACCOUNT_NODE_A) private key to sign
    const deleteSignature = await generateSignature(
      TEST_ACCOUNT_NODE_A,
      deleteTypedData,
      "typedData",
    )

    // Step 4: Define and execute destroyConnection GraphQL Mutation
    const deleteMutation = `
    mutation DestroyConnection($typedData: JSON!, $signature: String!) {
      destroyConnection(typedData: $typedData, signature: $signature) {
        address
        url
        title
      }
    }
  `
    const deleteVariables = {
      typedData: deleteTypedData,
      signature: deleteSignature,
    }
    const { data, errors } = await graphqlClient.query(deleteMutation, {
      variables: deleteVariables,
    })

    // Step 5: Assertions
    t.falsy(errors, "Should not return any GraphQL errors")
    t.true(
      deleteScope.isDone(),
      "Must call EWP DELETE /connections interface on followee node",
    )

    const returnedNode = data.destroyConnection
    t.truthy(returnedNode, "Should return unfollowed node information")
    t.is(
      returnedNode.address,
      TEST_NODE_B.address,
      "Returned should be followed node (TEST_NODE_B)",
    )

    // Step 6: Verify database state
    const deletedConnection = await Connection.query().findOne({
      follower_address: selfNode.address,
      followee_address: followeeNode.address,
    })
    t.falsy(
      deletedConnection,
      "Connection record should be successfully deleted",
    )

    // Clean up Mock (since we manually created nodes and connections, these Mocks were not called)
    // createProfileScope.done();
    // createScope.done();
  },
)

// Test case 11: Invalid scenario - Current node not involved in connection should fail
test("destroyConnection: Current node not involved in connection should fail", async (t) => {
  const { graphqlClient } = t.context
  const testAccount = await generateTestAccount()
  const anotherAccount = await generateTestAccount()

  // Prepare DeleteConnection payload, but current node is neither follower nor followee
  const timestamp = Math.floor(Date.now() / 1000)
  const message = {
    followeeAddress: anotherAccount.address, // Neither current node
    followerAddress: testAccount.address, // Nor current node
    timestamp,
  }
  const typedData = {
    domain: DELETE_CONNECTION_DOMAIN,
    types: DELETE_CONNECTION_TYPES,
    primaryType: "DeleteConnection",
    message,
  }
  const signature = await generateSignature(testAccount, typedData, "typedData")

  const mutation = `
    mutation DestroyConnection($typedData: JSON!, $signature: String!) {
      destroyConnection(typedData: $typedData, signature: $signature) {
        address
        url
        title
      }
    }
  `
  const variables = { typedData, signature }
  const { data, errors } = await graphqlClient.query(mutation, { variables })

  // Assertions
  t.truthy(errors, "Should return GraphQL errors")
  t.is(data, null, "When error occurs, data field should be null")
  t.true(
    errors.some((e) => e.extensions?.code === "FOLLOWEE_IDENTITY_MISMATCH"),
    "Error code should be FOLLOWEE_IDENTITY_MISMATCH",
  )
})

// Test case 12: allowFollow disabled should fail
test.serial("createConnection: allowFollow disabled should fail", async (t) => {
  const { graphqlClient } = t.context

  // Step 1: Set allowFollow to false
  await Setting.query().where({ key: "allow_follow" }).delete()
  await Setting.query().insert({
    key: "allow_follow",
    value: "false",
  })

  // Step 2: Prepare EIP-712 signature data
  const timestamp = Math.floor(Date.now() / 1000)
  const message = {
    followeeAddress: TEST_NODE_A.address,
    followeeUrl: TEST_NODE_A.url,
    followerUrl: TEST_NODE_B.url,
    timestamp,
  }
  const typedData = {
    domain: CREATE_CONNECTION_DOMAIN,
    types: CREATE_CONNECTION_TYPES,
    primaryType: "CreateConnection",
    message,
  }
  const signature = await generateSignature(
    TEST_ACCOUNT_NODE_B,
    typedData,
    "typedData",
  )

  // Step 3: Define and execute GraphQL Mutation
  const mutation = `
    mutation CreateConnection($typedData: JSON!, $signature: String!) {
      createConnection(typedData: $typedData, signature: $signature) {
        address
        url
        title
      }
    }
  `
  const variables = { typedData, signature }
  const { data, errors } = await graphqlClient.query(mutation, { variables })

  // Step 4: Assertions
  t.truthy(errors, "Should return GraphQL errors")
  t.is(data, null, "When error occurs, data field should be null")
  t.true(
    errors.some((e) => e.extensions?.code === "FOLLOW_DISABLED"),
    "Error code should be FOLLOW_DISABLED",
  )
})

// Test case 13: allowFollow enabled should succeed
test.serial(
  "createConnection: allowFollow enabled should succeed",
  async (t) => {
    const { graphqlClient } = t.context

    // Clear any pending nocks
    nock.cleanAll()

    // Step 1: Set allowFollow to true
    await Setting.query().where({ key: "allow_follow" }).delete()
    await Setting.query().insert({
      key: "allow_follow",
      value: "true",
    })

    // Step 2: Mock EWP protocol callback (same as test case 1)
    const profileScope = nock(TEST_NODE_B.url).get("/ewp/profile").reply(200, {
      address: TEST_NODE_B.address,
      title: TEST_NODE_B.title,
      url: TEST_NODE_B.url,
      description: TEST_NODE_B.description,
    })

    const scope = nock(TEST_NODE_B.url)
      .post("/ewp/connections")
      .reply(201, { status: "created" })

    // Step 3: Prepare EIP-712 signature data (same as test case 1)
    const timestamp = Math.floor(Date.now() / 1000)
    const message = {
      followeeAddress: TEST_NODE_A.address,
      followeeUrl: TEST_NODE_A.url,
      followerUrl: TEST_NODE_B.url,
      timestamp,
    }
    const typedData = {
      domain: CREATE_CONNECTION_DOMAIN,
      types: CREATE_CONNECTION_TYPES,
      primaryType: "CreateConnection",
      message,
    }
    const signature = await generateSignature(
      TEST_ACCOUNT_NODE_B,
      typedData,
      "typedData",
    )

    // Step 4: Execute mutation (same as test case 1)
    const mutation = `
    mutation CreateConnection($typedData: JSON!, $signature: String!) {
      createConnection(typedData: $typedData, signature: $signature) {
        address
        url
        title
      }
    }
  `
    const variables = { typedData, signature }
    const { data, errors } = await graphqlClient.query(mutation, { variables })

    // Step 5: Assertions (same as test case 1)
    t.falsy(errors, "Should not return any GraphQL errors")
    t.true(
      scope.isDone(),
      "Must call EWP POST /connections interface on follower node",
    )
    t.true(
      profileScope.isDone(),
      "Must call EWP GET /profile interface on follower node",
    )

    const returnedNode = data.createConnection
    t.truthy(returnedNode, "Should return followed node information")
    t.is(
      returnedNode.address,
      TEST_NODE_B.address,
      "Returned should be followed node (our Node B)",
    )
  },
)

// Test case 14: allowFollow not set should succeed (default behavior)
test.serial(
  "createConnection: allowFollow not set should succeed (default behavior)",
  async (t) => {
    const { graphqlClient } = t.context

    // Clear any pending nocks
    nock.cleanAll()

    // Step 1: Ensure no allowFollow setting exists (default behavior)
    // This is already handled by beforeEach cleanup

    // Step 2: Mock EWP protocol callback
    const profileScope = nock(TEST_NODE_B.url).get("/ewp/profile").reply(200, {
      address: TEST_NODE_B.address,
      title: TEST_NODE_B.title,
      url: TEST_NODE_B.url,
      description: TEST_NODE_B.description,
    })

    const scope = nock(TEST_NODE_B.url)
      .post("/ewp/connections")
      .reply(201, { status: "created" })

    // Step 3: Prepare EIP-712 signature data
    const timestamp = Math.floor(Date.now() / 1000)
    const message = {
      followeeAddress: TEST_NODE_A.address,
      followeeUrl: TEST_NODE_A.url,
      followerUrl: TEST_NODE_B.url,
      timestamp,
    }
    const typedData = {
      domain: CREATE_CONNECTION_DOMAIN,
      types: CREATE_CONNECTION_TYPES,
      primaryType: "CreateConnection",
      message,
    }
    const signature = await generateSignature(
      TEST_ACCOUNT_NODE_B,
      typedData,
      "typedData",
    )

    // Step 4: Define and execute GraphQL Mutation
    const mutation = `
    mutation CreateConnection($typedData: JSON!, $signature: String!) {
      createConnection(typedData: $typedData, signature: $signature) {
        address
        url
        title
      }
    }
  `
    const variables = { typedData, signature }
    const { data, errors } = await graphqlClient.query(mutation, { variables })

    // Step 5: Assertions
    t.falsy(errors, "Should not return any GraphQL errors")
    t.true(
      scope.isDone(),
      "Must call EWP POST /connections interface on follower node",
    )
    t.true(
      profileScope.isDone(),
      "Must call EWP GET /profile interface on follower node",
    )

    const returnedNode = data.createConnection
    t.truthy(returnedNode, "Should return followed node information")
    t.is(
      returnedNode.address,
      TEST_NODE_B.address,
      "Returned should be followed node (our Node B)",
    )

    // Step 6: Verify database state
    const followerNode = await Node.query().findOne({
      address: TEST_NODE_B.address,
    })
    t.truthy(
      followerNode,
      "Follower node information should be created in database",
    )

    const selfNode = await Node.query().findOne({ is_self: true })
    const connection = await Connection.query().findOne({
      follower_address: followerNode.address,
      followee_address: selfNode.address,
    })
    t.truthy(
      connection,
      "Connection record should be successfully created in database",
    )
  },
)
