import test from "ava"
import {
  Comment,
  Content,
  Node,
  Publication,
} from "../../server/models/index.mjs"
import { TEST_ETHEREUM_ADDRESS_NODE_A, TEST_NODE_B } from "../setup.mjs"

test.serial.before(async (t) => {
  t.context.nodeB = await Node.query().insert({
    address: TEST_NODE_B.address,
    url: TEST_NODE_B.url,
    title: TEST_NODE_B.title,
    description: TEST_NODE_B.description,
    is_self: false,
  })
})

test("Success: fetch NODE should return node information", async (t) => {
  const { graphqlClient } = t.context

  const query = `
    query FetchNode($id: ID!) {
      fetch(type: NODE, id: $id) {
        ... on Node {
          address
          url
          title
          description
          created_at
          updated_at
        }
      }
    }
  `

  const { data, errors } = await graphqlClient.query(query, {
    variables: { id: t.context.nodeB.address.toString() },
  })

  t.falsy(errors, "Should not have any GraphQL errors")
  t.truthy(data.fetch, "Node data should exist")
  t.is(
    data.fetch.address,
    t.context.nodeB.address,
    "Ethereum address should match",
  )
  t.is(data.fetch.url, t.context.nodeB.url, "URL should match")
  t.is(data.fetch.title, TEST_NODE_B.title, "Title should match")
  t.is(
    data.fetch.description,
    TEST_NODE_B.description,
    "Description should match",
  )
  t.truthy(data.fetch.created_at, "Created_at should exist")
  t.is(
    typeof data.fetch.updated_at,
    "number",
    "Updated_at should be number (timestamp or null)",
  )
})

test("Success: fetch PUBLICATION (anonymous user) should return only self-authored publications", async (t) => {
  const { graphqlClient } = t.context

  const selfNode = await Node.query().findOne({ is_self: true })

  const selfContent = await Content.create({
    type: "post",
    body: "Self-authored publication content",
  })

  const externalContent = await Content.create({
    type: "post",
    body: "External publication content",
  })

  const publicationA = await Publication.query().insert({
    content_hash: selfContent.content_hash,
    author_address: selfNode.address,
    signature: null,
    comment_count: 0,
  })

  const publicationB = await Publication.query().insert({
    content_hash: externalContent.content_hash,
    author_address: t.context.nodeB.address,
    signature: null,
    comment_count: 0,
  })

  const query = `
    query FetchPublication($id: ID!) {
      fetch(type: PUBLICATION, id: $id) {
        ... on Publication {
          content_hash
          author_address
          signature
          comment_count
          created_at
          updated_at
          author {
            address
          }
          content {
            content_hash
          }
        }
      }
    }
  `

  const { data: dataA, errors: errorsA } = await graphqlClient.query(query, {
    variables: { id: publicationA.id.toString() },
  })

  t.falsy(errorsA, "Should not have any GraphQL errors")
  t.truthy(dataA.fetch, "Publication A should be accessible")
  t.is(
    dataA.fetch.author.address,
    TEST_ETHEREUM_ADDRESS_NODE_A,
    "Author should be self node",
  )

  const { data: dataB, errors: errorsB } = await graphqlClient.query(query, {
    variables: { id: publicationB.id.toString() },
  })

  t.falsy(errorsB, "Should not have any GraphQL errors")
  t.is(
    dataB.fetch,
    null,
    "External publication should not be accessible to anonymous users",
  )
})

test("Success: fetch COMMENT should return comment information", async (t) => {
  const { graphqlClient } = t.context

  const node = await Node.query().findOne({ is_self: true })

  const content = await Content.create({
    type: "post",
    body: "Publication content for comment test",
  })

  const publication = await Publication.query().insert({
    content_hash: content.content_hash,
    author_address: node.address,
    signature: null,
    comment_count: 1,
  })

  const comment = await Comment.query().insert({
    publication_id: publication.id,
    body: "This is a test comment",
    author_name: "testuser",
    author_address: node.address,
    signature: null,
  })

  const query = `
    query FetchComment($id: ID!) {
      fetch(type: COMMENT, id: $id) {
        ... on Comment {
          body
          author_name
          author_address
          created_at
          updated_at
          publication {
            id
            content_hash
            author_address
            signature
            comment_count
            created_at
            updated_at
          }
        }
      }
    }
  `

  const { data, errors } = await graphqlClient.query(query, {
    variables: { id: comment.id.toString() },
  })

  t.falsy(errors, "Should not have any GraphQL errors")
  t.truthy(data.fetch, "Comment data should exist")
  t.is(data.fetch.body, "This is a test comment", "Comment body should match")
  t.is(data.fetch.author_name, "testuser", "Commenter username should match")
  t.is(
    data.fetch.author_address,
    node.address,
    "Comment author address should match",
  )
  t.truthy(data.fetch.publication, "Publication association should be loaded")
  t.is(
    data.fetch.publication.id,
    publication.id.toString(),
    "Publication ID should match",
  )
})

test("Success: fetch PUBLICATION should load author and content associations", async (t) => {
  const { graphqlClient } = t.context

  const node = await Node.query().findOne({ is_self: true })

  const content = await Content.create({
    type: "post",
    body: "Test publication content with associations",
  })

  const publication = await Publication.query().insert({
    content_hash: content.content_hash,
    author_address: node.address,
    signature: null,
    comment_count: 0,
  })

  const query = `
    query FetchPublication($id: ID!) {
      fetch(type: PUBLICATION, id: $id) {
        ... on Publication {
          content_hash
          author_address
          signature
          comment_count
          created_at
          updated_at
          author {
            address
            url
            title
            description
          }
          content {
            content_hash
            type
            body
            mimetype
            size
          }
        }
      }
    }
  `

  const { data, errors } = await graphqlClient.query(query, {
    variables: { id: publication.id.toString() },
  })

  t.falsy(errors, "Should not have any GraphQL errors")
  t.truthy(data.fetch, "Publication data should exist")
  t.truthy(data.fetch.author, "Author association should be loaded")
  t.is(
    data.fetch.author.address,
    TEST_ETHEREUM_ADDRESS_NODE_A,
    "Author should be correct",
  )
  t.truthy(data.fetch.content, "Content association should be loaded")
  t.is(
    data.fetch.content.body,
    "Test publication content with associations",
    "Content body should match",
  )
  t.is(data.fetch.content.type, "POST", "Content type should match")
  t.is(
    data.fetch.content.mimetype,
    "text/markdown",
    "Content mimetype should match",
  )
  t.is(data.fetch.content.size, content.size, "Content size should match")
})

test("Error: fetch NODE with non-existent ID should return null", async (t) => {
  const { graphqlClient } = t.context

  const query = `
    query FetchNode($id: ID!) {
      fetch(type: NODE, id: $id) {
        ... on Node {
          address
          url
          title
          description
        }
      }
    }
  `

  const { data } = await graphqlClient.query(query, {
    variables: { id: "99999" },
  })

  t.is(data.fetch, null, "Should return null for non-existent node")
})

test("Error: fetch with invalid type should return GraphQL error", async (t) => {
  const { graphqlClient } = t.context

  const query = `
    query FetchInvalid($id: ID!) {
      fetch(type: INVALID_TYPE, id: $id) {
        ... on Node {
        }
      }
    }
  `

  const { data, errors } = await graphqlClient.query(query, {
    variables: { id: "1" },
  })

  t.truthy(errors, "Should have GraphQL errors for invalid type")
  t.is(data, null, "Data should be null for invalid type")
})

test("Success: fetch PUBLICATION with integration token should return any publication", async (t) => {
  const { graphqlClient, createIntegrationJwt } = t.context

  // 创建一个测试内容
  const content = await Content.create({
    type: "POST",
    body: `Test content for fetch permission test ${Date.now()}`,
  })

  // 创建一个测试发布（属于其他节点）
  const publication = await Publication.query().insert({
    content_hash: content.content_hash,
    author_address: t.context.nodeB.address,
    signature: `0x${Math.random().toString(16).substr(2, 130)}`,
  })

  // 使用 integration token 获取发布内容
  const integrationToken = await createIntegrationJwt(["fetch:publications"])

  const query = `
    query FetchPublication($id: ID!) {
      fetch(type: PUBLICATION, id: $id) {
        ... on Publication {
          id
          content {
            body
          }
          author {
            address
          }
        }
      }
    }
  `

  // 先检查 publication 是否存在
  const existingPublication = await Publication.query().findById(publication.id)
  t.truthy(existingPublication, "Publication should exist in database")
  t.is(
    existingPublication.author_address,
    t.context.nodeB.address,
    "Publication should belong to nodeB",
  )

  const { data } = await graphqlClient.query(query, {
    variables: { id: publication.id.toString() },
    headers: { Authorization: `Bearer ${integrationToken}` },
  })

  t.truthy(data.fetch, "Should return publication with integration token")
  t.is(data.fetch.id, publication.id.toString())
  t.is(data.fetch.content.body, content.body)
  t.is(data.fetch.author.address, TEST_NODE_B.address)
})

test("Success: fetch PUBLICATION without token should return only self-authored publications", async (t) => {
  const { graphqlClient } = t.context

  // 创建一个测试内容
  const content = await Content.create({
    type: "POST",
    body: `Test content for fetch without token test ${Date.now()}`,
  })

  // 创建一个测试发布（属于自己节点）
  const publication = await Publication.query().insert({
    content_hash: content.content_hash,
    author_address: t.context.selfNode.address,
    signature: `0x${Math.random().toString(16).substr(2, 130)}`,
  })

  const query = `
    query FetchPublication($id: ID!) {
      fetch(type: PUBLICATION, id: $id) {
        ... on Publication {
          id
          content {
            body
          }
          author {
            address
          }
        }
      }
    }
  `

  const { data } = await graphqlClient.query(query, {
    variables: { id: publication.id.toString() },
    // 不传递 Authorization header
  })

  t.truthy(data.fetch, "Should return self-authored publication without token")
  t.is(data.fetch.id, publication.id.toString())
  t.is(data.fetch.content.body, content.body)
  t.is(data.fetch.author.address, TEST_ETHEREUM_ADDRESS_NODE_A)
})

test("Success: fetch COMMENT with integration token should return any comment", async (t) => {
  const { graphqlClient, createIntegrationJwt } = t.context

  // 创建一个测试内容
  const content = await Content.create({
    type: "POST",
    body: `Test content for comment fetch test ${Date.now()}`,
  })

  // 创建一个测试发布
  const publication = await Publication.query().insert({
    content_hash: content.content_hash,
    author_address: t.context.nodeB.address,
    signature: `0x${Math.random().toString(16).substr(2, 130)}`,
  })

  const comment = await Comment.query().insert({
    publication_id: publication.id,
    body: `Test comment for fetch permission test ${Date.now()}`,
    author_name: "test_user",
    author_address: t.context.nodeB.address,
    signature: null,
  })

  // 使用 integration token 获取评论
  const integrationToken = await createIntegrationJwt(["fetch:comments"])

  const query = `
    query FetchComment($id: ID!) {
      fetch(type: COMMENT, id: $id) {
        ... on Comment {
          id
          body
          author_name
        }
      }
    }
  `

  const { data } = await graphqlClient.query(query, {
    variables: { id: comment.id.toString() },
    headers: { Authorization: `Bearer ${integrationToken}` },
  })

  t.truthy(data.fetch, "Should return comment with integration token")
  t.is(data.fetch.id, comment.id.toString())
  t.is(data.fetch.body, comment.body)
})

test("Success: fetch COMMENT without token should return comments", async (t) => {
  const { graphqlClient } = t.context

  // 创建一个测试内容
  const content = await Content.create({
    type: "POST",
    body: `Test content for comment fetch without token test ${Date.now()}`,
  })

  // 创建一个测试发布
  const publication = await Publication.query().insert({
    content_hash: content.content_hash,
    author_address: t.context.selfNode.address,
    signature: `0x${Math.random().toString(16).substr(2, 130)}`,
  })

  const comment1 = await Comment.query().insert({
    publication_id: publication.id,
    body: `Comment one for fetch without token test ${Date.now()}`,
    author_name: "test_user",
    author_address: t.context.selfNode.address,
    signature: null,
  })

  const comment2 = await Comment.query().insert({
    publication_id: publication.id,
    body: `Comment two for fetch without token test ${Date.now()}`,
    author_name: "test_user2",
    author_address: t.context.selfNode.address,
    signature: null,
  })

  const query = `
    query FetchComment($id: ID!) {
      fetch(type: COMMENT, id: $id) {
        ... on Comment {
          id
          body
          author_name
        }
      }
    }
  `

  const { data: data1 } = await graphqlClient.query(query, {
    variables: { id: comment1.id.toString() },
  })

  t.truthy(data1.fetch, "Should return comment without token")
  t.is(data1.fetch.id, comment1.id.toString())
  t.is(data1.fetch.body, comment1.body)

  const { data: data2 } = await graphqlClient.query(query, {
    variables: { id: comment2.id.toString() },
  })

  t.truthy(data2.fetch, "Should return comment without token")
  t.is(data2.fetch.id, comment2.id.toString())
  t.is(data2.fetch.body, comment2.body)
})
