import test from "ava"
import {
  Comment,
  Content,
  Node,
  Publication,
  Setting,
} from "../../server/models/index.mjs"
import { hash } from "../../server/utils/crypto.mjs"
import { generateSignature, TEST_ACCOUNT_NODE_A } from "../setup.mjs"

let testPublication

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
  ],
}

test.beforeEach(async (t) => {
  await Comment.query().delete()
  await Publication.query().delete()
  await Content.query().delete()
  await Setting.query().where({ key: "allow_comment" }).delete()

  const selfNode = await Node.getSelf()
  const uniqueBody = `Test content for comment ${Date.now()}-${Math.random()}.`
  const content = await Content.create({ type: "post", body: uniqueBody })
  testPublication = await Publication.query().insert({
    content_hash: content.content_hash,
    author_address: selfNode.address,
    signature: null,
    comment_count: 0,
  })
  t.context.publicationId = testPublication.id
  t.context.selfNode = selfNode
  t.context.testPublication = testPublication
})

test.serial(
  "createComment: should create comment with valid signature",
  async (t) => {
    const { graphqlClient, publicationId, selfNode } = t.context

    const commentBody = "This is a test comment."
    const commentBodyHash = `0x${await hash.sha256(commentBody)}`

    const typedData = {
      domain: COMMENT_SIGNATURE_DOMAIN,
      types: COMMENT_SIGNATURE_TYPES,
      primaryType: "CommentSignature",
      message: {
        nodeAddress: selfNode.address,
        commenterAddress: TEST_ACCOUNT_NODE_A.address,
        publicationId: parseInt(publicationId, 10),
        commentBodyHash,
      },
    }

    const signature = await generateSignature(
      TEST_ACCOUNT_NODE_A,
      typedData,
      "typedData",
    )

    const mutation = `
      mutation CreateComment($input: CreateCommentInput!) {
        createComment(input: $input) {
          id
          body
          author_name
          author_address
          created_at
        }
      }
    `

    const input = {
      publication_id: publicationId,
      body: commentBody,
      author_name: "Test User",
      author_address: TEST_ACCOUNT_NODE_A.address,
      signature: signature,
    }

    const response = await graphqlClient.query(mutation, {
      variables: { input },
    })
    t.truthy(response.data?.createComment, "Should return created comment")
    t.is(response.data.createComment.body, commentBody)
    t.is(
      response.data.createComment.author_address,
      TEST_ACCOUNT_NODE_A.address,
    )
  },
)

test("createComment: missing signature should return error", async (t) => {
  const { graphqlClient, publicationId } = t.context

  const mutation = `
    mutation CreateComment($input: CreateCommentInput!) {
      createComment(input: $input) {
        id
        body
        status
      }
    }
  `

  const input = {
    publication_id: publicationId,
    body: "Test comment",
    author_name: "Test User",
    author_address: TEST_ACCOUNT_NODE_A.address,
    signature: "",
  }

  const response = await graphqlClient.query(mutation, {
    variables: { input },
  })

  t.truthy(response.errors, "Should return error")
  t.true(response.errors.length > 0, "Should have at least one error")
})

test("createComment: invalid signature should return error", async (t) => {
  const { graphqlClient, publicationId } = t.context

  const mutation = `
    mutation CreateComment($input: CreateCommentInput!) {
      createComment(input: $input) {
        id
        body
      }
    }
  `

  const input = {
    publication_id: publicationId,
    body: "Test comment",
    author_name: "Test User",
    author_address: TEST_ACCOUNT_NODE_A.address,
    signature: "0xinvalid",
  }

  const response = await graphqlClient.query(mutation, {
    variables: { input },
  })

  t.truthy(response.errors, "Should return error")
  t.is(response.errors[0]?.extensions?.code, "INVALID_SIGNATURE")
})

test("createComment: signature does not match address should return error", async (t) => {
  const { graphqlClient, publicationId, selfNode } = t.context
  const { TEST_ETHEREUM_ADDRESS_NODE_B } = await import("../env.mjs")

  const commentBody = "Test comment"
  const commentBodyHash = `0x${await hash.sha256(commentBody)}`

  const typedData = {
    domain: COMMENT_SIGNATURE_DOMAIN,
    types: COMMENT_SIGNATURE_TYPES,
    primaryType: "CommentSignature",
    message: {
      nodeAddress: selfNode.address,
      commenterAddress: TEST_ETHEREUM_ADDRESS_NODE_B,
      publicationId: parseInt(publicationId, 10),
      commentBodyHash,
    },
  }

  const signature = await generateSignature(
    TEST_ACCOUNT_NODE_A,
    typedData,
    "typedData",
  )

  const mutation = `
    mutation CreateComment($input: CreateCommentInput!) {
      createComment(input: $input) {
        id
        body
      }
    }
  `

  const input = {
    publication_id: publicationId,
    body: commentBody,
    author_name: "Test User",
    author_address: TEST_ETHEREUM_ADDRESS_NODE_B,
    signature: signature,
  }

  const response = await graphqlClient.query(mutation, {
    variables: { input },
  })

  t.truthy(response.errors, "Should return error")
  t.is(response.errors[0]?.extensions?.code, "INVALID_SIGNATURE")
})

test("createComment: invalid Ethereum address should return error", async (t) => {
  const { graphqlClient, publicationId } = t.context

  const mutation = `
    mutation CreateComment($input: CreateCommentInput!) {
      createComment(input: $input) {
        id
        body
      }
    }
  `

  const input = {
    publication_id: publicationId,
    body: "Test comment",
    author_name: "Test User",
    author_address: "invalid-address",
    signature: "0x123",
  }

  const response = await graphqlClient.query(mutation, {
    variables: { input },
  })

  t.truthy(response.errors, "Should return error")
  t.is(response.errors[0]?.extensions?.code, "VALIDATION_FAILED")
})

test("createComment: missing body should return error", async (t) => {
  const { graphqlClient, publicationId } = t.context

  const mutation = `
    mutation CreateComment($input: CreateCommentInput!) {
      createComment(input: $input) {
        id
        body
      }
    }
  `

  const input = {
    publication_id: publicationId,
    body: "",
    author_name: "Test User",
    author_address: TEST_ACCOUNT_NODE_A.address,
    signature: "0x123",
  }

  const response = await graphqlClient.query(mutation, {
    variables: { input },
  })

  t.truthy(response.errors, "Should return error")
  t.is(response.errors[0]?.extensions?.code, "VALIDATION_FAILED")
})

test("createComment: author_name too long should return error", async (t) => {
  const { graphqlClient, publicationId } = t.context

  const mutation = `
    mutation CreateComment($input: CreateCommentInput!) {
      createComment(input: $input) {
        id
        body
      }
    }
  `

  const input = {
    publication_id: publicationId,
    body: "Test comment",
    author_name: "a".repeat(51),
    author_address: TEST_ACCOUNT_NODE_A.address,
    signature: "0x123",
  }

  const response = await graphqlClient.query(mutation, {
    variables: { input },
  })

  t.truthy(response.errors, "Should return error")
  t.is(response.errors[0]?.extensions?.code, "VALIDATION_FAILED")
})

test("createComment: invalid publication_id should return error", async (t) => {
  const { graphqlClient } = t.context

  const mutation = `
    mutation CreateComment($input: CreateCommentInput!) {
      createComment(input: $input) {
        id
        body
      }
    }
  `

  const input = {
    publication_id: 99999,
    body: "Test comment",
    author_name: "Test User",
    author_address: TEST_ACCOUNT_NODE_A.address,
    signature: "0x123",
  }

  const response = await graphqlClient.query(mutation, {
    variables: { input },
  })

  t.truthy(response.errors, "Should return error")
  t.is(response.errors[0]?.extensions?.code, "NOT_FOUND")
})

test.serial(
  "createComment: comment_count should increase after creating comment",
  async (t) => {
    const { graphqlClient, publicationId, selfNode } = t.context

    const commentBody = "Test comment"
    const commentBodyHash = `0x${await hash.sha256(commentBody)}`

    const typedData = {
      domain: COMMENT_SIGNATURE_DOMAIN,
      types: COMMENT_SIGNATURE_TYPES,
      primaryType: "CommentSignature",
      message: {
        nodeAddress: selfNode.address,
        commenterAddress: TEST_ACCOUNT_NODE_A.address,
        publicationId: parseInt(publicationId, 10),
        commentBodyHash,
      },
    }

    const signature = await generateSignature(
      TEST_ACCOUNT_NODE_A,
      typedData,
      "typedData",
    )

    const mutation = `
      mutation CreateComment($input: CreateCommentInput!) {
        createComment(input: $input) {
          id
          body
        }
      }
    `

    const input = {
      publication_id: publicationId,
      body: commentBody,
      author_name: "Test User",
      author_address: TEST_ACCOUNT_NODE_A.address,
      signature: signature,
    }

    await graphqlClient.query(mutation, { variables: { input } })

    const publication = await Publication.query().findById(publicationId)
    t.is(publication.comment_count, 1, "Comment count should be 1")
  },
)

test.serial(
  "destroyComment: should delete comment with valid signature",
  async (t) => {
    const { graphqlClient, publicationId, selfNode } = t.context

    const commentBody = "Test comment to delete"
    const commentBodyHash = `0x${await hash.sha256(commentBody)}`

    const typedData = {
      domain: COMMENT_SIGNATURE_DOMAIN,
      types: COMMENT_SIGNATURE_TYPES,
      primaryType: "CommentSignature",
      message: {
        nodeAddress: selfNode.address,
        commenterAddress: TEST_ACCOUNT_NODE_A.address,
        publicationId: parseInt(publicationId, 10),
        commentBodyHash,
      },
    }

    const signature = await generateSignature(
      TEST_ACCOUNT_NODE_A,
      typedData,
      "typedData",
    )

    const createMutation = `
      mutation CreateComment($input: CreateCommentInput!) {
        createComment(input: $input) {
          id
          body
        }
      }
    `

    const createInput = {
      publication_id: publicationId,
      body: commentBody,
      author_name: "Test User",
      author_address: TEST_ACCOUNT_NODE_A.address,
      signature: signature,
    }

    const createResponse = await graphqlClient.query(createMutation, {
      variables: { input: createInput },
    })
    const commentId = createResponse.data.createComment.id

    const deleteTypedData = {
      domain: COMMENT_SIGNATURE_DOMAIN,
      types: {
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
      },
      primaryType: "DeleteComment",
      message: {
        nodeAddress: selfNode.address,
        commentId: parseInt(commentId, 10),
        commenterAddress: TEST_ACCOUNT_NODE_A.address,
      },
    }

    const deleteSignature = await generateSignature(
      TEST_ACCOUNT_NODE_A,
      deleteTypedData,
      "typedData",
    )

    const deleteMutation = `
      mutation DestroyComment($id: ID!, $signature: String!) {
        destroyComment(id: $id, signature: $signature) {
          id
          body
        }
      }
    `

    const deleteResponse = await graphqlClient.query(deleteMutation, {
      variables: { id: commentId, signature: deleteSignature },
    })

    t.truthy(deleteResponse.data.destroyComment, "Should delete comment")

    const publication = await Publication.query().findById(publicationId)
    t.is(publication.comment_count, 0, "Comment count should be 0")
  },
)

test("destroyComment: missing signature should return error", async (t) => {
  const { graphqlClient, publicationId, selfNode } = t.context

  const commentBody = "Test comment"
  const commentBodyHash = `0x${await hash.sha256(commentBody)}`

  const typedData = {
    domain: COMMENT_SIGNATURE_DOMAIN,
    types: COMMENT_SIGNATURE_TYPES,
    primaryType: "CommentSignature",
    message: {
      nodeAddress: selfNode.address,
      commenterAddress: TEST_ACCOUNT_NODE_A.address,
      publicationId: parseInt(publicationId, 10),
      commentBodyHash,
    },
  }

  const signature = await generateSignature(
    TEST_ACCOUNT_NODE_A,
    typedData,
    "typedData",
  )

  const createMutation = `
    mutation CreateComment($input: CreateCommentInput!) {
      createComment(input: $input) {
        id
      }
    }
  `

  const createInput = {
    publication_id: publicationId,
    body: commentBody,
    author_name: "Test User",
    author_address: TEST_ACCOUNT_NODE_A.address,
    signature: signature,
  }

  const createResponse = await graphqlClient.query(createMutation, {
    variables: { input: createInput },
  })
  const commentId = createResponse.data.createComment.id

  const deleteMutation = `
    mutation DestroyComment($id: ID!, $signature: String!) {
      destroyComment(id: $id, signature: $signature) {
        id
      }
    }
  `

  const response = await graphqlClient.query(deleteMutation, {
    variables: { id: commentId, signature: "" },
  })

  t.truthy(response.errors, "Should return error")
  t.is(response.errors[0]?.extensions?.code, "VALIDATION_FAILED")
})

test("destroyComment: non-existent ID should return NOT_FOUND", async (t) => {
  const { graphqlClient } = t.context

  const mutation = `
    mutation DestroyComment($id: ID!, $signature: String!) {
      destroyComment(id: $id, signature: $signature) {
        id
      }
    }
  `

  const response = await graphqlClient.query(mutation, {
    variables: { id: 99999, signature: "0x123" },
  })

  t.truthy(response.errors, "Should return error")
  t.is(response.errors[0]?.extensions?.code, "NOT_FOUND")
})

test.serial("createComment: allowComment disabled should fail", async (t) => {
  const { graphqlClient, publicationId } = t.context

  await Setting.query().insert({
    key: "allow_comment",
    value: "false",
  })

  const mutation = `
      mutation CreateComment($input: CreateCommentInput!) {
        createComment(input: $input) {
          id
          body
        }
      }
    `

  const input = {
    publication_id: publicationId,
    body: "Test comment",
    author_name: "Test User",
    author_address: TEST_ACCOUNT_NODE_A.address,
    signature: "0x123",
  }

  const response = await graphqlClient.query(mutation, {
    variables: { input },
  })

  t.truthy(response.errors, "Should return error")
  t.is(response.errors[0]?.extensions?.code, "COMMENT_DISABLED")
})

test.serial("createComment: allowComment enabled should succeed", async (t) => {
  const { graphqlClient, publicationId, selfNode } = t.context

  await Setting.query().insert({
    key: "allow_comment",
    value: "true",
  })

  const commentBody = "Test comment"
  const commentBodyHash = `0x${await hash.sha256(commentBody)}`

  const typedData = {
    domain: COMMENT_SIGNATURE_DOMAIN,
    types: COMMENT_SIGNATURE_TYPES,
    primaryType: "CommentSignature",
    message: {
      nodeAddress: selfNode.address,
      commenterAddress: TEST_ACCOUNT_NODE_A.address,
      publicationId: parseInt(publicationId, 10),
      commentBodyHash,
    },
  }

  const signature = await generateSignature(
    TEST_ACCOUNT_NODE_A,
    typedData,
    "typedData",
  )

  const mutation = `
      mutation CreateComment($input: CreateCommentInput!) {
        createComment(input: $input) {
          id
          body
        }
      }
    `

  const input = {
    publication_id: publicationId,
    body: commentBody,
    author_name: "Test User",
    author_address: TEST_ACCOUNT_NODE_A.address,
    signature: signature,
  }

  const response = await graphqlClient.query(mutation, {
    variables: { input },
  })

  t.truthy(response.data.createComment, "Should create comment")
})
