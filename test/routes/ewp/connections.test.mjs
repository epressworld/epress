import test from "ava"
import nock from "nock" // For mocking external HTTP requests
import { Connection, Node } from "../../../server/models/index.mjs"
import {
  generateSignature,
  generateTestAccount,
  TEST_ACCOUNT_NODE_A,
  TEST_ACCOUNT_NODE_B,
  TEST_NODE_A,
  TEST_NODE_B,
} from "../../setup.mjs" // Provides t.context.app, t.context.graphqlClient, generateSignature, TEST_ACCOUNT_NODE_A/B, TEST_NODE_A/B

// Helper to get current Unix timestamp within the allowed range
const getValidTimestamp = () => Math.floor(Date.now() / 1000)
const getExpiredTimestamp = () => Math.floor(Date.now() / 1000) - 3601 // More than 1 hour ago
const getFutureTimestamp = () => Math.floor(Date.now() / 1000) + 3601 // More than 1 hour in future

// Define EIP-712 Domain and Types for CreateConnection
const CREATE_CONNECTION_DOMAIN = {
  name: "epress world",
  version: "1",
  chainId: 1, // Assuming chainId 1 for testing, adjust if needed
}

const CREATE_CONNECTION_TYPES = {
  EIP712Domain: [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "chainId", type: "uint256" },
  ],
  CreateConnection: [
    { name: "followeeAddress", type: "address" },
    { name: "followeeUrl", type: "string" }, // Added
    { name: "followerUrl", type: "string" },
    { name: "timestamp", type: "uint256" },
  ],
}

test.serial(
  "POST /connections should create a new connection successfully with EIP-712 signature",
  async (t) => {
    // Arrange: Ensure Node A (the followee) and Node B (the follower, our local node) exist in DB
    // Our local node is TEST_NODE_A (is_self: true)
    // TEST_NODE_B (the followee, Node A in spec) will be created/updated by the connection process if it doesn't exist

    // Mock TEST_NODE_B's /profile endpoint (the followee's profile)
    // This is crucial for the server to validate the followeeUrl and followeeAddress
    nock(TEST_NODE_B.url).get("/ewp/profile").reply(200, {
      address: TEST_NODE_B.address,
      title: TEST_NODE_B.title,
      url: TEST_NODE_B.url,
      description: TEST_NODE_B.description,
    })

    const timestamp = getValidTimestamp()

    // Message for EIP-712 signature
    const message = {
      followeeAddress: TEST_NODE_B.address, // The external followee's address (Node A in spec)
      followeeUrl: TEST_NODE_B.url, // The external followee's URL (Node A in spec)
      followerUrl: TEST_NODE_A.url, // Our local node's URL (Node B in spec)
      timestamp: timestamp,
    }

    // Full typedData object for signing
    const typedData = {
      domain: CREATE_CONNECTION_DOMAIN,
      types: CREATE_CONNECTION_TYPES,
      primaryType: "CreateConnection",
      message: message,
    }

    // Sign the typedData using Node A's private key (our local node's key, the follower's key)
    const signature = await generateSignature(
      TEST_ACCOUNT_NODE_A,
      typedData,
      "typedData",
    )

    // Act: Send POST request to /connections
    const response = await t.context.app.inject({
      method: "POST",
      url: "/ewp/connections",
      payload: {
        typedData: typedData,
        signature: signature,
      },
    })

    // Assert
    t.is(response.statusCode, 201, "should return 201 Created")
    t.deepEqual(
      response.json(),
      { status: "created" },
      "should return status created",
    )

    // Verify connection record in DB
    const selfNode = await Node.query().findOne({ is_self: true }) // Our local node (Node B in spec)
    const followeeNode = await Node.query().findOne({
      address: TEST_NODE_B.address,
    }) // The external followee (Node A in spec)

    t.truthy(followeeNode, "followee node should be created/updated in DB")
    t.is(
      followeeNode.url,
      TEST_NODE_B.url,
      "followee node URL should be correct",
    )

    const connection = await Connection.query().findOne({
      follower_address: selfNode.address, // Our local node (Node B in spec)
      followee_address: followeeNode.address, // The external followee (Node A in spec)
    })
    t.truthy(connection, "should create connection record in DB")
    await connection.$query().delete()
    await followeeNode.$query().delete()
  },
)

test.serial(
  "POST /connections should return 400 for missing typedData in payload",
  async (t) => {
    const { app } = t.context

    // Act: Send POST request with missing typedData
    const response = await app.inject({
      method: "POST",
      url: "/ewp/connections",
      payload: {
        signature: "0xvalidSignature", // Signature is present but typedData is missing
      },
    })

    // Assert
    t.is(response.statusCode, 400, "should return 400 Bad Request")
    t.deepEqual(
      response.json(),
      { error: "INVALID_PAYLOAD" },
      "should return INVALID_PAYLOAD error",
    )
  },
)

test.serial(
  "POST /connections should return 400 for missing signature in payload",
  async (t) => {
    const { app } = t.context

    const timestamp = getValidTimestamp()
    const message = {
      followeeAddress: TEST_NODE_B.address,
      followeeUrl: TEST_NODE_B.url,
      followerUrl: TEST_NODE_A.url,
      timestamp: timestamp,
    }
    const typedData = {
      domain: CREATE_CONNECTION_DOMAIN,
      types: CREATE_CONNECTION_TYPES,
      primaryType: "CreateConnection",
      message: message,
    }

    // Act: Send POST request with missing signature
    const response = await app.inject({
      method: "POST",
      url: "/ewp/connections",
      payload: {
        typedData: typedData, // typedData is present but signature is missing
      },
    })

    // Assert
    t.is(response.statusCode, 400, "should return 400 Bad Request")
    t.deepEqual(
      response.json(),
      { error: "INVALID_PAYLOAD" },
      "should return INVALID_PAYLOAD error",
    )
  },
)

test.serial(
  "POST /connections should return 400 for malformed typedData in payload",
  async (t) => {
    const { app } = t.context

    // Act: Send POST request with malformed typedData
    const response = await app.inject({
      method: "POST",
      url: "/ewp/connections",
      payload: {
        typedData: {
          // Missing essential fields like domain, types, primaryType, message
          malformed: "data",
        },
        signature: "0xvalidSignature",
      },
    })

    // Assert
    t.is(response.statusCode, 400, "should return 400 Bad Request")
    t.deepEqual(
      response.json(),
      { error: "INVALID_PAYLOAD" },
      "should return INVALID_PAYLOAD error",
    )
  },
)

test.serial(
  "POST /connections should return 400 for invalid signature",
  async (t) => {
    const { app } = t.context

    // Arrange: Set up Node A as self node (our local node, the receiver)

    // Mock TEST_NODE_B's /profile endpoint (the followee's profile)
    nock(TEST_NODE_B.url).get("/ewp/profile").reply(200, {
      address: TEST_NODE_B.address,
      title: TEST_NODE_B.title,
      url: TEST_NODE_B.url,
      description: TEST_NODE_B.description,
    })

    const timestamp = getValidTimestamp()
    const message = {
      followeeAddress: TEST_NODE_B.address, // Changed to TEST_NODE_B
      followeeUrl: TEST_NODE_B.url, // Added
      followerUrl: TEST_NODE_A.url, // Changed to TEST_NODE_A
      timestamp: timestamp,
    }
    const typedData = {
      domain: CREATE_CONNECTION_DOMAIN,
      types: CREATE_CONNECTION_TYPES,
      primaryType: "CreateConnection",
      message: message,
    }

    // Act: Send POST request with an invalid signature (e.g., signed by a different account)
    // Use TEST_ACCOUNT_NODE_B to sign, but the server expects TEST_ACCOUNT_NODE_A
    const invalidSignature = await generateSignature(
      TEST_ACCOUNT_NODE_B,
      typedData,
      "typedData",
    )

    const response = await app.inject({
      method: "POST",
      url: "/ewp/connections",
      payload: {
        typedData: typedData,
        signature: invalidSignature,
      },
    })

    // Assert
    t.is(response.statusCode, 400, "should return 400 Bad Request")
    t.deepEqual(
      response.json(),
      { error: "INVALID_SIGNATURE" },
      "should return INVALID_SIGNATURE error",
    )
  },
)

test.serial(
  "POST /connections should return 400 for expired timestamp",
  async (t) => {
    const { app } = t.context

    // Mock TEST_NODE_B's /profile endpoint (the followee's profile)
    nock(TEST_NODE_B.url).get("/ewp/profile").reply(200, {
      address: TEST_NODE_B.address,
      title: TEST_NODE_B.title,
      url: TEST_NODE_B.url,
      description: TEST_NODE_B.description,
    })

    const timestamp = getExpiredTimestamp() // Use an expired timestamp
    const message = {
      followeeAddress: TEST_NODE_B.address, // Changed to TEST_NODE_B
      followeeUrl: TEST_NODE_B.url, // Added
      followerUrl: TEST_NODE_A.url, // Changed to TEST_NODE_A
      timestamp: timestamp,
    }
    const typedData = {
      domain: CREATE_CONNECTION_DOMAIN,
      types: CREATE_CONNECTION_TYPES,
      primaryType: "CreateConnection",
      message: message,
    }

    const signature = await generateSignature(
      TEST_ACCOUNT_NODE_A,
      typedData,
      "typedData",
    ) // Changed to TEST_ACCOUNT_NODE_A

    // Act: Send POST request with expired timestamp
    const response = await app.inject({
      method: "POST",
      url: "/ewp/connections",
      payload: {
        typedData: typedData,
        signature: signature,
      },
    })

    // Assert
    t.is(response.statusCode, 400, "should return 400 Bad Request")
    t.deepEqual(
      response.json(),
      { error: "INVALID_TIMESTAMP" },
      "should return INVALID_TIMESTAMP error",
    )
  },
)

test.serial(
  "POST /connections should return 400 for future timestamp",
  async (t) => {
    const { app } = t.context

    // Arrange: Set up Node A as self node (our local node, the receiver)

    // Mock TEST_NODE_B's /profile endpoint (the followee's profile)
    nock(TEST_NODE_B.url).get("/ewp/profile").reply(200, {
      address: TEST_NODE_B.address,
      title: TEST_NODE_B.title,
      url: TEST_NODE_B.url,
      description: TEST_NODE_B.description,
    })

    const timestamp = getFutureTimestamp() // Use a future timestamp
    const message = {
      followeeAddress: TEST_NODE_B.address, // Changed to TEST_NODE_B
      followeeUrl: TEST_NODE_B.url, // Added
      followerUrl: TEST_NODE_A.url, // Changed to TEST_NODE_A
      timestamp: timestamp,
    }
    const typedData = {
      domain: CREATE_CONNECTION_DOMAIN,
      types: CREATE_CONNECTION_TYPES,
      primaryType: "CreateConnection",
      message: message,
    }

    const signature = await generateSignature(
      TEST_ACCOUNT_NODE_A,
      typedData,
      "typedData",
    ) // Changed to TEST_ACCOUNT_NODE_A

    // Act: Send POST request with future timestamp
    const response = await app.inject({
      method: "POST",
      url: "/ewp/connections",
      payload: {
        typedData: typedData,
        signature: signature,
      },
    })

    // Assert
    t.is(response.statusCode, 400, "should return 400 Bad Request")
    t.deepEqual(
      response.json(),
      { error: "INVALID_TIMESTAMP" },
      "should return INVALID_TIMESTAMP error",
    )
  },
)

test.serial(
  "POST /connections should return 400 for invalid followerUrl format",
  async (t) => {
    const { app } = t.context

    // Arrange: Set up Node A as self node (our local node, the receiver)

    // No nock mock for invalid URL, as it should fail validation before fetching profile

    const timestamp = getValidTimestamp()
    const message = {
      followeeAddress: TEST_NODE_B.address, // Changed to TEST_NODE_B
      followeeUrl: TEST_NODE_B.url, // Added
      followerUrl: "not-a-valid-url", // Invalid URL format
      timestamp: timestamp,
    }
    const typedData = {
      domain: CREATE_CONNECTION_DOMAIN,
      types: CREATE_CONNECTION_TYPES,
      primaryType: "CreateConnection",
      message: message,
    }

    const signature = await generateSignature(
      TEST_ACCOUNT_NODE_A,
      typedData,
      "typedData",
    ) // Changed to TEST_ACCOUNT_NODE_A

    // Act: Send POST request with invalid followerUrl
    const response = await app.inject({
      method: "POST",
      url: "/ewp/connections",
      payload: {
        typedData: typedData,
        signature: signature,
      },
    })

    // Assert
    t.is(response.statusCode, 400, "should return 400 Bad Request")
    t.deepEqual(
      response.json(),
      { error: "INVALID_URL_FORMAT" },
      "should return INVALID_URL_FORMAT error",
    )
  },
)

test.serial(
  "POST /connections should return 409 if connection already exists",
  async (t) => {
    const { app } = t.context

    // Arrange: Set up Node A as self node (our local node, the receiver)

    // Ensure TEST_NODE_B (the followee) exists in DB
    let followeeNode = await Node.query().findOne({
      address: TEST_NODE_B.address,
    })
    if (!followeeNode) {
      followeeNode = await Node.query().insert({
        address: TEST_NODE_B.address,
        url: TEST_NODE_B.url,
        title: TEST_NODE_B.title,
        description: TEST_NODE_B.description,
        is_self: false,
        profile_version: 0,
      })
    }

    // Create the connection in the DB beforehand
    const selfNode = await Node.query().findOne({ is_self: true })
    const connection = await Connection.query().insert({
      follower_address: selfNode.address, // Our local node (Node B in spec)
      followee_address: followeeNode.address, // The external followee (Node A in spec)
    })

    // Mock TEST_NODE_B's /profile endpoint (the followee's profile)
    nock(TEST_NODE_B.url).get("/ewp/profile").reply(200, {
      address: TEST_NODE_B.address,
      title: TEST_NODE_B.title,
      url: TEST_NODE_B.url,
      description: TEST_NODE_B.description,
    })

    const timestamp = getValidTimestamp()
    const message = {
      followeeAddress: TEST_NODE_B.address, // The external followee's address
      followeeUrl: TEST_NODE_B.url, // The external followee's URL
      followerUrl: TEST_NODE_A.url, // Our local node's URL
      timestamp: timestamp,
    }
    const typedData = {
      domain: CREATE_CONNECTION_DOMAIN,
      types: CREATE_CONNECTION_TYPES,
      primaryType: "CreateConnection",
      message: message,
    }

    const signature = await generateSignature(
      TEST_ACCOUNT_NODE_A,
      typedData,
      "typedData",
    ) // Changed to TEST_ACCOUNT_NODE_A

    // Act: Send POST request to create the connection again
    const response = await app.inject({
      method: "POST",
      url: "/ewp/connections",
      payload: {
        typedData: typedData,
        signature: signature,
      },
    })

    // Assert
    t.is(response.statusCode, 409, "should return 409 Conflict")
    t.deepEqual(
      response.json(),
      { error: "CONNECTION_ALREADY_EXISTS" },
      "should return CONNECTION_ALREADY_EXISTS error",
    )
    await connection.$query().delete()
    await followeeNode.$query().delete()
  },
)

test.serial(
  "POST /connections should return 400 for invalid followeeUrl format",
  async (t) => {
    const { app } = t.context

    // Arrange: Set up Node A as self node (our local node, the receiver)

    // No nock mock for invalid URL, as it should fail validation before fetching profile

    const timestamp = getValidTimestamp()
    const message = {
      followeeAddress: TEST_NODE_B.address,
      followeeUrl: "not-a-valid-followee-url", // Invalid followeeUrl format
      followerUrl: TEST_NODE_A.url,
      timestamp: timestamp,
    }
    const typedData = {
      domain: CREATE_CONNECTION_DOMAIN,
      types: CREATE_CONNECTION_TYPES,
      primaryType: "CreateConnection",
      message: message,
    }

    const signature = await generateSignature(
      TEST_ACCOUNT_NODE_A,
      typedData,
      "typedData",
    )

    // Act: Send POST request with invalid followeeUrl
    const response = await app.inject({
      method: "POST",
      url: "/ewp/connections",
      payload: {
        typedData: typedData,
        signature: signature,
      },
    })

    // Assert
    t.is(response.statusCode, 400, "should return 400 Bad Request")
    t.deepEqual(
      response.json(),
      { error: "INVALID_URL_FORMAT" },
      "should return INVALID_URL_FORMAT error",
    )
  },
)

test.serial(
  "POST /connections should return 401 for FOLLOWEE_IDENTITY_MISMATCH",
  async (t) => {
    const { app } = t.context

    // Arrange: Set up Node A as self node (our local node, the receiver)

    // Mock TEST_NODE_B's /profile endpoint to return a DIFFERENT address than TEST_NODE_B.address
    // This simulates the case where the followeeUrl's profile doesn't match the followeeAddress in typedData
    nock.cleanAll()
    nock(TEST_NODE_B.url).get("/ewp/profile").reply(200, {
      address: TEST_ACCOUNT_NODE_A.address, // Mismatch: Profile claims Node A's address, but message has Node B's address
      title: TEST_NODE_B.title,
      url: TEST_NODE_B.url,
      description: TEST_NODE_B.description,
    })

    const timestamp = getValidTimestamp()
    const message = {
      followeeAddress: TEST_NODE_B.address, // The external followee's address
      followeeUrl: TEST_NODE_B.url, // The external followee's URL
      followerUrl: TEST_NODE_A.url, // Our local node's URL
      timestamp: timestamp,
    }
    const typedData = {
      domain: CREATE_CONNECTION_DOMAIN,
      types: CREATE_CONNECTION_TYPES,
      primaryType: "CreateConnection",
      message: message,
    }

    // Sign with TEST_ACCOUNT_NODE_A (our local node's key, the expected signer)
    const signature = await generateSignature(
      TEST_ACCOUNT_NODE_A,
      typedData,
      "typedData",
    )

    // Act: Send POST request
    const response = await app.inject({
      method: "POST",
      url: "/ewp/connections",
      payload: {
        typedData: typedData,
        signature: signature,
      },
    })

    // Assert
    t.is(response.statusCode, 401, "should return 401 Unauthorized")
    t.deepEqual(
      response.json(),
      { error: "FOLLOWEE_IDENTITY_MISMATCH" },
      "should return FOLLOWEE_IDENTITY_MISMATCH error",
    )
  },
)

// --- Tests for DELETE /connections ---

// Define EIP-712 Domain and Types for DeleteConnection
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

test.serial(
  "DELETE /connections > should successfully delete an existing connection and return 204 No Content",
  async (t) => {
    const { app } = t.context

    const testAccount = generateTestAccount()

    const selfNode = await Node.query().findOne({ is_self: true })
    const followerNode = await Node.query().insert({
      address: testAccount.address,
      url: `https://${testAccount.address}.test.com/`,
      title: "Test Node",
      description: "Test Description",
      is_self: false,
      profile_version: 0,
    })
    const connection = await Connection.query().insert({
      follower_address: selfNode.address, // Follower node (current node)
      followee_address: followerNode.address, // Followee node
    })

    const message = {
      followeeAddress: followerNode.address, // Followee node address
      followerAddress: selfNode.address, // Follower node address (current node)
      timestamp: getValidTimestamp(),
    }

    const typedData = {
      domain: DELETE_CONNECTION_DOMAIN,
      types: DELETE_CONNECTION_TYPES,
      primaryType: "DeleteConnection",
      message,
    }

    // The follower (selfNode) signs the message
    const signature = await generateSignature(
      TEST_ACCOUNT_NODE_A,
      typedData,
      "typedData",
    )

    const response = await app.inject({
      method: "DELETE",
      url: "/ewp/connections",
      payload: { typedData, signature },
    })

    t.is(response.statusCode, 204, "should return 204 No Content")

    const connectionAfter = await Connection.query().findById(connection.id)
    t.falsy(
      connectionAfter,
      "connection record should be deleted from the database",
    )
    await connection.$query().delete()
    await followerNode.$query().delete()
  },
)

test.serial(
  "DELETE /connections > should return 204 for a non-existent connection if signature is valid (idempotency)",
  async (t) => {
    const { app } = t.context

    const testAccount = generateTestAccount()

    const selfNode = await Node.query().findOne({ is_self: true })

    const message = {
      followeeAddress: testAccount.address, // Followee node address
      followerAddress: selfNode.address, // Follower node address (current node)
      timestamp: getValidTimestamp(),
    }

    const typedData = {
      domain: DELETE_CONNECTION_DOMAIN,
      types: DELETE_CONNECTION_TYPES,
      primaryType: "DeleteConnection",
      message,
    }

    const signature = await generateSignature(
      TEST_ACCOUNT_NODE_A,
      typedData,
      "typedData",
    )

    const response = await app.inject({
      method: "DELETE",
      url: "/ewp/connections",
      payload: { typedData, signature },
    })

    t.is(
      response.statusCode,
      204,
      "should return 204 No Content for idempotency",
    )
  },
)

test.serial(
  "DELETE /connections > should return 400 INVALID_SIGNATURE for a mismatched signature",
  async (t) => {
    const { app } = t.context

    const testAccount = generateTestAccount()
    const selfNode = await Node.query().findOne({ is_self: true })
    const followerNode = await Node.query().insert({
      address: testAccount.address,
      url: `https://${testAccount.address}.test.com/`,
      title: "Test Node",
      description: "Test Description",
      is_self: false,
      profile_version: 0,
    })
    const connection = await Connection.query().insert({
      follower_address: selfNode.address, // Follower node (current node)
      followee_address: followerNode.address, // Followee node
    })

    const message = {
      followeeAddress: followerNode.address, // Followee node address
      followerAddress: selfNode.address, // Follower node address (current node)
      timestamp: getValidTimestamp(),
    }

    const typedData = {
      domain: DELETE_CONNECTION_DOMAIN,
      types: DELETE_CONNECTION_TYPES,
      primaryType: "DeleteConnection",
      message,
    }

    // Sign with the WRONG key (Node A signs a message that should be from Node B)
    const signature = await generateSignature(
      TEST_ACCOUNT_NODE_B,
      typedData,
      "typedData",
    )

    const response = await app.inject({
      method: "DELETE",
      url: "/ewp/connections",
      payload: { typedData, signature },
    })

    t.is(response.statusCode, 400, "should return 400 Bad Request")
    t.deepEqual(response.json(), { error: "INVALID_SIGNATURE" })

    const connectionAfter = await Connection.query().findById(connection.id)
    t.truthy(connectionAfter, "connection should not be deleted on failure")
    await connection.$query().delete()
    await followerNode.$query().delete()
  },
)

test.serial(
  "DELETE /connections > should return 400 INVALID_TIMESTAMP for an expired timestamp",
  async (t) => {
    const { app } = t.context

    const testAccount = generateTestAccount()

    const selfNode = await Node.query().findOne({ is_self: true })
    const followerNode = await Node.query().insert({
      address: testAccount.address,
      url: `https://${testAccount.address}.test.com/`,
      title: "Test Node",
      description: "Test Description",
      is_self: false,
      profile_version: 0,
    })

    const connection = await Connection.query().insert({
      follower_address: selfNode.address, // Follower node (current node)
      followee_address: followerNode.address, // Followee node
    })

    const message = {
      followeeAddress: followerNode.address, // Followee node address
      followerAddress: selfNode.address, // Follower node address (current node)
      timestamp: getExpiredTimestamp(), // Expired timestamp
    }

    const typedData = {
      domain: DELETE_CONNECTION_DOMAIN,
      types: DELETE_CONNECTION_TYPES,
      primaryType: "DeleteConnection",
      message,
    }

    const signature = await generateSignature(
      TEST_ACCOUNT_NODE_A,
      typedData,
      "typedData",
    )

    const response = await app.inject({
      method: "DELETE",
      url: "/ewp/connections",
      payload: { typedData, signature },
    })

    t.is(response.statusCode, 400, "should return 400 Bad Request")
    t.deepEqual(response.json(), { error: "INVALID_TIMESTAMP" })

    const connectionAfter = await Connection.query().findById(connection.id)
    t.truthy(connectionAfter, "connection should not be deleted on failure")
    await connection.$query().delete()
    await followerNode.$query().delete()
  },
)

// --- Scenario 2: Test cases initiated from follower node ---

test.serial(
  "DELETE /connections > Scenario 2: Should successfully delete connection initiated from follower node",
  async (t) => {
    const { app } = t.context

    const testAccount = generateTestAccount()

    const selfNode = await Node.query().findOne({ is_self: true })
    const followerNode = await Node.query().insert({
      address: testAccount.address,
      url: `https://${testAccount.address}.test.com/`,
      title: "Test Node",
      description: "Test Description",
      is_self: false,
      profile_version: 0,
    })
    const connection = await Connection.query().insert({
      follower_address: followerNode.address, // Follower node
      followee_address: selfNode.address, // Followee node (current node)
    })

    const message = {
      followeeAddress: selfNode.address, // Followee node address (current node)
      followerAddress: followerNode.address, // Follower node address
      timestamp: getValidTimestamp(),
    }

    const typedData = {
      domain: DELETE_CONNECTION_DOMAIN,
      types: DELETE_CONNECTION_TYPES,
      primaryType: "DeleteConnection",
      message,
    }

    // Follower node signs
    const signature = await generateSignature(
      testAccount,
      typedData,
      "typedData",
    )

    const response = await app.inject({
      method: "DELETE",
      url: "/ewp/connections",
      payload: { typedData, signature },
    })

    t.is(response.statusCode, 204, "should return 204 No Content")

    const connectionAfter = await Connection.query().findById(connection.id)
    t.falsy(
      connectionAfter,
      "connection record should be deleted from the database",
    )
    await connection.$query().delete()
    await followerNode.$query().delete()
  },
)

test.serial(
  "DELETE /connections > Scenario 2: Should support idempotency when initiated from follower node",
  async (t) => {
    const { app } = t.context

    const testAccount = generateTestAccount()

    const selfNode = await Node.query().findOne({ is_self: true })

    const message = {
      followeeAddress: selfNode.address, // Followee node address (current node)
      followerAddress: testAccount.address, // Follower node address
      timestamp: getValidTimestamp(),
    }

    const typedData = {
      domain: DELETE_CONNECTION_DOMAIN,
      types: DELETE_CONNECTION_TYPES,
      primaryType: "DeleteConnection",
      message,
    }

    const signature = await generateSignature(
      testAccount,
      typedData,
      "typedData",
    )

    const response = await app.inject({
      method: "DELETE",
      url: "/ewp/connections",
      payload: { typedData, signature },
    })

    t.is(
      response.statusCode,
      204,
      "should return 204 No Content for idempotency",
    )
  },
)

test.serial(
  "DELETE /connections > Scenario 2: Should reject invalid signature when initiated from follower node",
  async (t) => {
    const { app } = t.context

    const testAccount = generateTestAccount()

    const selfNode = await Node.query().findOne({ is_self: true })
    const followerNode = await Node.query().insert({
      address: testAccount.address,
      url: `https://${testAccount.address}.test.com/`,
      title: "Test Node",
      description: "Test Description",
      is_self: false,
      profile_version: 0,
    })
    const connection = await Connection.query().insert({
      follower_address: followerNode.address, // Follower node
      followee_address: selfNode.address, // Followee node (current node)
    })

    const message = {
      followeeAddress: selfNode.address, // Followee node address (current node)
      followerAddress: followerNode.address, // Follower node address
      timestamp: getValidTimestamp(),
    }

    const typedData = {
      domain: DELETE_CONNECTION_DOMAIN,
      types: DELETE_CONNECTION_TYPES,
      primaryType: "DeleteConnection",
      message,
    }

    // Use wrong signer (Node A signs, but message claims to be from testAccount)
    const signature = await generateSignature(
      TEST_ACCOUNT_NODE_A,
      typedData,
      "typedData",
    )

    const response = await app.inject({
      method: "DELETE",
      url: "/ewp/connections",
      payload: { typedData, signature },
    })

    t.is(response.statusCode, 400, "should return 400 Bad Request")
    t.deepEqual(response.json(), { error: "INVALID_SIGNATURE" })

    const connectionAfter = await Connection.query().findById(connection.id)
    t.truthy(connectionAfter, "connection should not be deleted on failure")
    await connection.$query().delete()
    await followerNode.$query().delete()
  },
)

// --- Invalid Scenario Tests ---

test.serial(
  "DELETE /connections > Should reject invalid scenario (current node not involved in connection)",
  async (t) => {
    const { app } = t.context

    const testAccount = generateTestAccount()
    const anotherAccount = generateTestAccount()

    const message = {
      followeeAddress: anotherAccount.address, // Neither current node
      followerAddress: testAccount.address, // Nor current node
      timestamp: getValidTimestamp(),
    }

    const typedData = {
      domain: DELETE_CONNECTION_DOMAIN,
      types: DELETE_CONNECTION_TYPES,
      primaryType: "DeleteConnection",
      message,
    }

    const signature = await generateSignature(
      testAccount,
      typedData,
      "typedData",
    )

    const response = await app.inject({
      method: "DELETE",
      url: "/ewp/connections",
      payload: { typedData, signature },
    })

    t.is(response.statusCode, 400, "should return 400 Bad Request")
    t.deepEqual(response.json(), { error: "INVALID_SIGNATURE" })
  },
)

// --- Payload Validation Tests ---

test.serial(
  "DELETE /connections should return 400 for missing typedData in payload",
  async (t) => {
    const { app } = t.context

    // Act: Send DELETE request with missing typedData
    const response = await app.inject({
      method: "DELETE",
      url: "/ewp/connections",
      payload: {
        signature: "0xvalidSignature", // Signature is present but typedData is missing
      },
    })

    // Assert
    t.is(response.statusCode, 400, "should return 400 Bad Request")
    t.deepEqual(
      response.json(),
      { error: "INVALID_PAYLOAD" },
      "should return INVALID_PAYLOAD error",
    )
  },
)

test.serial(
  "DELETE /connections should return 400 for missing signature in payload",
  async (t) => {
    const { app } = t.context

    const message = {
      followeeAddress: TEST_NODE_B.address,
      followerAddress: TEST_NODE_A.address,
      timestamp: getValidTimestamp(),
    }
    const typedData = {
      domain: DELETE_CONNECTION_DOMAIN,
      types: DELETE_CONNECTION_TYPES,
      primaryType: "DeleteConnection",
      message,
    }

    // Act: Send DELETE request with missing signature
    const response = await app.inject({
      method: "DELETE",
      url: "/ewp/connections",
      payload: {
        typedData: typedData, // typedData is present but signature is missing
      },
    })

    // Assert
    t.is(response.statusCode, 400, "should return 400 Bad Request")
    t.deepEqual(
      response.json(),
      { error: "INVALID_PAYLOAD" },
      "should return INVALID_PAYLOAD error",
    )
  },
)

test.serial(
  "DELETE /connections should return 400 for malformed typedData in payload",
  async (t) => {
    const { app } = t.context

    // Act: Send DELETE request with malformed typedData
    const response = await app.inject({
      method: "DELETE",
      url: "/ewp/connections",
      payload: {
        typedData: {
          // Missing essential fields like domain, types, primaryType, message
          malformed: "data",
        },
        signature: "0xvalidSignature",
      },
    })

    // Assert
    t.is(response.statusCode, 400, "should return 400 Bad Request")
    t.deepEqual(
      response.json(),
      { error: "INVALID_PAYLOAD" },
      "should return INVALID_PAYLOAD error",
    )
  },
)

test.serial(
  "DELETE /connections should return 400 for missing message in typedData",
  async (t) => {
    const { app } = t.context

    // Act: Send DELETE request with typedData missing message field
    const response = await app.inject({
      method: "DELETE",
      url: "/ewp/connections",
      payload: {
        typedData: {
          domain: DELETE_CONNECTION_DOMAIN,
          types: DELETE_CONNECTION_TYPES,
          primaryType: "DeleteConnection",
          // message field is missing
        },
        signature: "0xvalidSignature",
      },
    })

    // Assert
    t.is(response.statusCode, 400, "should return 400 Bad Request")
    t.deepEqual(
      response.json(),
      { error: "INVALID_PAYLOAD" },
      "should return INVALID_PAYLOAD error",
    )
  },
)

test.serial(
  "DELETE /connections should return 400 for missing required fields in message",
  async (t) => {
    const { app } = t.context

    // Act: Send DELETE request with message missing required fields
    const response = await app.inject({
      method: "DELETE",
      url: "/ewp/connections",
      payload: {
        typedData: {
          domain: DELETE_CONNECTION_DOMAIN,
          types: DELETE_CONNECTION_TYPES,
          primaryType: "DeleteConnection",
          message: {
            followeeAddress: TEST_NODE_B.address,
            // followerAddress is missing
            timestamp: getValidTimestamp(),
          },
        },
        signature: "0xvalidSignature",
      },
    })

    // Assert
    t.is(response.statusCode, 400, "should return 400 Bad Request")
    t.deepEqual(
      response.json(),
      { error: "INVALID_PAYLOAD" },
      "should return INVALID_PAYLOAD error",
    )
  },
)

test.serial(
  "DELETE /connections should return 400 for invalid address format in message",
  async (t) => {
    const { app } = t.context

    // Act: Send DELETE request with invalid address format
    const response = await app.inject({
      method: "DELETE",
      url: "/ewp/connections",
      payload: {
        typedData: {
          domain: DELETE_CONNECTION_DOMAIN,
          types: DELETE_CONNECTION_TYPES,
          primaryType: "DeleteConnection",
          message: {
            followeeAddress: "invalid-address-format", // Invalid address format
            followerAddress: TEST_NODE_A.address,
            timestamp: getValidTimestamp(),
          },
        },
        signature: "0xvalidSignature",
      },
    })

    // Assert
    t.is(response.statusCode, 400, "should return 400 Bad Request")
    t.deepEqual(
      response.json(),
      { error: "INVALID_PAYLOAD" },
      "should return INVALID_PAYLOAD error",
    )
  },
)

test.serial(
  "DELETE /connections should return 400 for invalid timestamp type in message",
  async (t) => {
    const { app } = t.context

    // Act: Send DELETE request with invalid timestamp type
    const response = await app.inject({
      method: "DELETE",
      url: "/ewp/connections",
      payload: {
        typedData: {
          domain: DELETE_CONNECTION_DOMAIN,
          types: DELETE_CONNECTION_TYPES,
          primaryType: "DeleteConnection",
          message: {
            followeeAddress: TEST_NODE_B.address,
            followerAddress: TEST_NODE_A.address,
            timestamp: "not-a-number", // Invalid timestamp type
          },
        },
        signature: "0xvalidSignature",
      },
    })

    // Assert
    t.is(response.statusCode, 400, "should return 400 Bad Request")
    t.deepEqual(
      response.json(),
      { error: "INVALID_PAYLOAD" },
      "should return INVALID_PAYLOAD error",
    )
  },
)
