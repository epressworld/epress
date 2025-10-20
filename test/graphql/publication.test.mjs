import fs from "node:fs"
import test from "ava"
import nock from "nock"
import {
  Connection,
  Content,
  Node,
  Publication,
} from "../../server/models/index.mjs"
import {
  createGraphQLUploadRequest,
  generateSignature,
  generateTestAccount,
  TEST_ACCOUNT_NODE_A,
  TEST_ETHEREUM_ADDRESS_NODE_A,
} from "../setup.mjs"

// Test case: Successfully create POST type publication
test("createPublication: Successfully create POST type publication", async (t) => {
  const { graphqlClient, createClientJwt } = t.context
  const authToken = await createClientJwt(TEST_ETHEREUM_ADDRESS_NODE_A)

  const query = `
    mutation CreatePostPublication($input: CreatePublicationInput!) {
      createPublication(input: $input) {
        id
        content_hash
        signature
        created_at
        updated_at
        author {
          address
        }
        content {
          type
          body
        }
      }
    }
  `

  const input = {
    type: "post",
    body: "This is test post content for createPublication.",
  }

  const { data, errors } = await graphqlClient.query(query, {
    variables: { input },
    headers: { Authorization: `Bearer ${authToken}` },
  })

  t.falsy(errors, "Should not have any GraphQL errors")
  t.truthy(data.createPublication, "Should return created publication")

  const publication = data.createPublication
  t.falsy(publication.signature, "Publication should initially be unsigned")
  t.truthy(publication.content_hash, "Publication should have content hash")
  t.truthy(publication.created_at, "Publication should have created timestamp")
  t.is(
    publication.author.address,
    TEST_ACCOUNT_NODE_A.address,
    "Author should be authenticated node owner",
  )

  // Verify database records
  const dbPublication = await Publication.query().findById(publication.id)
  t.truthy(dbPublication, "Publication record should exist in database")
  t.is(
    dbPublication.content_hash,
    publication.content_hash,
    "Database content hash should match",
  )

  const dbContent = await Content.query().findOne({
    content_hash: publication.content_hash,
  })
  t.truthy(dbContent, "Content record should exist in database")
  t.is(dbContent.body, input.body, "Database content body should match")
  t.is(dbContent.type, "POST", "Database content type should be post")
})

// Test case: Successfully create FILE type publication
test("createPublication: Successfully create FILE type publication", async (t) => {
  const { app, createClientJwt } = t.context
  const authToken = await createClientJwt(TEST_ETHEREUM_ADDRESS_NODE_A)

  const fileName = "temp_content.png"
  const tempFilePath = `/tmp/${fileName}`
  const mimeType = "image/png"
  const largeBuffer = Buffer.alloc(2 * 1024 * 1024 + 1) // 2MB + 1 byte
  fs.writeFileSync(tempFilePath, largeBuffer)

  const { body, headers } = createGraphQLUploadRequest({
    query: `
      mutation CreateFilePublication($input: CreatePublicationInput!) {
          createPublication(input: $input) {
            id
            content_hash
            signature
            created_at
            updated_at
            author {
              address
            }
            content {
              type
              filename
              mimetype
              size
            }
          }
      }
    `,
    filePath: tempFilePath,
    variables: {
      input: { type: "file", description: "description", file: null },
    },
    uploadFieldName: "input.file",
    fileName: "temp_content.png",
  })

  const response = await app.inject({
    method: "POST",
    url: "/api/graphql",
    payload: body,
    headers: {
      ...headers,
      Authorization: `Bearer ${authToken}`,
    },
  })

  const { errors, data } = JSON.parse(response.body)

  t.falsy(errors, "Should not have any GraphQL errors")
  t.truthy(data.createPublication, "Should return created publication")

  const publication = data.createPublication
  t.falsy(publication.signature, "Publication should initially be unsigned")
  t.truthy(publication.content_hash, "Publication should have content hash")
  t.truthy(publication.created_at, "Publication should have created timestamp")
  t.is(
    publication.author.address,
    TEST_ACCOUNT_NODE_A.address,
    "Author should be authenticated node owner",
  )

  // Verify database records
  const dbPublication = await Publication.query().findById(publication.id)
  t.truthy(dbPublication, "Publication record should exist in database")
  t.is(
    dbPublication.content_hash,
    publication.content_hash,
    "Database content hash should match",
  )
  t.is(
    dbPublication.description,
    "description",
    "Database publication description should match",
  )

  const dbContent = await Content.query().findOne({
    content_hash: publication.content_hash,
  })
  t.truthy(dbContent, "Content record should exist in database")
  t.is(dbContent.filename, fileName, "Database content filename should match")
  t.is(dbContent.mimetype, mimeType, "Database content MIME type should match")
  t.is(dbContent.size, largeBuffer.length, "Database content size should match")
  t.is(dbContent.type, "FILE", "Database content type should be file")
  t.truthy(dbContent.local_path, "Database content should have local path")

  // Clean up temporary file
  try {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath)
    }
  } catch {
    // File may have been deleted, ignore error
  }
})

// Test case: Authentication failure
test("createPublication: Should return UNAUTHENTICATED when JWT not provided", async (t) => {
  const { graphqlClient } = t.context

  const query = `
    mutation CreatePostPublication($input: CreatePublicationInput!) {
      createPublication(input: $input) {
        id
      }
    }
  `

  const input = {
    type: "POST",
    body: "Unauthorized post content.",
  }

  const { data, errors } = await graphqlClient.query(query, {
    variables: { input },
    // Do not provide Authorization header
  })

  t.truthy(errors, "Should have GraphQL errors")
  t.is(data, null, "Data field should be null")
  const authError = errors.find((e) => e.extensions?.code === "UNAUTHENTICATED")
  t.truthy(authError, "Error should be UNAUTHENTICATED")
})

// Test case: Validation failure (POST type missing body)
test("createPublication: POST type missing body should return VALIDATION_FAILED", async (t) => {
  const { graphqlClient, createClientJwt } = t.context
  const authToken = await createClientJwt(TEST_ETHEREUM_ADDRESS_NODE_A)

  const query = `
    mutation CreatePostPublication($input: CreatePublicationInput!) {
      createPublication(input: $input) {
        id
      }
    }
  `

  const input = {
    type: "POST",
    // Missing body
  }

  const { data, errors } = await graphqlClient.query(query, {
    variables: { input },
    headers: { Authorization: `Bearer ${authToken}` },
  })

  t.truthy(errors, "Should have GraphQL errors")
  t.is(data, null, "Data field should be null")
  const validationError = errors.find(
    (e) => e.extensions?.code === "VALIDATION_FAILED",
  )
  t.truthy(validationError, "Error should be VALIDATION_FAILED")
})

// Test case: Validation failure (FILE type missing file)
test("createPublication: FILE type missing file should return VALIDATION_FAILED", async (t) => {
  const { graphqlClient, createClientJwt } = t.context
  const authToken = await createClientJwt(TEST_ETHEREUM_ADDRESS_NODE_A)

  const query = `
    mutation CreateFilePublication($input: CreatePublicationInput!) {
      createPublication(input: $input) {
        id
      }
    }
  `

  const input = {
    type: "FILE",
    // Missing file
  }

  const { data, errors } = await graphqlClient.query(query, {
    variables: { input },
    headers: { Authorization: `Bearer ${authToken}` },
  })

  t.truthy(errors, "Should have GraphQL errors")
  t.is(data, null, "Data field should be null")
  const validationError = errors.find(
    (e) => e.extensions?.code === "VALIDATION_FAILED",
  )
  t.truthy(validationError, "Error should be VALIDATION_FAILED")
})

// Test case: Validation failure (both body and file provided)
test("createPublication: Providing both body and file should return VALIDATION_FAILED", async (t) => {
  const { app, createClientJwt } = t.context
  const authToken = await createClientJwt(TEST_ETHEREUM_ADDRESS_NODE_A)

  const fileName = "temp_content.png"
  const tempFilePath = `/tmp/${fileName}`
  const largeBuffer = Buffer.alloc(2 * 1024 * 1024 + 1) // 2MB + 1 byte
  fs.writeFileSync(tempFilePath, largeBuffer)

  const { body, headers } = createGraphQLUploadRequest({
    query: `
      mutation CreateFilePublication($input: CreatePublicationInput!) {
          createPublication(input: $input) {
            id
            content_hash
            signature
            created_at
            updated_at
            author {
              address
            }
            content {
              type
              filename
              mimetype
              size
            }
          }
      }
    `,
    filePath: tempFilePath,
    variables: {
      input: { type: "POST", description: "Some content", file: null },
    },
    uploadFieldName: "input.file",
    fileName: "temp_content.png",
  })

  const response = await app.inject({
    method: "POST",
    url: "/api/graphql",
    payload: body,
    headers: {
      ...headers,
      Authorization: `Bearer ${authToken}`,
    },
  })

  const { errors, data } = JSON.parse(response.body)

  t.truthy(errors, "Should have GraphQL errors")
  t.is(data, null, "Data field should be null")
  const validationError = errors.find(
    (e) => e.extensions?.code === "VALIDATION_FAILED",
  )
  t.truthy(validationError, "Error should be VALIDATION_FAILED")

  // Clean up temporary file
  try {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath)
    }
  } catch {
    // File may have been deleted, ignore error
  }
})

// --- Helper functions for testing (final version) ---
async function createTestPublication(
  authorNode,
  authorAccount,
  contentText,
  isSigned = false,
) {
  const content = await Content.create({ type: "post", body: contentText })

  const publication = await Publication.query().insertAndFetch({
    content_hash: content.content_hash,
    author_address: authorNode.address,
  })

  // If needed, generate a real signature for content hash
  if (isSigned) {
    const typedData = Publication.createStatementOfSource(
      content.content_hash,
      authorNode.address,
      Math.floor(new Date(publication.created_at).getTime() / 1000),
    )
    const signature = await generateSignature(
      authorAccount,
      typedData,
      "typedData",
    )
    await publication.$query().patchAndFetch({ signature })
  }
  return { content, publication }
}

// --- updatePublication Test Cases ---

test.serial(
  "updatePublication: Should successfully update an unsigned post",
  async (t) => {
    const { graphqlClient, createClientJwt } = t.context
    const selfNode = await Node.query().findOne({ is_self: true })

    // Prepare: Create an unsigned post using imported main account
    const { publication } = await createTestPublication(
      selfNode,
      TEST_ACCOUNT_NODE_A,
      "Original content",
    )
    const token = await createClientJwt(selfNode.address)

    const mutation = `
    mutation UpdatePublication($input: UpdatePublicationInput!) {
      updatePublication(input: $input) {
        id
        content {
          body
        }
      }
    }
  `
    const variables = {
      input: { id: publication.id, body: "Updated content" },
    }

    const { data, errors } = await graphqlClient.query(mutation, {
      variables,
      headers: { Authorization: `Bearer ${token}` },
    })

    t.falsy(errors, "Should not return any GraphQL errors")
    t.is(
      data.updatePublication.content.body,
      "Updated content",
      "Post content should be updated",
    )
  },
)

test.serial(
  "updatePublication: Should successfully update an unsigned FILE publication",
  async (t) => {
    const { graphqlClient, createClientJwt } = t.context
    const selfNode = await Node.query().findOne({ is_self: true })

    // Prepare: Create an unsigned FILE publication
    const fileName = "update_test.png"
    const tempFilePath = `/tmp/${fileName}`
    fs.writeFileSync(tempFilePath, Buffer.alloc(100))

    const content = await Content.create({
      type: "FILE",
      file: {
        filename: fileName,
        mimetype: "image/png",
        createReadStream: () => fs.createReadStream(tempFilePath),
      },
    })

    const publication = await Publication.query().insertAndFetch({
      content_hash: content.content_hash,
      author_address: selfNode.address,
      signature: null,
      description: "Original file description",
    })

    const token = await createClientJwt(selfNode.address)

    const mutation = `
    mutation UpdatePublication($input: UpdatePublicationInput!) {
      updatePublication(input: $input) {
        id
        description
      }
    }
  `
    const variables = {
      input: { id: publication.id, description: "Updated file description" },
    }

    const { data, errors } = await graphqlClient.query(mutation, {
      variables,
      headers: { Authorization: `Bearer ${token}` },
    })

    t.falsy(errors, "Should not return any GraphQL errors")
    t.is(
      data.updatePublication.description,
      variables.input.description,
      "File description should be updated",
    )

    const dbPublication = await Publication.query().findById(publication.id)
    t.is(
      dbPublication.description,
      variables.input.description,
      "Database publication description should be updated",
    )

    // Clean up temporary file
    fs.unlinkSync(tempFilePath)
  },
)

test.serial(
  "updatePublication: Attempting to update signed post should fail",
  async (t) => {
    const { graphqlClient, createClientJwt } = t.context
    const selfNode = await Node.query().findOne({ is_self: true })
    const { publication } = await createTestPublication(
      selfNode,
      TEST_ACCOUNT_NODE_A,
      "Signed content",
      true,
    )
    const token = await createClientJwt(selfNode.address)

    const mutation = `
    mutation UpdatePublication($input: UpdatePublicationInput!) {
      updatePublication(input: $input) { id }
    }
  `
    const variables = {
      input: { id: publication.id, body: "Attempt to update" },
    }

    const { errors } = await graphqlClient.query(mutation, {
      variables,
      headers: { Authorization: `Bearer ${token}` },
    })

    t.truthy(errors, "Should return GraphQL errors")
    t.is(
      errors[0].extensions.code,
      "FORBIDDEN",
      "Error code should be FORBIDDEN",
    )
  },
)

test.serial(
  "updatePublication: Attempting to update others post should fail",
  async (t) => {
    const { graphqlClient, createClientJwt } = t.context
    const selfNode = await Node.query().findOne({ is_self: true })
    const token = await createClientJwt(selfNode.address)

    // Prepare: Create a complete "other node" and its signed post
    const otherAccount = generateTestAccount()
    const otherNode = await Node.query().insertAndFetch({
      address: otherAccount.address,
      url: `https://other.com`,
      is_self: false,
      profile_version: 0,
      title: "other node",
    })
    const { publication } = await createTestPublication(
      otherNode,
      otherAccount,
      "External content",
      true,
    )

    const mutation = `
    mutation UpdatePublication($input: UpdatePublicationInput!) {
      updatePublication(input: $input) { id }
    }
  `
    const variables = {
      input: { id: publication.id, body: "Attempt to update" },
    }

    const { errors } = await graphqlClient.query(mutation, {
      variables,
      headers: { Authorization: `Bearer ${token}` },
    })

    t.truthy(errors, "Should return GraphQL errors")
    t.is(
      errors[0].extensions.code,
      "FORBIDDEN",
      "Error code should be FORBIDDEN",
    )
  },
)

test("updatePublication: Should fail when unauthenticated", async (t) => {
  const { graphqlClient } = t.context
  const selfNode = await Node.query().findOne({ is_self: true })
  const { publication } = await createTestPublication(
    selfNode,
    TEST_ACCOUNT_NODE_A,
    "testUpdatePublication should fail when unauthenticated",
  )

  const mutation = `
    mutation UpdatePublication($input: UpdatePublicationInput!) {
      updatePublication(input: $input) { id }
    }
  `
  const variables = { input: { id: publication.id, body: "New content" } }

  const { errors } = await graphqlClient.query(mutation, { variables })

  t.truthy(errors, "Should return GraphQL errors")
  t.is(
    errors[0].extensions.code,
    "UNAUTHENTICATED",
    "Error code should be UNAUTHENTICATED",
  )
})

test("updatePublication: Updating non-existent post should fail", async (t) => {
  const { graphqlClient, selfNode, createClientJwt } = t.context
  const token = await createClientJwt(selfNode.address)

  const mutation = `
    mutation UpdatePublication($input: UpdatePublicationInput!) {
      updatePublication(input: $input) { id }
    }
  `
  const variables = { input: { id: "99999", body: "Non-existent content" } }

  const { errors } = await graphqlClient.query(mutation, {
    variables,
    headers: { Authorization: `Bearer ${token}` },
  })

  t.truthy(errors, "Should return GraphQL errors")
  t.is(errors[0].extensions.code, "NOT_FOUND", "Error code should be NOT_FOUND")
})

// =================================================================
// The following code will be appended to the end of test/graphql/publication.test.mjs
// =================================================================

test.serial(
  "destroyPublication: Success path - Owner should be able to delete own unsigned publication",
  async (t) => {
    const { graphqlClient, selfNode, createClientJwt } = t.context
    const token = await createClientJwt(selfNode.address)

    // 1. Create an own unsigned publication
    const content = await Content.create({
      type: "post",
      body: "Own unsigned content.",
    })
    const publication = await Publication.query().insert({
      content_hash: content.content_hash,
      author_address: selfNode.address,
      signature: null,
    })
    const publicationId = publication.id

    // 2. Define mutation
    const mutation = `
    mutation DestroyPublication($id: ID!) {
      destroyPublication(id: $id) {
        id
      }
    }
  `

    // 3. Execute and assert
    const { errors } = await graphqlClient.query(mutation, {
      variables: { id: publicationId },
      headers: { Authorization: `Bearer ${token}` },
    })

    t.falsy(errors, "Should not error when deleting own unsigned publication")
    const deletedPublication = await Publication.query().findById(publicationId)
    t.falsy(deletedPublication, "Record in database should be deleted")
  },
)

test.serial(
  "destroyPublication: Success path - Owner should be able to delete own signed publication",
  async (t) => {
    const { graphqlClient, selfNode, createClientJwt } = t.context
    const token = await createClientJwt(selfNode.address)

    // 1. Create an own signed publication
    const content = await Content.create({
      type: "post",
      body: "Own signed content.",
    })
    const publication = await Publication.query().insert({
      content_hash: content.content_hash,
      author_address: selfNode.address,
      signature: "0xMySignature",
    })
    const publicationId = publication.id

    // 2. Define mutation
    const mutation = `
    mutation DestroyPublication($id: ID!) {
      destroyPublication(id: $id) {
        id
      }
    }
  `

    // 3. Execute and assert
    const { errors } = await graphqlClient.query(mutation, {
      variables: { id: publicationId },
      headers: { Authorization: `Bearer ${token}` },
    })

    t.falsy(errors, "Should not error when deleting own signed publication")
    const deletedPublication = await Publication.query().findById(publicationId)
    t.falsy(deletedPublication, "Record in database should be deleted")
  },
)

test.serial(
  "destroyPublication: Success path - Owner should be able to delete synced publication copy from other node",
  async (t) => {
    const { graphqlClient, selfNode, otherUserNode, createClientJwt } =
      t.context
    const token = await createClientJwt(selfNode.address)

    // 1. Create a publication belonging to other node (simulate synced copy)
    const content = await Content.create({
      type: "post",
      body: "Content copy from other node.",
    })
    const publication = await Publication.query().insert({
      content_hash: content.content_hash,
      author_address: otherUserNode.address, // Author is other node
      signature: "0xAnotherSignature",
    })
    const publicationId = publication.id

    // 2. Define mutation
    const mutation = `
    mutation DestroyPublication($id: ID!) {
      destroyPublication(id: $id) {
        id
      }
    }
  `

    // 3. Execute and assert
    const { errors } = await graphqlClient.query(mutation, {
      variables: { id: publicationId },
      headers: { Authorization: `Bearer ${token}` },
    })

    t.falsy(
      errors,
      "Should not error when deleting other node publication copy",
    )
    const deletedPublication = await Publication.query().findById(publicationId)
    t.falsy(deletedPublication, "Record in database should be deleted")
  },
)

test("destroyPublication: Failure path - Unauthenticated user cannot delete", async (t) => {
  const { graphqlClient, selfNode } = t.context
  const content = await Content.create({
    type: "post",
    body: "Content for testing unauthenticated deletion.",
  })
  const publication = await Publication.query().insert({
    content_hash: content.content_hash,
    author_address: selfNode.address,
  })
  const mutation = `mutation DestroyPublication($id: ID!) { destroyPublication(id: $id) { id } }`

  const { errors } = await graphqlClient.query(mutation, {
    variables: { id: publication.id },
  })

  t.truthy(errors, "Should return GraphQL errors")
  t.is(
    errors[0].extensions.code,
    "UNAUTHENTICATED",
    "Error code should be UNAUTHENTICATED",
  )
})

test("destroyPublication: Failure path - Deleting non-existent publication should return NOT_FOUND", async (t) => {
  const { graphqlClient, selfNode, createClientJwt } = t.context
  const token = await createClientJwt(selfNode.address)
  const nonExistentId = "999999"
  const mutation = `mutation DestroyPublication($id: ID!) { destroyPublication(id: $id) { id } }`

  const { errors } = await graphqlClient.query(mutation, {
    variables: { id: nonExistentId },
    headers: { Authorization: `Bearer ${token}` },
  })

  t.truthy(errors, "Should return GraphQL errors")
  t.is(errors[0].extensions.code, "NOT_FOUND", "Error code should be NOT_FOUND")
})

test("signPublication: Success path - should sign and push content to all followers", async (t) => {
  // 清理之前的 nock 状态
  nock.cleanAll()

  const { graphqlClient, selfNode, otherUserNode, createClientJwt } = t.context
  const token = await createClientJwt(selfNode.address)

  // 1. Setup: Make otherUserNode a follower of selfNode
  await Connection.query().insert({
    follower_address: otherUserNode.address,
    followee_address: selfNode.address,
  })

  // 2. Setup: Create an unsigned publication owned by selfNode
  const { content, publication } = await createTestPublication(
    selfNode,
    TEST_ACCOUNT_NODE_A,
    "Content to be signed",
  )

  // 3. Setup: Generate EIP-712 signature for the content
  const typedData = Publication.createStatementOfSource(
    content.content_hash,
    selfNode.address,
    Math.floor(new Date(publication.created_at).getTime() / 1000),
  )
  const signature = await generateSignature(
    TEST_ACCOUNT_NODE_A,
    typedData,
    "typedData",
  )

  const nockScope = nock(otherUserNode.url)
    .post("/ewp/replications", (body) => {
      // Assert the pushed payload is correct
      t.is(
        body.typedData.message.contentHash,
        content.content_hash,
        "Pushed contentHash should be correct",
      )
      t.is(
        body.typedData.message.publisherAddress,
        selfNode.address,
        "Pushed publisherAddress should be correct",
      )
      t.is(
        typeof body.typedData.message.timestamp,
        "number",
        "Pushed timestamp should be a number",
      )
      t.is(body.signature, signature, "Pushed signature should be correct")
      return true
    })
    .matchHeader("X-Epress-Profile-Version", "0")
    .reply(201, { status: "replicated" })
  // Check nock status

  // 5. Define and execute signPublication mutation
  const mutation = `
    mutation SignPublication($id: ID!, $signature: String!) {
      signPublication(id: $id, signature: $signature) {
        id
        signature
      }
    }
  `
  const variables = { id: publication.id.toString(), signature }

  const { data, errors } = await graphqlClient.query(mutation, {
    variables,
    headers: { Authorization: `Bearer ${token}` },
  })

  // 6. Assert GraphQL response
  t.falsy(errors, "Should not return any GraphQL errors")
  t.is(
    data.signPublication.signature,
    signature,
    "Returned signature should be correct",
  )

  // for testing, wait request to be sent
  // Wait for async operation to complete, max 1 second
  let attempts = 0
  while (!nockScope.isDone() && attempts < 10) {
    await new Promise((resolve) => setTimeout(resolve, 100))
    attempts++
  }

  // 7. Assert mock EWP endpoint was called
  t.true(nockScope.isDone(), "Must send /replications request to follower node")

  // 8. Assert database state
  const dbPublication = await Publication.query().findById(publication.id)
  t.is(
    dbPublication.signature,
    signature,
    "Signature should be saved in the database",
  )
})

test.serial(
  "signPublication: Failure path - should fail and not push if publication is already signed",
  async (t) => {
    const { graphqlClient, selfNode, otherUserNode, createClientJwt } =
      t.context
    const token = await createClientJwt(selfNode.address)

    // 1. Setup: Create a signed publication
    const { publication } = await createTestPublication(
      selfNode,
      TEST_ACCOUNT_NODE_A,
      "Already signed content",
      true,
    )

    // 2. Mock follower's endpoint, expecting it not to be called
    const nockScope = nock(otherUserNode.url)
      .post("/ewp/replications")
      .matchHeader("X-Epress-Profile-Version", "0")
      .reply(201)

    // 3. Attempt to sign again
    const mutation = `
    mutation SignPublication($id: ID!, $signature: String!) {
      signPublication(id: $id, signature: $signature) {
        id
      }
    }
  `
    const variables = {
      id: publication.id.toString(),
      signature: publication.signature,
    }

    const { errors } = await graphqlClient.query(mutation, {
      variables,
      headers: { Authorization: `Bearer ${token}` },
    })

    // 4. Assert
    t.truthy(errors, "Should return GraphQL errors")
    t.is(
      errors[0].extensions.code,
      "FORBIDDEN",
      "Error code should be FORBIDDEN",
    )
    t.false(nockScope.isDone(), "Should not send any request to follower node")
  },
)

test.serial(
  "signPublication: Failure path - should fail if signature does not match content or author",
  async (t) => {
    const { graphqlClient, selfNode, createClientJwt } = t.context
    const token = await createClientJwt(selfNode.address)
    const { content, publication } = await createTestPublication(
      selfNode,
      TEST_ACCOUNT_NODE_A,
      "Content for invalid signature test",
    )

    // 1. Prepare a wrong signature (e.g., signed with a different account)
    const otherAccount = generateTestAccount()
    const typedData = Publication.createStatementOfSource(
      content.content_hash,
      selfNode.address,
      Math.floor(new Date(publication.created_at).getTime() / 1000),
    )
    const wrongSignature = await generateSignature(
      otherAccount,
      typedData,
      "typedData",
    )

    // 2. Execute mutation
    const mutation = `
    mutation SignPublication($id: ID!, $signature: String!) {
      signPublication(id: $id, signature: $signature) {
        id
      }
    }
  `
    const variables = {
      id: publication.id.toString(),
      signature: wrongSignature,
    }

    const { errors } = await graphqlClient.query(mutation, {
      variables,
      headers: { Authorization: `Bearer ${token}` },
    })

    // 3. Assert
    t.truthy(errors, "Should return GraphQL errors")
    t.is(
      errors[0].extensions.code,
      "INVALID_SIGNATURE",
      "Error code should be INVALID_SIGNATURE",
    )
  },
)

// Test integration token permissions for publication operations
test("Success: createPublication with integration token should work", async (t) => {
  const { graphqlClient, createIntegrationJwt } = t.context

  // 使用 integration token 创建发布内容
  const integrationToken = await createIntegrationJwt(["create:publications"])

  const content = await Content.create({
    type: "POST",
    body: `Test content for integration token ${Date.now()}`,
  })

  const mutation = `
    mutation CreatePublication($input: CreatePublicationInput!) {
      createPublication(input: $input) {
        id
        content {
          body
        }
        author {
          address
        }
      }
    }
  `

  const variables = {
    input: {
      type: "POST",
      body: content.body,
    },
  }

  const { data, errors } = await graphqlClient.query(mutation, {
    variables,
    headers: { Authorization: `Bearer ${integrationToken}` },
  })

  t.falsy(errors, "Should not have any GraphQL errors")
  t.truthy(data.createPublication, "Should return created publication")
  t.is(data.createPublication.content.body, content.body)
})

test("Success: updatePublication with integration token should work", async (t) => {
  const { graphqlClient, createIntegrationJwt } = t.context

  // 使用 integration token 更新发布内容
  const integrationToken = await createIntegrationJwt(["update:publications"])

  // 先创建一个发布内容
  const content = await Content.create({
    type: "POST",
    body: `Original content for update test ${Date.now()}`,
  })

  const publication = await Publication.query().insert({
    content_hash: content.content_hash,
    author_address: t.context.selfNode.address,
    signature: null,
  })

  const mutation = `
    mutation UpdatePublication($input: UpdatePublicationInput!) {
      updatePublication(input: $input) {
        id
        content {
          body
        }
      }
    }
  `

  const variables = {
    input: {
      id: publication.id.toString(),
      body: `Updated content for integration token ${Date.now()}`,
    },
  }

  const { data, errors } = await graphqlClient.query(mutation, {
    variables,
    headers: { Authorization: `Bearer ${integrationToken}` },
  })

  t.falsy(errors, "Should not have any GraphQL errors")
  t.truthy(data.updatePublication, "Should return updated publication")
  t.is(data.updatePublication.content.body, variables.input.body)
})

test("Success: destroyPublication with integration token should work", async (t) => {
  const { graphqlClient, createIntegrationJwt } = t.context

  // 使用 integration token 删除发布内容
  const integrationToken = await createIntegrationJwt(["delete:publications"])

  // 先创建一个发布内容
  const content = await Content.create({
    type: "POST",
    body: `Content for deletion test ${Date.now()}`,
  })

  const publication = await Publication.query().insert({
    content_hash: content.content_hash,
    author_address: t.context.selfNode.address,
    signature: null,
  })

  const mutation = `
    mutation DestroyPublication($id: ID!) {
      destroyPublication(id: $id) {
        id
      }
    }
  `

  const variables = {
    id: publication.id.toString(),
  }

  const { data, errors } = await graphqlClient.query(mutation, {
    variables,
    headers: { Authorization: `Bearer ${integrationToken}` },
  })

  t.falsy(errors, "Should not have any GraphQL errors")
  t.truthy(data.destroyPublication, "Should return deleted publication")

  // 验证发布内容已被删除
  const deletedPublication = await Publication.query().findById(publication.id)
  t.is(
    deletedPublication,
    undefined,
    "Publication should be deleted from database",
  )
})
