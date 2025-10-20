import test from "ava"
import { SiweMessage } from "siwe"
import { generateNonceJwt } from "../../server/graphql/queries/auth.mjs"
import { Node } from "../../server/models/index.mjs"
import {
  generateSignature,
  TEST_ACCOUNT_NODE_A,
  TEST_ACCOUNT_NODE_B,
  TEST_ETHEREUM_ADDRESS_NODE_A,
} from "../setup.mjs"

// Test case 1: Success path
test("getSiweMessage: Successfully get SIWE message", async (t) => {
  const { graphqlClient } = t.context

  const query = `
    query GetSiweMessage($address: String!) {
      getSiweMessage(address: $address)
    }
  `

  const variables = { address: TEST_ETHEREUM_ADDRESS_NODE_A }

  const { data, errors } = await graphqlClient.query(query, { variables })

  // Assertion 1: Confirm request succeeded, no GraphQL errors
  t.falsy(
    errors,
    "A valid address request should not return any GraphQL errors",
  )

  // Assertion 2: Confirm returned value is a non-empty string
  const message = data.getSiweMessage
  t.true(
    typeof message === "string" && message.length > 0,
    "Should return a non-empty string message",
  )

  // Assertion 3: Confirm message contains the requested address
  t.true(
    message.includes(TEST_ETHEREUM_ADDRESS_NODE_A),
    "Message must contain the requester's Ethereum address",
  )

  // Assertion 4: Confirm message contains key parts of SIWE specification
  t.true(
    message.includes("wants you to sign in with your Ethereum account"),
    "Message should contain standard SIWE statement",
  )
  t.true(message.includes("URI:"), "Message should contain URI")
  t.true(message.includes("Version:"), "Message should contain version")
  t.true(message.includes("Chain ID:"), "Message should contain Chain ID")
  t.true(message.includes("Nonce:"), "Message should contain a nonce")
  t.true(message.includes("Issued At:"), "Message should contain issued time")
})

// Test case 2: Failure path
test("getSiweMessage: Using invalid address should return error", async (t) => {
  const { graphqlClient } = t.context

  const query = `
    query GetSiweMessage($address: String!) {
      getSiweMessage(address: $address)
    }
  `

  const invalidAddress = "0xThisIsAnInvalidAddress" // An invalid address
  const variables = { address: invalidAddress }

  const { data, errors } = await graphqlClient.query(query, { variables })

  // Assertion 1: Confirm request returned GraphQL error
  t.truthy(errors, "For invalid address, should return GraphQL error")
  t.is(data, null, "When error occurs, data field should be null")

  // Assertion 2: Confirm error code matches expected
  t.true(
    errors.some((e) => e.extensions?.code === "VALIDATION_FAILED"),
    "Error code should be VALIDATION_FAILED",
  )
})

// Test case 3: Successfully login and get JWT
test("signInWithEthereum: Successfully login and return JWT token", async (t) => {
  const { graphqlClient } = t.context

  // 1. Get SIWE message from server
  const getMessageQuery = `
    query GetSiweMessage($address: String!) {
      getSiweMessage(address: $address)
    }
  `
  const getMessageVariables = { address: TEST_ACCOUNT_NODE_A.address } // <-- FIX: Added variables here
  const { data: messageData, errors: messageErrors } =
    await graphqlClient.query(getMessageQuery, {
      variables: getMessageVariables,
    })
  t.falsy(messageErrors, "Getting SIWE message should not have errors")
  const siweMessage = messageData.getSiweMessage
  t.truthy(siweMessage, "Should receive SIWE message")

  // 2. Sign the message using test account private key
  const signature = await generateSignature(
    TEST_ACCOUNT_NODE_A,
    siweMessage,
    "message",
  )
  t.truthy(signature, "Should generate valid signature")

  // 3. Call signInWithEthereum mutation
  const signInMutation = `
    mutation SignInWithEthereum($message: String!, $signature: String!) {
      signInWithEthereum(message: $message, signature: $signature)
    } 
  `
  const signInVariables = { message: siweMessage, signature: signature }
  const { data: signInData, errors: signInErrors } = await graphqlClient.query(
    signInMutation,
    { variables: signInVariables },
  )

  // Assertions
  t.falsy(signInErrors, "Login should not have any GraphQL errors")
  const jwtToken = signInData.signInWithEthereum
  t.true(
    typeof jwtToken === "string" && jwtToken.length > 0,
    "Should return a non-empty JWT token string",
  )

  // JWT structure validation can be added here, but currently just checking string is sufficient.
})

// Test case 4: Invalid signature
test("signInWithEthereum: Invalid signature should return error", async (t) => {
  const { graphqlClient } = t.context

  // 1. Get SIWE message from server
  const getMessageQuery = `
    query GetSiweMessage($address: String!) {
      getSiweMessage(address: $address)
    }
  `
  const getMessageVariables = { address: TEST_ACCOUNT_NODE_A.address } // <-- FIX: Added variables here
  const { data: messageData, errors: messageErrors } =
    await graphqlClient.query(getMessageQuery, {
      variables: getMessageVariables,
    })
  t.falsy(messageErrors, "Getting SIWE message should not have errors")
  const siweMessage = messageData.getSiweMessage

  // 2. Use an invalid signature (e.g., from a different account)
  const invalidSignature = await generateSignature(
    TEST_ACCOUNT_NODE_B,
    siweMessage,
    "message",
  )

  // 3. Call signInWithEthereum mutation
  const signInMutation = `
    mutation SignInWithEthereum($message: String!, $signature: String!) {
      signInWithEthereum(message: $message, signature: $signature)
    }
  `
  const signInVariables = { message: siweMessage, signature: invalidSignature }
  const { data: signInData, errors: signInErrors } = await graphqlClient.query(
    signInMutation,
    { variables: signInVariables },
  )

  // Assertions
  t.truthy(signInErrors, "Invalid signature should return GraphQL error")
  t.is(signInData, null, "When error occurs, data field should be null")
  t.true(
    signInErrors.some((e) => e.extensions?.code === "INVALID_SIGNATURE"),
    "Error code should be INVALID_SIGNATURE",
  )
})

// New test case: Nonce (JWT) expiration
test("signInWithEthereum: Should reject an expired Nonce JWT", async (t) => {
  const { graphqlClient, app } = t.context

  const selfNode = await Node.getSelf()
  // 1. Arrange: Manually construct a SIWE message with an expired Nonce
  // Directly call our exported function to generate a JWT that expired 1 second ago
  const expiredNonce = await generateNonceJwt({
    app,
    address: TEST_ACCOUNT_NODE_A.address,
    iss: selfNode.address,
    expiresIn: "-1s",
  })
  const siweMessage = new SiweMessage({
    domain: new URL(selfNode.url).hostname,
    address: TEST_ACCOUNT_NODE_A.address,
    statement: "Sign in with your Ethereum account to epress.",
    uri: selfNode.url,
    version: "1",
    chainId: 1,
    nonce: expiredNonce, // Use our forged expired Nonce
    issuedAt: new Date().toISOString(),
  })
  const messageToSign = siweMessage.prepareMessage()

  // 2. Act: Sign and attempt to login with this message
  const signature = await generateSignature(
    TEST_ACCOUNT_NODE_A,
    messageToSign,
    "message",
  )
  const signInMutation = `
    mutation SignInWithEthereum($message: String!, $signature: String!) {
      signInWithEthereum(message: $message, signature: $signature)
    }
  `
  const { data, errors } = await graphqlClient.query(signInMutation, {
    variables: { message: messageToSign, signature },
  })

  // 3. Assert:
  t.truthy(errors, "For expired Nonce, should return GraphQL error")
  t.is(data, null, "When error occurs, data field should be null")
  t.true(
    errors.some((e) => e.extensions?.code === "EXPIRED_NONCE"),
    "Error code should be EXPIRED_NONCE",
  )
})

// New test case: Malformed message
test("signInWithEthereum: Should reject a malformed message string", async (t) => {
  const { graphqlClient } = t.context

  // 1. Arrange: Create a malformed message and generate a signature for it
  const malformedMessage = "This is definitely not a valid SIWE message."
  const signature = await generateSignature(
    TEST_ACCOUNT_NODE_A,
    malformedMessage,
    "message",
  )

  // 2. Act: Attempt to login with this malformed message
  const signInMutation = `
    mutation SignInWithEthereum($message: String!, $signature: String!) {
      signInWithEthereum(message: $message, signature: $signature)
    }
  `
  const { data, errors } = await graphqlClient.query(signInMutation, {
    variables: { message: malformedMessage, signature },
  })

  // 3. Assert:
  t.truthy(errors, "For malformed message, should return GraphQL error")
  t.is(data, null, "When error occurs, data field should be null")

  // Based on code implementation, when SIWE message parsing or verification fails, it throws a generic authentication failure error
  t.true(
    errors.some((e) => e.extensions?.code === "UNAUTHENTICATED"),
    "Error code should be UNAUTHENTICATED",
  )
})

// Test case: generateIntegrationToken - Success path
test("generateIntegrationToken: Should generate token with valid client JWT", async (t) => {
  const { graphqlClient, createClientJwt } = t.context

  // 1. Get a valid client JWT directly
  const clientJwt = await createClientJwt(TEST_ETHEREUM_ADDRESS_NODE_A)

  // 2. Test generateIntegrationToken
  const mutation = `
    mutation GenerateIntegrationToken($scope: [String!]!, $expiresIn: String) {
      generateIntegrationToken(scope: $scope, expiresIn: $expiresIn)
    }
  `

  const variables = {
    scope: ["search:publication", "create:publication"],
    expiresIn: "1h",
  }

  const { data, errors } = await graphqlClient.query(mutation, {
    variables,
    headers: { Authorization: `Bearer ${clientJwt}` },
  })

  // 3. Assertions
  t.falsy(errors, "Should not return any GraphQL errors")
  t.truthy(data.generateIntegrationToken, "Should return a token")
  t.true(
    typeof data.generateIntegrationToken === "string",
    "Token should be a string",
  )
  t.true(data.generateIntegrationToken.length > 0, "Token should not be empty")

  // 4. Verify the generated token
  try {
    const selfNode = await Node.getSelf()
    const decodedToken = await t.context.app.jwt.verify(
      data.generateIntegrationToken,
      {
        allowedIss: selfNode.address,
      },
    )
    t.is(
      decodedToken.aud,
      "integration",
      "Token audience should be integration",
    )
    t.is(
      decodedToken.sub,
      TEST_ETHEREUM_ADDRESS_NODE_A,
      "Token subject should match the user address",
    )
    t.true(Array.isArray(decodedToken.scope), "Token should have scope array")
    t.deepEqual(
      decodedToken.scope,
      ["search:publication", "create:publication"],
      "Token scope should match requested scope",
    )
    t.truthy(decodedToken.exp, "Token should have expiration time")
    t.truthy(decodedToken.iat, "Token should have issued at time")
  } catch (verifyError) {
    t.fail(`Generated token verification failed: ${verifyError.message}`)
  }
})

// Test case: generateIntegrationToken - Unauthenticated
test("generateIntegrationToken: Should fail without authentication", async (t) => {
  const { graphqlClient } = t.context

  const mutation = `
    mutation GenerateIntegrationToken($scope: [String!]!) {
      generateIntegrationToken(scope: $scope)
    }
  `

  const variables = {
    scope: ["search:publication"],
  }

  const { data, errors } = await graphqlClient.query(mutation, { variables })

  // Assertions
  t.truthy(errors, "Should return GraphQL errors when not authenticated")
  t.is(data, null, "Data should be null when error occurs")
  t.true(
    errors.some((e) => e.extensions?.code === "UNAUTHENTICATED"),
    "Error code should be UNAUTHENTICATED",
  )
})

// Test case: generateIntegrationToken - Invalid JWT audience
test("generateIntegrationToken: Should fail with non-client JWT", async (t) => {
  const { graphqlClient } = t.context

  // Create an integration JWT (not client JWT)
  const integrationJwt = await t.context.createIntegrationJwt([
    "search:publications",
  ])

  const mutation = `
    mutation GenerateIntegrationToken($scope: [String!]!) {
      generateIntegrationToken(scope: $scope)
    }
  `

  const variables = {
    scope: ["search:publication"],
  }

  const { data, errors } = await graphqlClient.query(mutation, {
    variables,
    headers: { Authorization: `Bearer ${integrationJwt}` },
  })

  // Assertions
  t.truthy(errors, "Should return GraphQL errors with non-client JWT")
  t.is(data, null, "Data should be null when error occurs")
  t.true(
    errors.some((e) => e.extensions?.code === "UNAUTHENTICATED"),
    "Error code should be UNAUTHENTICATED",
  )
})
