import test from "ava"
import nodemailer from "nodemailer"
import sinon from "sinon"
import {
  Comment,
  Content,
  Node,
  Publication,
  Setting,
} from "../../server/models/index.mjs"
import { hash } from "../../server/utils/crypto.mjs" // Import hash utility
import { setTransporter } from "../../server/utils/email/index.mjs"
import {
  generateSignature,
  TEST_ACCOUNT_NODE_A,
  TEST_ACCOUNT_NODE_B,
  TEST_ETHEREUM_ADDRESS_NODE_A,
} from "../setup.mjs" // Import generateSignature

let testPublication // Used to store Publication created in beforeEach

test.beforeEach(async (t) => {
  // Clean up related tables before each test
  await Comment.query().delete()
  await Publication.query().delete()
  await Content.query().delete()
  await Setting.query().where({ key: "allow_comment" }).delete()

  // Create a virtual Publication for commenting
  const selfNode = await Node.getSelf()
  const uniqueBody = `Test content for comment ${Date.now()}-${Math.random()}.`
  const content = await Content.create({ type: "post", body: uniqueBody })
  testPublication = await Publication.query().insert({
    content_hash: content.content_hash,
    author_address: selfNode.address,
    signature: null, // Simplified, set as unsigned
    comment_count: 0,
  })
  t.context.publicationId = testPublication.id
  t.context.selfNode = selfNode // Store selfNode for use in tests
  t.context.testPublication = testPublication // Store testPublication for use in tests
  setTransporter(null)
  sinon.restore()
  const sendMailSpy = sinon.spy()
  // stub createTransport 返回这个带 spy 的对象
  sinon.stub(nodemailer, "createTransport").returns({
    sendMail: sendMailSpy,
    verify: async () => true,
  })
  t.context.sendMailSpy = sendMailSpy
})

const COMMENT_SIGNATURE_DOMAIN = {
  name: "epress world",
  version: "1",
  chainId: 1,
}

const COMMENT_SIGNATURE_TYPES = {
  EIP712Domain: [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "chainId", type: "uint256" },
  ],
  CommentSignature: [
    { name: "nodeAddress", type: "address" },
    { name: "commenterAddress", type: "address" },
    { name: "publicationId", type: "uint256" },
    { name: "commentBodyHash", type: "bytes32" },
    { name: "timestamp", type: "uint256" },
  ],
}

// Test case 1: Email authentication - Success
test.serial(
  "createComment: Should be able to create comment through EMAIL authentication with PENDING status",
  async (t) => {
    const { graphqlClient, publicationId, sendMailSpy } = t.context

    const mutation = `
    mutation CreateComment($input: CreateCommentInput!) {
      createComment(input: $input) {
        id
        body
        status
        auth_type
        author_name
        created_at
      }
    }
  `

    const input = {
      publication_id: publicationId,
      body: "This is a test comment through email.",
      author_name: "Email User",
      auth_type: "EMAIL",
      author_id: "email@example.com",
    }

    const { data, errors } = await graphqlClient.query(mutation, {
      variables: { input },
    })

    t.falsy(errors, "Should not have any GraphQL errors")
    t.truthy(data.createComment, "Should return created comment")
    t.is(data.createComment.body, input.body, "Comment body should match")
    t.is(
      data.createComment.status,
      "PENDING",
      "Email authentication comment status should be PENDING",
    )
    t.is(
      data.createComment.auth_type,
      input.auth_type,
      "Authentication type should match",
    )
    t.is(
      data.createComment.author_name,
      input.author_name,
      "Author name should match",
    )
    // email field is hidden to protect user privacy
    t.truthy(data.createComment.id, "Comment should have ID")
    t.truthy(
      data.createComment.created_at,
      "Comment should have created_at timestamp",
    )
    // TODO: Verify if email was sent
    t.true(sendMailSpy.called, "sendMail should be called")
    console.log(sendMailSpy.callCount, "-------------------")

    // Verify comment was saved to database
    const commentInDb = await Comment.query().findById(data.createComment.id)
    t.truthy(commentInDb, "Comment should be saved to database")
    t.is(commentInDb.status, "PENDING", "Status in database should be PENDING")
  },
)

// Test case 2: Ethereum authentication - Success
test.serial(
  "createComment: Should create ETHEREUM authenticated comment with PENDING status (two-step)",
  async (t) => {
    const { graphqlClient, publicationId } = t.context

    const commentBody = "This is a test comment through Ethereum."

    const mutation = `
    mutation CreateComment($input: CreateCommentInput!) {
      createComment(input: $input) {
        id
        body
        status
        auth_type
        author_name
        author_id
        created_at
      }
    }
  `

    const input = {
      publication_id: publicationId,
      body: commentBody,
      author_name: "Ethereum User",
      auth_type: "ETHEREUM",
      author_id: TEST_ETHEREUM_ADDRESS_NODE_A,
    }

    const { data, errors } = await graphqlClient.query(mutation, {
      variables: { input },
    })

    t.falsy(errors, "Should not have any GraphQL errors")
    t.truthy(data.createComment, "Should return created comment")
    t.is(data.createComment.body, input.body, "Comment body should match")
    t.is(
      data.createComment.status,
      "PENDING",
      "Ethereum authentication comment status should be PENDING",
    )
    t.is(
      data.createComment.auth_type,
      input.auth_type,
      "Authentication type should match",
    )
    t.is(
      data.createComment.author_name,
      input.author_name,
      "Commenter username should match",
    )
    t.is(
      data.createComment.author_id,
      input.author_id,
      "Commenter Ethereum address should match",
    )
    t.truthy(data.createComment.id, "Comment should have ID")
    t.truthy(
      data.createComment.created_at,
      "Comment should have created_at timestamp",
    )

    // Verify comment was saved to database
    const commentInDb = await Comment.query().findById(data.createComment.id)
    t.truthy(commentInDb, "Comment should be saved to database")
    t.is(commentInDb.status, "PENDING", "Status in database should be PENDING")
    t.is(
      commentInDb.credential,
      null,
      "Signature should not be saved at creation",
    )
  },
)

// Test Case: confirmComment - ETHEREUM path should require id when using credential
test("confirmComment: missing id for ETHEREUM credential should return VALIDATION_FAILED", async (t) => {
  const { graphqlClient, publicationId, selfNode, testPublication } = t.context
  const commentBody = "missing id case"
  const commentBodyHash = `0x${await hash.sha256(commentBody)}`

  // Create comment
  const createMutation = `
    mutation CreateComment($input: CreateCommentInput!) {
      createComment(input: $input) { id created_at }
    }
  `
  const { data: createData } = await graphqlClient.query(createMutation, {
    variables: {
      input: {
        publication_id: publicationId,
        body: commentBody,
        author_name: "id-missing",
        auth_type: "ETHEREUM",
        author_id: TEST_ETHEREUM_ADDRESS_NODE_A,
      },
    },
  })

  const timestampSec = Math.floor(
    new Date(createData.createComment.created_at).getTime() / 1000,
  )
  const typedData = {
    domain: COMMENT_SIGNATURE_DOMAIN,
    types: COMMENT_SIGNATURE_TYPES,
    primaryType: "CommentSignature",
    message: {
      nodeAddress: selfNode.address,
      commenterAddress: TEST_ACCOUNT_NODE_A.address,
      publicationId: testPublication.id,
      commentBodyHash,
      timestamp: timestampSec,
    },
  }
  const credential = await generateSignature(
    TEST_ACCOUNT_NODE_A,
    typedData,
    "typedData",
  )

  const confirmMutation = `
    mutation ConfirmComment($tokenOrSignature: String!) {
      confirmComment(tokenOrSignature: $tokenOrSignature) { id }
    }
  `
  const { data, errors } = await graphqlClient.query(confirmMutation, {
    variables: { tokenOrSignature: credential },
  })
  t.is(data, null, "Data should be null")
  t.truthy(errors, "Should return GraphQL errors")
  t.is(
    errors[0].extensions.code,
    "VALIDATION_FAILED",
    "Error code should be VALIDATION_FAILED",
  )
})

// Test Case: confirmComment - ETHEREUM path should reject expired signatures
test.serial(
  "confirmComment: expired signature should return EXPIRED_SIGNATURE",
  async (t) => {
    const { graphqlClient, publicationId, selfNode, testPublication } =
      t.context
    const commentBody = "expired signature case"
    const commentBodyHash = `0x${await hash.sha256(commentBody)}`

    // Create comment
    const createMutation = `
    mutation CreateComment($input: CreateCommentInput!) {
      createComment(input: $input) { id created_at }
    }
  `
    const { data: createData } = await graphqlClient.query(createMutation, {
      variables: {
        input: {
          publication_id: publicationId,
          body: commentBody,
          author_name: "expired-user",
          auth_type: "ETHEREUM",
          author_id: TEST_ETHEREUM_ADDRESS_NODE_A,
        },
      },
    })
    const createdId = createData.createComment.id

    // Patch created_at to earlier than validity window
    const pastDate = new Date(Date.now() - 601 * 1000)
    await Comment.query().findById(createdId).patch({ created_at: pastDate })

    const timestampSec = Math.floor(pastDate.getTime() / 1000)
    const typedData = {
      domain: COMMENT_SIGNATURE_DOMAIN,
      types: COMMENT_SIGNATURE_TYPES,
      primaryType: "CommentSignature",
      message: {
        nodeAddress: selfNode.address,
        commenterAddress: TEST_ACCOUNT_NODE_A.address,
        publicationId: testPublication.id,
        commentBodyHash,
        timestamp: timestampSec,
      },
    }
    const credential = await generateSignature(
      TEST_ACCOUNT_NODE_A,
      typedData,
      "typedData",
    )

    const confirmMutation = `
    mutation ConfirmComment($id: ID, $tokenOrSignature: String!) {
      confirmComment(id: $id, tokenOrSignature: $tokenOrSignature) { id }
    }
  `
    const { data, errors } = await graphqlClient.query(confirmMutation, {
      variables: { id: createdId, tokenOrSignature: credential },
    })
    t.is(data, null, "Data should be null")
    t.truthy(errors, "Should return GraphQL errors")
    t.is(
      errors[0].extensions.code,
      "EXPIRED_SIGNATURE",
      "Error code should be EXPIRED_SIGNATURE",
    )
  },
)

// New test case: ETHEREUM authentication but credential missing
test("createComment: ETHEREUM authentication without credential should create PENDING comment (two-step)", async (t) => {
  const { graphqlClient, publicationId } = t.context

  const mutation = `
    mutation CreateComment($input: CreateCommentInput!) {
      createComment(input: $input) { id status auth_type author_id }
    }
  `

  const input = {
    publication_id: publicationId,
    body: "Valid content.",
    author_name: "Test User",
    auth_type: "ETHEREUM",
    author_id: TEST_ETHEREUM_ADDRESS_NODE_A,
    // credential intentionally omitted in two-step flow
  }

  const { data, errors } = await graphqlClient.query(mutation, {
    variables: { input },
  })

  t.falsy(errors, "Should not return GraphQL errors on creation")
  t.truthy(data?.createComment?.id, "Should return created comment id")
  t.is(data.createComment.status, "PENDING", "Status should be PENDING")
  t.is(data.createComment.auth_type, "ETHEREUM", "Auth type should be ETHEREUM")
  t.is(
    data.createComment.author_id,
    TEST_ETHEREUM_ADDRESS_NODE_A,
    "Commenter address should match",
  )
})

// New test case: ETHEREUM confirmation with invalid credential should return error
test("confirmComment: ETHEREUM confirmation with invalid credential should return INVALID_SIGNATURE", async (t) => {
  const { graphqlClient, publicationId, selfNode, testPublication } = t.context

  const commentBody = "Valid content."
  const commentBodyHash = `0x${await hash.sha256(commentBody)}`

  // Step 1: Create comment (PENDING)
  const createMutation = `
    mutation CreateComment($input: CreateCommentInput!) {
      createComment(input: $input) { id created_at }
    }
  `

  const { data: createData } = await graphqlClient.query(createMutation, {
    variables: {
      input: {
        publication_id: publicationId,
        body: commentBody,
        author_name: "Test User",
        auth_type: "ETHEREUM",
        author_id: TEST_ETHEREUM_ADDRESS_NODE_A,
      },
    },
  })

  const createdId = createData.createComment.id
  const createdAt = createData.createComment.created_at
  const timestampSec = Math.floor(new Date(createdAt).getTime() / 1000)

  // Step 2: Build typedData and sign with wrong account
  const typedData = {
    domain: COMMENT_SIGNATURE_DOMAIN,
    types: COMMENT_SIGNATURE_TYPES,
    primaryType: "CommentSignature",
    message: {
      nodeAddress: selfNode.address,
      commenterAddress: TEST_ACCOUNT_NODE_A.address,
      publicationId: testPublication.id,
      commentBodyHash,
      timestamp: timestampSec,
    },
  }

  const invalidSignature = await generateSignature(
    TEST_ACCOUNT_NODE_B,
    typedData,
    "typedData",
  )

  // Step 3: Confirm with invalid signature
  const confirmMutation = `
    mutation ConfirmComment($id: ID, $tokenOrSignature: String!) {
      confirmComment(id: $id, tokenOrSignature: $tokenOrSignature) { id status }
    }
  `

  const { data, errors } = await graphqlClient.query(confirmMutation, {
    variables: { id: createdId, tokenOrSignature: invalidSignature },
  })

  t.is(data, null, "Data field should be null")
  t.truthy(errors, "Should return GraphQL errors")
  t.is(
    errors[0].extensions.code,
    "INVALID_SIGNATURE",
    "Error code should be INVALID_SIGNATURE",
  )
})

// Test case 3: Invalid publication_id
test("createComment: Invalid publication_id should return error", async (t) => {
  const { graphqlClient } = t.context

  const mutation = `
    mutation CreateComment($input: CreateCommentInput!) {
      createComment(input: $input) { id }
    }
  `

  const input = {
    publication_id: 99999, // Non-existent ID
    body: "Comment on a non-existent publication.",
    author_name: "Test User",
    auth_type: "EMAIL",
    author_id: "test@example.com",
  }

  const { data, errors } = await graphqlClient.query(mutation, {
    variables: { input },
  })

  t.truthy(errors, "Should return GraphQL errors")
  t.is(data, null, "Data field should be null")
  t.is(errors[0].extensions.code, "NOT_FOUND", "Error code should be NOT_FOUND")
})

// Test case 4: Missing/empty body
test("createComment: Missing body should return error", async (t) => {
  const { graphqlClient, publicationId } = t.context

  const mutation = `
    mutation CreateComment($input: CreateCommentInput!) {
      createComment(input: $input) { id }
    }
  `

  const input = {
    publication_id: publicationId,
    body: "", // Missing body
    author_name: "Test User",
    auth_type: "EMAIL",
    author_id: "test@example.com",
  }

  const { data, errors } = await graphqlClient.query(mutation, {
    variables: { input },
  })

  t.truthy(errors, "Should return GraphQL errors")
  t.is(data, null, "Data field should be null")
  t.is(
    errors[0].extensions.code,
    "VALIDATION_FAILED",
    "Error code should be VALIDATION_FAILED",
  )
})

// Test case 5: author_name too long
test("createComment: author_name too long should return error", async (t) => {
  const { graphqlClient, publicationId } = t.context

  const mutation = `
    mutation CreateComment($input: CreateCommentInput!) {
      createComment(input: $input) { id }
    }
  `

  const input = {
    publication_id: publicationId,
    body: "Valid content.",
    author_name: "a".repeat(51), // Too long
    auth_type: "EMAIL",
    author_id: "test@example.com",
  }

  const { data, errors } = await graphqlClient.query(mutation, {
    variables: { input },
  })

  t.truthy(errors, "Should return GraphQL errors")
  t.is(data, null, "Data field should be null")
  t.is(
    errors[0].extensions.code,
    "VALIDATION_FAILED",
    "Error code should be VALIDATION_FAILED",
  )
})

// Test case 6: Email authentication but email missing/invalid
test("createComment: EMAIL authentication but email missing should return error", async (t) => {
  const { graphqlClient, publicationId } = t.context

  const mutation = `
    mutation CreateComment($input: CreateCommentInput!) {
      createComment(input: $input) { id }
    }
  `

  const input = {
    publication_id: publicationId,
    body: "Valid content.",
    author_name: "Test User",
    auth_type: "EMAIL",
    author_id: "", // Email missing
  }

  const { data, errors } = await graphqlClient.query(mutation, {
    variables: { input },
  })

  t.truthy(errors, "Should return GraphQL errors")
  t.is(data, null, "Data field should be null")
  t.is(
    errors[0].extensions.code,
    "VALIDATION_FAILED",
    "Error code should be VALIDATION_FAILED",
  )
})

test("createComment: EMAIL authentication but invalid email format should return error", async (t) => {
  const { graphqlClient, publicationId } = t.context

  const mutation = `
    mutation CreateComment($input: CreateCommentInput!) {
      createComment(input: $input) { id }
    }
  `

  const input = {
    publication_id: publicationId,
    body: "Valid content.",
    author_name: "Test User",
    auth_type: "EMAIL",
    author_id: "invalid-email", // Invalid email format
  }

  const { data, errors } = await graphqlClient.query(mutation, {
    variables: { input },
  })

  t.truthy(errors, "Should return GraphQL errors")
  t.is(data, null, "Data field should be null")
  t.is(
    errors[0].extensions.code,
    "VALIDATION_FAILED",
    "Error code should be VALIDATION_FAILED",
  )
})

// Test case 7: Ethereum authentication but author_id missing/invalid
test("createComment: ETHEREUM authentication but address missing should return error", async (t) => {
  const { graphqlClient, publicationId } = t.context

  const mutation = `
    mutation CreateComment($input: CreateCommentInput!) {
      createComment(input: $input) { id }
    }
  `

  const input = {
    publication_id: publicationId,
    body: "Valid content.",
    author_name: "Test User",
    auth_type: "ETHEREUM",
    author_id: "", // Address missing
  }

  const { data, errors } = await graphqlClient.query(mutation, {
    variables: { input },
  })

  t.truthy(errors, "Should return GraphQL errors")
  t.is(data, null, "Data field should be null")
  t.is(
    errors[0].extensions.code,
    "VALIDATION_FAILED",
    "Error code should be VALIDATION_FAILED",
  )
})

test("createComment: ETHEREUM authentication but invalid address format should return error", async (t) => {
  const { graphqlClient, publicationId } = t.context

  const mutation = `
    mutation CreateComment($input: CreateCommentInput!) {
      createComment(input: $input) { id }
    }
  `

  const input = {
    publication_id: publicationId,
    body: "Valid content.",
    author_name: "Test User",
    auth_type: "ETHEREUM",
    author_id: "0x123", // Invalid address format
  }

  const { data, errors } = await graphqlClient.query(mutation, {
    variables: { input },
  })

  t.truthy(errors, "Should return GraphQL errors")
  t.is(data, null, "Data field should be null")
  t.is(
    errors[0].extensions.code,
    "VALIDATION_FAILED",
    "Error code should be VALIDATION_FAILED",
  )
})

// --- confirmComment Tests ---

test.serial(
  "confirmComment: should confirm EMAIL authenticated comment with a valid token",
  async (t) => {
    const { graphqlClient, publicationId, createCommentJwt } = t.context

    // 1. Call createComment and request the temporary verificationToken field
    const createMutation = `
    mutation CreateComment($input: CreateCommentInput!) {
      createComment(input: $input) { 
        id
      }
    }
  `
    const createInput = {
      publication_id: publicationId,
      body: "a comment to be verified",
      author_name: "verifier",
      auth_type: "EMAIL",
      author_id: "verify@example.com",
    }
    const { data: createData, errors: createErrors } =
      await graphqlClient.query(createMutation, {
        variables: { input: createInput },
      })

    // Ensure comment creation was successful before proceeding
    t.falsy(createErrors, "Comment creation should not have errors")
    const commentId = createData.createComment.id
    const token = await createCommentJwt(commentId, "confirm")

    // 2. Call the verifyCommentEmail mutation with the retrieved token
    const verifyMutation = `
    mutation ConfirmComment($tokenOrSignature: String!) {
      confirmComment(tokenOrSignature: $tokenOrSignature) {
        id
        status
      }
    }
  `
    const { data: verifyData, errors: verifyErrors } =
      await graphqlClient.query(verifyMutation, {
        variables: { tokenOrSignature: token },
      })

    // 3. Assert the verification result
    t.falsy(
      verifyErrors,
      "Verification with a valid token should not produce GraphQL errors",
    )
    t.is(
      verifyData.confirmComment.id,
      commentId,
      "Should return the correct comment ID",
    )
    t.is(
      verifyData.confirmComment.status,
      "CONFIRMED",
      "Comment status should be updated to CONFIRMED",
    )

    // 4. Verify the status in the database
    const commentInDb = await Comment.query().findById(commentId)
    t.is(commentInDb.status, "CONFIRMED", "Database status should be CONFIRMED")
    t.is(commentInDb.credential, token, "Database credential should be token")
  },
)

test.serial(
  "confirmComment: should return an error for an invalid token",
  async (t) => {
    const { graphqlClient } = t.context
    const invalidToken = "this.is.an.invalid.jwt.token"

    const verifyMutation = `
      mutation ConfirmComment($tokenOrSignature: String!) {
        confirmComment(tokenOrSignature: $tokenOrSignature) {
          id
        }
      }
    `
    const { data, errors } = await graphqlClient.query(verifyMutation, {
      variables: { tokenOrSignature: invalidToken },
    })

    t.is(data, null)
    t.truthy(errors, "Should return GraphQL errors for an invalid token")
    t.is(
      errors[0].extensions.code,
      "VALIDATION_FAILED",
      "Error code should be VALIDATION_FAILED",
    )
  },
)

// Test Case: confirmComment - ETHEREUM path should confirm with valid credential
test.serial(
  "confirmComment: should confirm ETHEREUM authenticated comment with valid credential",
  async (t) => {
    const { graphqlClient, publicationId, selfNode, testPublication } =
      t.context

    const commentBody = "a comment to be credential-verified"
    const commentBodyHash = `0x${await hash.sha256(commentBody)}`

    // 1) Create comment (PENDING)
    const createMutation = `
      mutation CreateComment($input: CreateCommentInput!) {
        createComment(input: $input) { id created_at status }
      }
    `
    const { data: createData, errors: createErrors } =
      await graphqlClient.query(createMutation, {
        variables: {
          input: {
            publication_id: publicationId,
            body: commentBody,
            author_name: "sig-user",
            auth_type: "ETHEREUM",
            author_id: TEST_ETHEREUM_ADDRESS_NODE_A,
          },
        },
      })
    t.falsy(createErrors, "Comment creation should succeed")
    t.is(
      createData.createComment.status,
      "PENDING",
      "Should be PENDING at creation",
    )

    const createdId = createData.createComment.id
    const timestampSec = Math.floor(
      new Date(createData.createComment.created_at).getTime() / 1000,
    )

    // 2) Sign typed data with matching timestamp/body
    const typedData = {
      domain: COMMENT_SIGNATURE_DOMAIN,
      types: COMMENT_SIGNATURE_TYPES,
      primaryType: "CommentSignature",
      message: {
        nodeAddress: selfNode.address,
        commenterAddress: TEST_ACCOUNT_NODE_A.address,
        publicationId: testPublication.id,
        commentBodyHash,
        timestamp: timestampSec,
      },
    }
    const credential = await generateSignature(
      TEST_ACCOUNT_NODE_A,
      typedData,
      "typedData",
    )

    // 3) Confirm
    const confirmMutation = `
      mutation ConfirmComment($id: ID, $tokenOrSignature: String!) {
        confirmComment(id: $id, tokenOrSignature: $tokenOrSignature) { id status }
      }
    `
    const { data: confirmData, errors: confirmErrors } =
      await graphqlClient.query(confirmMutation, {
        variables: { id: createdId, tokenOrSignature: credential },
      })

    t.falsy(confirmErrors, "Confirmation should not error")
    t.is(confirmData.confirmComment.id, createdId, "ID should match")
    t.is(
      confirmData.confirmComment.status,
      "CONFIRMED",
      "Status should be CONFIRMED after credential",
    )
  },
)

// --- destroyComment Tests ---

// Helper to create a comment for deletion tests
async function createTestComment(t, authType, email, ethAccount) {
  const { graphqlClient, publicationId } = t.context
  const commentBody = `Test comment for deletion (${authType}).`

  // No credential is required at creation time for ETHEREUM path in two-step flow
  const input = {
    publication_id: publicationId,
    body: commentBody,
    author_name: `Deleter (${authType})`,
    auth_type: authType,
    author_id: email || ethAccount.address,
  }

  const createMutation = `
    mutation CreateComment($input: CreateCommentInput!) {
      createComment(input: $input) {
        id
        status
        auth_type
        author_id
      }
    }
  `
  const { data, errors } = await graphqlClient.query(createMutation, {
    variables: { input },
  })

  t.falsy(errors, `createComment should not have errors for ${authType} setup`)
  t.truthy(
    data.createComment,
    `createComment should return data for ${authType} setup`,
  )
  return data.createComment
}

// EIP-712 Typed Data for DeleteComment
const DELETE_COMMENT_DOMAIN = {
  name: "epress world",
  version: "1",
  chainId: 1,
}

const DELETE_COMMENT_TYPES = {
  EIP712Domain: [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "chainId", type: "uint256" },
  ],
  DeleteComment: [
    { name: "nodeAddress", type: "address" },
    { name: "commentId", type: "uint256" },
    { name: "commenterAddress", type: "address" },
  ],
}

// Test Case: destroyComment - EMAIL auth - Success (sends email, not deleted immediately)
test.serial(
  "destroyComment: EMAIL auth should trigger email and not delete immediately",
  async (t) => {
    const { graphqlClient, sendMailSpy } = t.context
    const testEmail = "delete_email@example.com"
    const createdComment = await createTestComment(
      t,
      "EMAIL",
      testEmail,
      TEST_ACCOUNT_NODE_A,
    )

    const mutation = `
    mutation DestroyComment($id: ID!, $email: String) {
      destroyComment(id: $id, email: $email) {
        id
        status
      }
    }
  `
    const input = { id: createdComment.id, email: testEmail }
    const { data, errors } = await graphqlClient.query(mutation, {
      variables: input,
    })

    t.falsy(errors, "destroyComment should not have GraphQL errors")
    t.truthy(data.destroyComment, "should return the comment object")
    t.is(
      data.destroyComment.id,
      createdComment.id,
      "returned comment ID should match",
    )
    // For EMAIL auth, status should remain PENDING or similar until confirmed via email
    const commentInDb = await Comment.query().findById(createdComment.id)
    t.truthy(commentInDb, "Comment should still exist in DB")
    t.is(
      commentInDb.status,
      data.destroyComment.status,
      "Comment status should remain the same",
    )
    console.log(sendMailSpy.callCount, "===============")
    t.true(sendMailSpy.called, "sendMail should be called")
  },
)

// Test Case: confirmCommentDeletion - EMAIL auth - Success (deletes comment)
test.serial(
  "confirmCommentDeletion: EMAIL auth should delete comment with valid token",
  async (t) => {
    const { graphqlClient, createCommentJwt } = t.context
    const testEmail = "confirm_delete_email@example.com"
    const createdComment = await createTestComment(
      t,
      "EMAIL",
      testEmail,
      TEST_ACCOUNT_NODE_A,
    )

    // Simulate the destroyComment call that sends the email
    const destroyMutation = `
    mutation DestroyComment($id: ID!, $email: String) {
      destroyComment(id: $id, email: $email) { id }
    }
  `
    await graphqlClient.query(destroyMutation, {
      variables: { id: createdComment.id, email: testEmail },
    })

    // Manually generate the token as if it came from the email link
    const token = await createCommentJwt(
      createdComment.id,
      "destroy",
      testEmail,
      "24h",
    )

    const confirmMutation = `
    mutation ConfirmCommentDeletion($token: String!) {
      confirmCommentDeletion(token: $token) {
        id
      }
    }
  `
    const { data, errors } = await graphqlClient.query(confirmMutation, {
      variables: { token },
    })

    t.falsy(errors, "confirmCommentDeletion should not have GraphQL errors")
    t.truthy(
      data.confirmCommentDeletion,
      "should return the deleted comment object",
    )
    t.is(
      data.confirmCommentDeletion.id,
      createdComment.id,
      "returned comment ID should match",
    )

    const commentInDb = await Comment.query().findById(createdComment.id)
    t.falsy(commentInDb, "Comment should be deleted from DB")
  },
)

// Test Case: destroyComment - ETHEREUM auth - Success (deletes immediately)
test.serial(
  "destroyComment: ETHEREUM auth should delete comment immediately",
  async (t) => {
    const { graphqlClient } = t.context

    // Create a comment with ETHEREUM auth
    const createdComment = await createTestComment(
      t,
      "ETHEREUM",
      null,
      TEST_ACCOUNT_NODE_A,
    )

    // Generate credential for deletion
    const typedData = {
      domain: DELETE_COMMENT_DOMAIN,
      types: DELETE_COMMENT_TYPES,
      primaryType: "DeleteComment",
      message: {
        commentId: createdComment.id,
        nodeAddress: TEST_ACCOUNT_NODE_A.address,
        commenterAddress: TEST_ACCOUNT_NODE_A.address,
      },
    }
    const signature = await generateSignature(
      TEST_ACCOUNT_NODE_A,
      typedData,
      "typedData",
    )

    const mutation = `
    mutation DestroyComment($id: ID!, $signature: String) {
      destroyComment(id: $id, signature: $signature) {
        id
      }
    }
  `
    const input = { id: createdComment.id, signature: signature }
    const { data, errors } = await graphqlClient.query(mutation, {
      variables: input,
    })

    t.falsy(errors, "destroyComment should not have GraphQL errors")
    t.truthy(data.destroyComment, "should return the deleted comment object")
    t.is(
      data.destroyComment.id,
      createdComment.id,
      "returned comment ID should match",
    )

    const commentInDb = await Comment.query().findById(createdComment.id)
    t.falsy(commentInDb, "Comment should be deleted from DB")
  },
)

// Test Case: destroyComment - NOT_FOUND (non-existent ID)
test("destroyComment: should return NOT_FOUND for non-existent ID", async (t) => {
  const { graphqlClient } = t.context
  const nonExistentId = 99999

  const mutation = `
    mutation DestroyComment($id: ID!, $email: String) {
      destroyComment(id: $id, email: $email) { id }
    }
  `
  const input = { id: nonExistentId, email: "any@example.com" }
  const { data, errors } = await graphqlClient.query(mutation, {
    variables: input,
  })

  t.is(data, null, "Data should be null")
  t.truthy(errors, "Should return GraphQL errors")
  t.is(errors[0].extensions.code, "NOT_FOUND", "Error code should be NOT_FOUND")
})

// Test Case: destroyComment - VALIDATION_FAILED (missing email for EMAIL auth)
test("destroyComment: should return VALIDATION_FAILED if email missing for EMAIL auth", async (t) => {
  const { graphqlClient } = t.context
  const createdComment = await createTestComment(
    t,
    "EMAIL",
    "test@example.com",
    TEST_ACCOUNT_NODE_A,
  )

  const mutation = `
    mutation DestroyComment($id: ID!) {
      destroyComment(id: $id) { id }
    }
  `
  const input = { id: createdComment.id } // Missing email
  const { data, errors } = await graphqlClient.query(mutation, {
    variables: input,
  })

  t.is(data, null, "Data should be null")
  t.truthy(errors, "Should return GraphQL errors")
  t.is(
    errors[0].extensions.code,
    "VALIDATION_FAILED",
    "Error code should be VALIDATION_FAILED",
  )
})

// Test Case: destroyComment - VALIDATION_FAILED (missing credential for ETHEREUM auth)
test("destroyComment: should return VALIDATION_FAILED if credential missing for ETHEREUM auth", async (t) => {
  const { graphqlClient } = t.context
  const createdComment = await createTestComment(
    t,
    "ETHEREUM",
    null,
    TEST_ACCOUNT_NODE_A,
  )

  const mutation = `
    mutation DestroyComment($id: ID!) {
      destroyComment(id: $id) { id }
    }
  `
  const input = { id: createdComment.id } // Missing credential
  const { data, errors } = await graphqlClient.query(mutation, {
    variables: input,
  })

  t.is(data, null, "Data should be null")
  t.truthy(errors, "Should return GraphQL errors")
  t.is(
    errors[0].extensions.code,
    "VALIDATION_FAILED",
    "Error code should be VALIDATION_FAILED",
  )
})

// Test Case: destroyComment - FORBIDDEN (email mismatch for EMAIL auth)
test("destroyComment: should return FORBIDDEN for email mismatch (EMAIL auth)", async (t) => {
  const { graphqlClient } = t.context
  const createdComment = await createTestComment(
    t,
    "EMAIL",
    "correct@example.com",
    TEST_ACCOUNT_NODE_A,
  )

  const mutation = `
    mutation DestroyComment($id: ID!, $email: String) {
      destroyComment(id: $id, email: $email) { id }
    }
  `
  const input = { id: createdComment.id, email: "wrong@example.com" } // Mismatched email
  const { data, errors } = await graphqlClient.query(mutation, {
    variables: input,
  })

  t.is(data, null, "Data should be null")
  t.truthy(errors, "Should return GraphQL errors")
  t.is(errors[0].extensions.code, "FORBIDDEN", "Error code should be FORBIDDEN")
})

// Test Case: destroyComment - FORBIDDEN (credential mismatch for ETHEREUM auth)
test("destroyComment: should return FORBIDDEN for credential mismatch (ETHEREUM auth)", async (t) => {
  const { graphqlClient } = t.context
  const createdComment = await createTestComment(
    t,
    "ETHEREUM",
    null,
    TEST_ACCOUNT_NODE_A,
  )

  // Generate an invalid credential (e.g., signed by a different account)
  const typedData = {
    domain: DELETE_COMMENT_DOMAIN,
    types: DELETE_COMMENT_TYPES,
    primaryType: "DeleteComment",
    message: {
      commentId: createdComment.id,
      commenterAddress: TEST_ACCOUNT_NODE_A.address,
      nodeAddress: TEST_ACCOUNT_NODE_A.address,
    },
  }
  const invalidSignature = await generateSignature(
    TEST_ACCOUNT_NODE_B,
    typedData,
    "typedData",
  ) // Signed by Node B

  const mutation = `
    mutation DestroyComment($id: ID!, $signature: String) {
      destroyComment(id: $id, signature: $signature) {
        id
      }
    }
  `
  const input = { id: createdComment.id, signature: invalidSignature }
  const { data, errors } = await graphqlClient.query(mutation, {
    variables: input,
  })

  t.is(data, null, "Data should be null")
  t.truthy(errors, "Should return GraphQL errors")
  t.is(errors[0].extensions.code, "FORBIDDEN", "Error code should be FORBIDDEN")
})

// Test Case: confirmCommentDeletion - Invalid Token
test("confirmCommentDeletion: should return INVALID_SIGNATURE for invalid token", async (t) => {
  const { graphqlClient } = t.context
  const invalidToken = "this.is.an.invalid.jwt.token.abc"

  const confirmMutation = `
    mutation ConfirmCommentDeletion($token: String!) {
      confirmCommentDeletion(token: $token) {
        id
      }
    }
  `
  const { data, errors } = await graphqlClient.query(confirmMutation, {
    variables: { token: invalidToken },
  })
  t.is(data, null, "Data should be null")
  t.truthy(errors, "Should return GraphQL errors")
  t.is(
    errors[0].extensions.code,
    "INVALID_SIGNATURE",
    "Error code should be INVALID_SIGNATURE",
  )
})

// Test Case: confirmCommentDeletion - Token for non-existent comment
test("confirmCommentDeletion: should return NOT_FOUND for token of non-existent comment", async (t) => {
  const { graphqlClient, createCommentJwt } = t.context
  const nonExistentCommentId = 99999
  const token = await createCommentJwt(
    nonExistentCommentId,
    "destroy",
    "test@example.com",
    "24h",
  )

  const confirmMutation = `
    mutation ConfirmCommentDeletion($token: String!) {
      confirmCommentDeletion(token: $token) {
        id
      }
    }
  `
  const { data, errors } = await graphqlClient.query(confirmMutation, {
    variables: { token },
  })
  t.is(data, null, "Data should be null")
  t.truthy(errors, "Should return GraphQL errors")
  t.is(errors[0].extensions.code, "NOT_FOUND", "Error code should be NOT_FOUND")
})

// ==================== comment_count Auto Update Tests ====================

// Test Case: comment_count should auto-increase after confirming Ethereum authenticated comment
test.serial(
  "confirmComment: comment_count should auto-increase after confirming Ethereum authenticated comment",
  async (t) => {
    const { graphqlClient, selfNode } = t.context
    const { testPublication } = t.context

    // Verify initial comment_count is 0
    const initialPublication = await Publication.query().findById(
      testPublication.id,
    )
    t.is(
      initialPublication.comment_count,
      0,
      "Initial comment_count should be 0",
    )

    const commentBody = "Test comment for comment_count update"
    const commentBodyHash = `0x${await hash.sha256(commentBody)}`

    // 1) Create ETHEREUM comment (should be PENDING)
    const createMutation = `
      mutation CreateComment($input: CreateCommentInput!) {
        createComment(input: $input) { id status created_at }
      }
    `
    const { data: createData, errors: createErrors } =
      await graphqlClient.query(createMutation, {
        variables: {
          input: {
            publication_id: testPublication.id,
            body: commentBody,
            auth_type: "ETHEREUM",
            author_id: TEST_ETHEREUM_ADDRESS_NODE_A,
            author_name: "testuser",
          },
        },
      })
    t.falsy(createErrors, "Should not return GraphQL errors on creation")
    t.is(
      createData.createComment.status,
      "PENDING",
      "Should be PENDING at creation",
    )

    // comment_count should still be 0
    const publicationAfterCreate = await Publication.query().findById(
      testPublication.id,
    )
    t.is(
      publicationAfterCreate.comment_count,
      0,
      "comment_count should remain 0 before confirmation",
    )

    // 2) Confirm with EIP-712 credential that includes timestamp
    const timestampSec = Math.floor(
      new Date(createData.createComment.created_at).getTime() / 1000,
    )
    const typedData = {
      domain: COMMENT_SIGNATURE_DOMAIN,
      types: COMMENT_SIGNATURE_TYPES,
      primaryType: "CommentSignature",
      message: {
        nodeAddress: selfNode.address,
        commenterAddress: TEST_ACCOUNT_NODE_A.address,
        publicationId: testPublication.id,
        commentBodyHash: commentBodyHash,
        timestamp: timestampSec,
      },
    }
    const credential = await generateSignature(
      TEST_ACCOUNT_NODE_A,
      typedData,
      "typedData",
    )

    const confirmMutation = `
      mutation ConfirmComment($id: ID, $tokenOrSignature: String!) {
        confirmComment(id: $id, tokenOrSignature: $tokenOrSignature) { id status }
      }
    `
    const { data: confirmData, errors: confirmErrors } =
      await graphqlClient.query(confirmMutation, {
        variables: {
          id: createData.createComment.id,
          tokenOrSignature: credential,
        },
      })
    t.falsy(confirmErrors, "Should not return GraphQL errors on confirmation")
    t.is(
      confirmData.confirmComment.status,
      "CONFIRMED",
      "Should be CONFIRMED after confirmation",
    )

    // 3) Verify comment_count has been auto-increased to 1
    const updatedPublication = await Publication.query().findById(
      testPublication.id,
    )
    t.is(
      updatedPublication.comment_count,
      1,
      "comment_count should be increased to 1 after confirmation",
    )
  },
)

// Test Case: comment_count should auto-increase when confirming email authenticated comment
test.serial(
  "confirmComment: comment_count should auto-increase when confirming email authenticated comment",
  async (t) => {
    const { graphqlClient, testPublication, createCommentJwt } = t.context

    // First create an email authenticated comment (status PENDING)
    const createMutation = `
    mutation CreateComment($input: CreateCommentInput!) {
      createComment(input: $input) {
        id
        body
        status
        auth_type
        author_id
      }
    }
  `

    const { data: createData } = await graphqlClient.query(createMutation, {
      variables: {
        input: {
          publication_id: testPublication.id,
          body: "Test email comment for comment_count update",
          auth_type: "EMAIL",
          author_id: "test@example.com",
          author_name: "testuser",
        },
      },
    })

    t.truthy(createData.createComment, "Should create comment successfully")
    t.is(
      createData.createComment.status,
      "PENDING",
      "Comment status should be PENDING",
    )

    // Verify initial comment_count is still 0 (because comment status is PENDING)
    const initialPublication = await Publication.query().findById(
      testPublication.id,
    )
    t.is(
      initialPublication.comment_count,
      0,
      "Initial comment_count should still be 0",
    )

    // Generate confirmation token
    const token = await createCommentJwt(createData.createComment.id, "confirm")

    // Confirm comment
    const confirmMutation = `
    mutation ConfirmComment($tokenOrSignature: String!) {
      confirmComment(tokenOrSignature: $tokenOrSignature) {
        id
        body
        status
        auth_type
        author_id 
      }
    }
  `

    const { data: confirmData, errors } = await graphqlClient.query(
      confirmMutation,
      {
        variables: { tokenOrSignature: token },
      },
    )

    t.falsy(errors, "Should not return GraphQL errors")
    t.truthy(confirmData, "Should return data")
    t.truthy(confirmData.confirmComment, "Should return confirmed comment")
    t.is(
      confirmData.confirmComment.status,
      "CONFIRMED",
      "Comment status should be CONFIRMED",
    )

    // Verify comment_count has been auto-increased
    const updatedPublication = await Publication.query().findById(
      testPublication.id,
    )
    t.is(
      updatedPublication.comment_count,
      1,
      "comment_count should be increased to 1",
    )
  },
)

// Test Case: comment_count should auto-decrease when deleting email authenticated comment
test.serial(
  "confirmCommentDeletion: comment_count should auto-decrease when deleting email authenticated comment",
  async (t) => {
    const { graphqlClient, createCommentJwt, testPublication } = t.context

    // First create an email authenticated comment and confirm it
    const createMutation = `
    mutation CreateComment($input: CreateCommentInput!) {
      createComment(input: $input) {
        id
        body
        status
        auth_type
        author_id
      }
    }
  `

    const { data: createData } = await graphqlClient.query(createMutation, {
      variables: {
        input: {
          publication_id: testPublication.id,
          body: "Test email comment for deletion",
          auth_type: "EMAIL",
          author_id: "delete@example.com",
          author_name: "deleteuser",
        },
      },
    })

    // Confirm comment
    const confirmToken = await createCommentJwt(
      createData.createComment.id,
      "confirm",
    )
    const confirmMutation = `
    mutation ConfirmComment($tokenOrSignature: String!) {
      confirmComment(tokenOrSignature: $tokenOrSignature) {
        id
        status
      }
    }
  `

    await graphqlClient.query(confirmMutation, {
      variables: { tokenOrSignature: confirmToken },
    })

    // Verify comment_count is 1
    const confirmedPublication = await Publication.query().findById(
      testPublication.id,
    )
    t.is(
      confirmedPublication.comment_count,
      1,
      "comment_count should be 1 after confirmation",
    )

    // Generate deletion token
    const deleteToken = await createCommentJwt(
      createData.createComment.id,
      "destroy",
      "delete@example.com",
      "1h",
    )

    // Delete comment
    const deleteMutation = `
    mutation ConfirmCommentDeletion($token: String!) {
      confirmCommentDeletion(token: $token) {
        id
        body
        auth_type
        author_id
        publication {
          id
        }
      }
    }
  `

    const { data: deleteData, errors } = await graphqlClient.query(
      deleteMutation,
      {
        variables: { token: deleteToken },
      },
    )

    t.falsy(errors, "Should not return GraphQL errors")
    t.truthy(deleteData, "Should return data")
    t.truthy(deleteData.confirmCommentDeletion, "Should return deleted comment")

    // Verify comment_count has been auto-decreased
    const updatedPublication = await Publication.query().findById(
      testPublication.id,
    )
    t.is(
      updatedPublication.comment_count,
      0,
      "comment_count should be decreased to 0",
    )
  },
)

// Test Case: comment_count should auto-decrease when deleting Ethereum authenticated comment
test.serial(
  "destroyComment: comment_count should auto-decrease when deleting Ethereum authenticated comment",
  async (t) => {
    const { graphqlClient, selfNode } = t.context
    const { testPublication } = t.context

    // First create an Ethereum authenticated comment (PENDING)
    const commentBody = "Test ethereum comment for deletion"
    const commentBodyHash = `0x${await hash.sha256(commentBody)}`

    const createMutation = `
    mutation CreateComment($input: CreateCommentInput!) {
      createComment(input: $input) { id status created_at }
    }
  `

    const { data: createData } = await graphqlClient.query(createMutation, {
      variables: {
        input: {
          publication_id: testPublication.id,
          body: commentBody,
          auth_type: "ETHEREUM",
          author_id: TEST_ETHEREUM_ADDRESS_NODE_A,
          author_name: "testuser",
        },
      },
    })

    t.truthy(createData.createComment, "Should create comment successfully")
    t.is(
      createData.createComment.status,
      "PENDING",
      "Comment status should be PENDING",
    )

    // Confirm the comment so comment_count becomes 1
    const timestampSec = Math.floor(
      new Date(createData.createComment.created_at).getTime() / 1000,
    )
    const typedData = {
      domain: COMMENT_SIGNATURE_DOMAIN,
      types: COMMENT_SIGNATURE_TYPES,
      primaryType: "CommentSignature",
      message: {
        nodeAddress: selfNode.address,
        commenterAddress: TEST_ACCOUNT_NODE_A.address,
        publicationId: testPublication.id,
        commentBodyHash: commentBodyHash,
        timestamp: timestampSec,
      },
    }
    const credential = await generateSignature(
      TEST_ACCOUNT_NODE_A,
      typedData,
      "typedData",
    )
    const confirmMutation = `
      mutation ConfirmComment($id: ID, $tokenOrSignature: String!) {
        confirmComment(id: $id, tokenOrSignature: $tokenOrSignature) { id status }
      }
    `
    const { errors: confirmErrors } = await graphqlClient.query(
      confirmMutation,
      {
        variables: {
          id: createData.createComment.id,
          tokenOrSignature: credential,
        },
      },
    )
    t.falsy(confirmErrors, "Confirmation should not error")

    // Verify comment_count is 1 after confirmation
    const createdPublication = await Publication.query().findById(
      testPublication.id,
    )
    t.is(
      createdPublication.comment_count,
      1,
      "comment_count should be 1 after confirmation",
    )

    // Generate deletion credential
    const deleteTypedData = {
      domain: DELETE_COMMENT_DOMAIN,
      types: DELETE_COMMENT_TYPES,
      primaryType: "DeleteComment",
      message: {
        commentId: createData.createComment.id,
        nodeAddress: TEST_ETHEREUM_ADDRESS_NODE_A,
        commenterAddress: TEST_ACCOUNT_NODE_A.address,
      },
    }

    const deleteSignature = await generateSignature(
      TEST_ACCOUNT_NODE_A,
      deleteTypedData,
      "typedData",
    )

    // Delete comment
    const deleteMutation = `
    mutation DestroyComment($id: ID!, $signature: String) {
      destroyComment(id: $id, signature: $signature) {
        id
        body
        auth_type
        author_id
      }
    }
  `

    const { data: deleteData, errors } = await graphqlClient.query(
      deleteMutation,
      {
        variables: {
          id: createData.createComment.id,
          signature: deleteSignature,
        },
      },
    )

    t.falsy(errors, "Should not return GraphQL errors")
    t.truthy(deleteData, "Should return data")
    t.truthy(deleteData.destroyComment, "Should return deleted comment")

    // Verify comment_count has been auto-decreased
    const updatedPublication = await Publication.query().findById(
      testPublication.id,
    )
    t.is(
      updatedPublication.comment_count,
      0,
      "comment_count should be decreased to 0",
    )
  },
)

// Test case: allowComment disabled should fail
test.serial("createComment: allowComment disabled should fail", async (t) => {
  const { graphqlClient } = t.context

  // Step 1: Set allowComment to false
  await Setting.query().where({ key: "allow_comment" }).delete()
  await Setting.query().insert({
    key: "allow_comment",
    value: "false",
  })

  // Step 2: Prepare comment input
  const input = {
    publication_id: t.context.publicationId,
    body: "Test comment body",
    author_name: "testuser",
    auth_type: "EMAIL",
    author_id: "test@example.com",
  }

  // Step 3: Execute mutation
  const mutation = `
    mutation CreateComment($input: CreateCommentInput!) {
      createComment(input: $input) {
        id
        body
        author_name
        status
      }
    }
  `
  const variables = { input }
  const { data, errors } = await graphqlClient.query(mutation, { variables })

  // Step 4: Assertions
  t.truthy(errors, "Should return GraphQL errors")
  t.is(data, null, "When error occurs, data field should be null")
  t.true(
    errors.some((e) => e.extensions?.code === "COMMENT_DISABLED"),
    "Error code should be COMMENT_DISABLED",
  )
})

// Test case: allowComment enabled should succeed
test.serial("createComment: allowComment enabled should succeed", async (t) => {
  const { graphqlClient } = t.context

  // Step 1: Set allowComment to true
  await Setting.query().where({ key: "allow_comment" }).delete()
  await Setting.query().insert({
    key: "allow_comment",
    value: "true",
  })

  // Step 2: Prepare comment input
  const input = {
    publication_id: t.context.publicationId,
    body: "Test comment body",
    author_name: "testuser",
    auth_type: "EMAIL",
    author_id: "test@example.com",
  }

  // Step 3: Execute mutation
  const mutation = `
    mutation CreateComment($input: CreateCommentInput!) {
      createComment(input: $input) {
        id
        body
        author_name
        status
      }
    }
  `
  const variables = { input }
  const { data, errors } = await graphqlClient.query(mutation, { variables })

  // Step 4: Assertions
  t.falsy(errors, "Should not return any GraphQL errors")
  t.truthy(data.createComment, "Should return created comment")
  t.is(
    data.createComment.body,
    "Test comment body",
    "Comment body should match",
  )
  t.is(
    data.createComment.author_name,
    "testuser",
    "Commenter username should match",
  )
  t.is(
    data.createComment.status,
    "PENDING",
    "Comment status should be PENDING for EMAIL auth",
  )
})

// Test case: allowComment not set should succeed (default behavior)
test.serial(
  "createComment: allowComment not set should succeed (default behavior)",
  async (t) => {
    const { graphqlClient } = t.context

    // Step 1: Ensure no allowComment setting exists (default behavior)
    // This is already handled by beforeEach cleanup

    // Step 2: Prepare comment input
    const input = {
      publication_id: t.context.publicationId,
      body: "Test comment body",
      author_name: "testuser",
      auth_type: "EMAIL",
      author_id: "test@example.com",
    }

    // Step 3: Execute mutation
    const mutation = `
    mutation CreateComment($input: CreateCommentInput!) {
      createComment(input: $input) {
        id
        body
        author_name
        status
      }
    }
  `
    const variables = { input }
    const { data, errors } = await graphqlClient.query(mutation, { variables })

    // Step 4: Assertions
    t.falsy(errors, "Should not return any GraphQL errors")
    t.truthy(data.createComment, "Should return created comment")
    t.is(
      data.createComment.body,
      "Test comment body",
      "Comment body should match",
    )
    t.is(
      data.createComment.author_name,
      "testuser",
      "Commenter username should match",
    )
    t.is(
      data.createComment.status,
      "PENDING",
      "Comment status should be PENDING for EMAIL auth",
    )
  },
)
