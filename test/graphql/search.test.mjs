import test from "ava"
import {
  Comment,
  Connection,
  Content,
  Node,
  Publication,
} from "../../server/models/index.mjs"
import { TEST_ETHEREUM_ADDRESS_NODE_A, TEST_NODE_B } from "../setup.mjs"

// Test data preparation
test.serial.before(async (t) => {
  // Create test node B
  t.context.nodeB = await Node.query().insert({
    address: TEST_NODE_B.address,
    url: TEST_NODE_B.url,
    title: TEST_NODE_B.title,
    description: TEST_NODE_B.description,
    is_self: false,
    profile_version: 0,
  })

  // Create test node C (for testing connection relationships)
  t.context.nodeC = await Node.query().insert({
    address: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    url: "https://node-c.com",
    title: "Test Node C",
    description: "Another test node for connection testing.",
    is_self: false,
    profile_version: 0,
  })

  // Create connection: Node C follows Node A (our node)
  t.context.connectionCA = await Connection.query().insert({
    follower_address: t.context.nodeC.address,
    followee_address: (await Node.query().findOne({ is_self: true })).address,
  })

  // Create connection: Node A follows Node B
  t.context.connectionAB = await Connection.query().insert({
    follower_address: (await Node.query().findOne({ is_self: true })).address,
    followee_address: t.context.nodeB.address,
  })

  // Create test content
  t.context.contentA = await Content.create({
    type: "post",
    body: "Test publication content A",
  })
  t.context.contentB = await Content.create({
    type: "post",
    body: "Test publication content B",
  })
  t.context.contentC = await Content.create({
    type: "post",
    body: "Test publication content C",
  })
  t.context.contentD = await Content.create({
    type: "post",
    body: "Test publication content D",
  })

  // Create test publications
  const selfNode = await Node.query().findOne({ is_self: true })

  // Signed publication (own)
  t.context.publicationSigned = await Publication.query().insert({
    content_hash: t.context.contentA.content_hash,
    author_address: selfNode.address,
    signature:
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1c",
    comment_count: 0,
  })

  // Unsigned publication (own)
  t.context.publicationUnsigned = await Publication.query().insert({
    content_hash: t.context.contentB.content_hash,
    author_address: selfNode.address,
    signature: null,
    comment_count: 0,
  })

  // External node publication (replicated via EWP protocol, must have signature)
  t.context.publicationExternal = await Publication.query().insert({
    content_hash: t.context.contentC.content_hash,
    author_address: t.context.nodeB.address,
    signature:
      "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1c",
    comment_count: 0,
  })

  // Followed node publication (replicated via EWP protocol, must have signature)
  t.context.publicationFollowed = await Publication.query().insert({
    content_hash: t.context.contentD.content_hash,
    author_address: t.context.nodeB.address,
    signature:
      "0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba1c",
    comment_count: 0,
  })

  // Create test comments
  t.context.comment = await Comment.query().insert({
    publication_id: t.context.publicationSigned.id,
    body: "This is a test comment",
    status: "CONFIRMED",
    auth_type: "EMAIL",
    author_name: "testuser",
    author_id: "test@example.com",
    credential: null,
  })

  t.context.comment2 = await Comment.query().insert({
    publication_id: t.context.publicationSigned.id,
    body: "Another test comment",
    status: "CONFIRMED",
    auth_type: "ETHEREUM",
    author_name: "cryptouser",
    author_id: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    credential: null,
  })
})

// ==================== NODE Search Tests ====================

test("Success: search NODE with type followers should return nodes following self", async (t) => {
  const { graphqlClient } = t.context

  const query = `
    query SearchNodes($filterBy: JSON) {
      search(type: NODE, filterBy: $filterBy) {
        total
        edges {
          cursor
          node {
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
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `
  const { data, errors } = await graphqlClient.query(query, {
    variables: { filterBy: { type: "followers" } },
  })

  t.falsy(errors, "Should not have any GraphQL errors")
  t.truthy(data.search, "Search result should exist")
  t.is(data.search.total, 1, "Should return 1 follower")

  const follower = data.search.edges[0].node
  t.is(
    follower.address,
    t.context.nodeC.address,
    "Should return correct follower",
  )
  t.is(follower.title, t.context.nodeC.title, "Follower title should match")
})

test("Success: search NODE with type followees should return nodes being followed by self", async (t) => {
  const { graphqlClient } = t.context

  const query = `
    query SearchNodes($filterBy: JSON) {
      search(type: NODE, filterBy: $filterBy) {
        total
        edges {
          cursor
          node {
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
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `

  const { data, errors } = await graphqlClient.query(query, {
    variables: { filterBy: { type: "following" } },
  })

  t.falsy(errors, "Should not have any GraphQL errors")
  t.truthy(data.search, "Search result should exist")
  t.is(data.search.total, 1, "Should return 1 followee")

  const followee = data.search.edges[0].node
  t.is(
    followee.address,
    t.context.nodeB.address,
    "Should return correct followee",
  )
  t.is(followee.title, t.context.nodeB.title, "Followee title should match")
})

test("Success: search NODE should support sorting by created_at", async (t) => {
  const { graphqlClient } = t.context

  const query = `
    query SearchNodes($orderBy: String) {
      search(type: NODE, filterBy: { type: "followers" }, orderBy: $orderBy) {
        total
        edges {
          cursor
          node {
            ... on Node {
              address
              created_at
            }
          }
        }
      }
    }
  `

  const { data, errors } = await graphqlClient.query(query, {
    variables: { orderBy: "created_at" },
  })

  t.falsy(errors, "Should not have any GraphQL errors")
  t.truthy(data.search, "Search result should exist")
  t.true(data.search.total > 0, "Should return results")
})

test("Success: search NODE should support sorting by updated_at", async (t) => {
  const { graphqlClient } = t.context

  const query = `
    query SearchNodes($orderBy: String) {
      search(type: NODE, filterBy: { type: "followers" }, orderBy: $orderBy) {
        total
        edges {
          cursor
          node {
            ... on Node {
              address
              updated_at
            }
          }
        }
      }
    }
  `

  const { data, errors } = await graphqlClient.query(query, {
    variables: { orderBy: "-updated_at" },
  })

  t.falsy(errors, "Should not have any GraphQL errors")
  t.truthy(data.search, "Search result should exist")
  t.true(data.search.total > 0, "Should return results")
})

test("Success: search NODE should support pagination", async (t) => {
  const { graphqlClient } = t.context

  const query = `
    query SearchNodes($first: Int) {
      search(type: NODE, filterBy: { type: "followers" }, first: $first) {
        total
        edges {
          cursor
          node {
            ... on Node {
              address
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `

  const { data, errors } = await graphqlClient.query(query, {
    variables: { first: 1 },
  })

  t.falsy(errors, "Should not have any GraphQL errors")
  t.truthy(data.search, "Search result should exist")
  t.is(data.search.edges.length, 1, "Should return exactly 1 result")
  t.truthy(
    data.search.pageInfo.endCursor,
    "Should have endCursor for pagination",
  )
})

test("Error: search NODE without required type filter should fail", async (t) => {
  const { graphqlClient } = t.context

  const query = `
    query SearchNodes {
      search(type: NODE) {
        total
        edges {
          cursor
          node {
            ... on Node {
              address
            }
          }
        }
      }
    }
  `

  const { errors } = await graphqlClient.query(query)

  t.truthy(errors, "Should have GraphQL errors")
  t.true(
    errors.some((e) => e.message.includes("type")),
    "Should mention type requirement",
  )
})

// ==================== PUBLICATION Search Tests ====================

test("Success: search PUBLICATION (anonymous user) should return only self-authored publications", async (t) => {
  const { graphqlClient } = t.context

  const query = `
    query SearchPublications($filterBy: JSON) {
      search(type: PUBLICATION, filterBy: $filterBy) {
        total
        edges {
          cursor
          node {
            ... on Publication {
              content_hash
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
      }
    }
  `

  const { data, errors } = await graphqlClient.query(query, {
    variables: { filterBy: {} },
  })

  t.falsy(errors, "Should not have any GraphQL errors")
  t.truthy(data.search, "Search result should exist")

  // Anonymous users can only see their own publications (including signed and unsigned)
  const publications = data.search.edges.map((edge) => edge.node)
  t.true(publications.length >= 2, "Should return at least 2 publications")

  // Verify all returned publications are own
  for (const pub of publications) {
    t.is(
      pub.author.address,
      TEST_ETHEREUM_ADDRESS_NODE_A,
      "All publications should be self-authored",
    )
  }
})

test("Success: search PUBLICATION should support filtering by type", async (t) => {
  const { graphqlClient } = t.context

  const query = `
    query SearchPublications($filterBy: JSON) {
      search(type: PUBLICATION, filterBy: $filterBy) {
        total
        edges {
          cursor
          node {
            ... on Publication {
              content_hash
              signature
              comment_count
            }
          }
        }
      }
    }
  `

  const { data, errors } = await graphqlClient.query(query, {
    variables: { filterBy: { type: "POST" } },
  })

  t.falsy(errors, "Should not have any GraphQL errors")
  t.truthy(data.search, "Search result should exist")
  t.true(data.search.total >= 0, "Should return results or empty set")
})

test("Success: search PUBLICATION should support filtering by isSigned=true", async (t) => {
  const { graphqlClient } = t.context

  const query = `
    query SearchPublications($filterBy: JSON) {
      search(type: PUBLICATION, filterBy: $filterBy) {
        total
        edges {
          cursor
          node {
            ... on Publication {
              content_hash
              signature
              comment_count
            }
          }
        }
      }
    }
  `

  const { data, errors } = await graphqlClient.query(query, {
    variables: { filterBy: { isSigned: true } },
  })

  t.falsy(errors, "Should not have any GraphQL errors")
  t.truthy(data.search, "Search result should exist")

  // Verify all returned publications have signatures
  const publications = data.search.edges.map((edge) => edge.node)
  for (const pub of publications) {
    t.truthy(pub.signature, "All returned publications should be signed")
  }
})

test("Success: search PUBLICATION should support filtering by isSigned=false", async (t) => {
  const { graphqlClient } = t.context

  const query = `
    query SearchPublications($filterBy: JSON) {
      search(type: PUBLICATION, filterBy: $filterBy) {
        total
        edges {
          cursor
          node {
            ... on Publication {
              content_hash
              signature
              comment_count
            }
          }
        }
      }
    }
  `

  const { data, errors } = await graphqlClient.query(query, {
    variables: { filterBy: { isSigned: false } },
  })

  t.falsy(errors, "Should not have any GraphQL errors")
  t.truthy(data.search, "Search result should exist")

  // Verify all returned publications have no signatures (only own unsigned publications)
  const publications = data.search.edges.map((edge) => edge.node)
  for (const pub of publications) {
    t.falsy(pub.signature, "All returned publications should be unsigned")
  }

  // Should only return own unsigned publications
  t.true(
    publications.length >= 1,
    "Should return at least 1 unsigned publication",
  )
})

test("Success: search PUBLICATION should support filtering by content_hash", async (t) => {
  const { graphqlClient } = t.context

  const query = `
    query SearchPublications($filterBy: JSON) {
      search(type: PUBLICATION, filterBy: $filterBy) {
        total
        edges {
          cursor
          node {
            ... on Publication {
              content_hash
              signature
              comment_count
            }
          }
        }
      }
    }
  `

  const { data, errors } = await graphqlClient.query(query, {
    variables: {
      filterBy: { content_hash: t.context.publicationSigned.content_hash },
    },
  })

  t.falsy(errors, "Should not have any GraphQL errors")
  t.truthy(data.search, "Search result should exist")
  t.is(data.search.total, 1, "Should return exactly 1 publication")
  t.is(
    data.search.edges[0].node.content_hash,
    t.context.publicationSigned.content_hash,
    "Should return correct publication",
  )
})

test("Success: search PUBLICATION should support sorting by created_at", async (t) => {
  const { graphqlClient } = t.context

  const query = `
    query SearchPublications($orderBy: String) {
      search(type: PUBLICATION, orderBy: $orderBy) {
        total
        edges {
          cursor
          node {
            ... on Publication {
              content_hash
              created_at
            }
          }
        }
      }
    }
  `

  const { data, errors } = await graphqlClient.query(query, {
    variables: { orderBy: "-created_at" },
  })

  t.falsy(errors, "Should not have any GraphQL errors")
  t.truthy(data.search, "Search result should exist")
  t.true(data.search.total > 0, "Should return results")
})

test("Success: search PUBLICATION should support sorting by updated_at", async (t) => {
  const { graphqlClient } = t.context

  const query = `
    query SearchPublications($orderBy: String) {
      search(type: PUBLICATION, orderBy: $orderBy) {
        total
        edges {
          cursor
          node {
            ... on Publication {
              content_hash
              updated_at
            }
          }
        }
      }
    }
  `

  const { data, errors } = await graphqlClient.query(query, {
    variables: { orderBy: "updated_at" },
  })

  t.falsy(errors, "Should not have any GraphQL errors")
  t.truthy(data.search, "Search result should exist")
  t.true(data.search.total > 0, "Should return results")
})

test("Success: search PUBLICATION should support pagination", async (t) => {
  const { graphqlClient } = t.context

  const query = `
    query SearchPublications($first: Int) {
      search(type: PUBLICATION, first: $first) {
        total
        edges {
          cursor
          node {
            ... on Publication {
              content_hash
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `

  const { data, errors } = await graphqlClient.query(query, {
    variables: { first: 2 },
  })

  t.falsy(errors, "Should not have any GraphQL errors")
  t.truthy(data.search, "Search result should exist")
  t.true(data.search.edges.length <= 2, "Should return at most 2 results")
  t.truthy(
    data.search.pageInfo.endCursor,
    "Should have endCursor for pagination",
  )
})

// ==================== COMMENT Search Tests ====================

test("Success: search COMMENT should return comments for specified publication", async (t) => {
  const { graphqlClient } = t.context

  const query = `
    query SearchComments($filterBy: JSON) {
      search(type: COMMENT, filterBy: $filterBy) {
        total
        edges {
          cursor
          node {
            ... on Comment {
              body
              status
              auth_type
              author_name
              author_id
              created_at
              updated_at
              publication {
                content_hash
              }
            }
          }
        }
      }
    }
  `

  const { data, errors } = await graphqlClient.query(query, {
    variables: { filterBy: { publication_id: t.context.publicationSigned.id } },
  })

  t.falsy(errors, "Should not have any GraphQL errors")
  t.truthy(data.search, "Search result should exist")
  t.is(data.search.total, 2, "Should return 2 comments")

  const comments = data.search.edges.map((edge) => edge.node)
  t.true(
    comments.some((c) => c.author_name === "testuser"),
    "Should include email comment",
  )
  t.true(
    comments.some((c) => c.author_name === "cryptouser"),
    "Should include ethereum comment",
  )
})

test("Success: search COMMENT should support filtering by author_name", async (t) => {
  const { graphqlClient } = t.context

  const query = `
    query SearchComments($filterBy: JSON) {
      search(type: COMMENT, filterBy: $filterBy) {
        total
        edges {
          cursor
          node {
            ... on Comment {
              body
              author_name
              auth_type
            }
          }
        }
      }
    }
  `

  const { data, errors } = await graphqlClient.query(query, {
    variables: {
      filterBy: {
        publication_id: t.context.publicationSigned.id,
        author_name: "testuser",
      },
    },
  })

  t.falsy(errors, "Should not have any GraphQL errors")
  t.truthy(data.search, "Search result should exist")
  t.is(data.search.total, 1, "Should return exactly 1 comment")
  t.is(
    data.search.edges[0].node.author_name,
    "testuser",
    "Should return correct comment",
  )
})

test("Success: search COMMENT should support sorting by created_at", async (t) => {
  const { graphqlClient } = t.context

  const query = `
    query SearchComments($orderBy: String, $filterBy: JSON) {
      search(type: COMMENT, filterBy: $filterBy, orderBy: $orderBy) {
        total
        edges {
          cursor
          node {
            ... on Comment {
              body
              created_at
            }
          }
        }
      }
    }
  `

  const { data, errors } = await graphqlClient.query(query, {
    variables: {
      orderBy: "created_at",
      filterBy: {
        publication_id: t.context.publicationSigned.id,
      },
    },
  })

  t.falsy(errors, "Should not have any GraphQL errors")
  t.truthy(data.search, "Search result should exist")
  t.true(data.search.total > 0, "Should return results")
})

test("Success: search COMMENT should support sorting by updated_at", async (t) => {
  const { graphqlClient } = t.context

  const query = `
    query SearchComments($orderBy: String, $filterBy: JSON) {
      search(type: COMMENT, filterBy: $filterBy, orderBy: $orderBy) {
        total
        edges {
          cursor
          node {
            ... on Comment {
              body
              updated_at
            }
          }
        }
      }
    }
  `

  const { data, errors } = await graphqlClient.query(query, {
    variables: {
      orderBy: "-updated_at",
      filterBy: {
        publication_id: t.context.publicationSigned.id,
      },
    },
  })

  t.falsy(errors, "Should not have any GraphQL errors")
  t.truthy(data.search, "Search result should exist")
  t.true(data.search.total > 0, "Should return results")
})

test("Success: search COMMENT should support pagination", async (t) => {
  const { graphqlClient } = t.context

  const query = `
    query SearchComments($first: Int, $filterBy: JSON) {
      search(type: COMMENT, filterBy: $filterBy, first: $first) {
        total
        edges {
          cursor
          node {
            ... on Comment {
              body
              author_name
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `

  const { data, errors } = await graphqlClient.query(query, {
    variables: {
      first: 1,
      filterBy: {
        publication_id: t.context.publicationSigned.id,
      },
    },
  })

  t.falsy(errors, "Should not have any GraphQL errors")
  t.truthy(data.search, "Search result should exist")
  t.is(data.search.edges.length, 1, "Should return exactly 1 result")
  t.truthy(
    data.search.pageInfo.endCursor,
    "Should have endCursor for pagination",
  )
})

test("Error: search COMMENT without required publication_id should fail", async (t) => {
  const { graphqlClient } = t.context

  const query = `
    query SearchComments {
      search(type: COMMENT) {
        total
        edges {
          cursor
          node {
            ... on Comment {
              body
            }
          }
        }
      }
    }
  `

  const { errors } = await graphqlClient.query(query)

  t.truthy(errors, "Should have GraphQL errors")
  t.true(
    errors.some((e) => e.message.includes("publication_id")),
    "Should mention publication_id requirement",
  )
})

// ==================== General Search Functionality Tests ====================

test("Success: search should support empty filterBy", async (t) => {
  const { graphqlClient } = t.context

  const query = `
    query SearchPublications {
      search(type: PUBLICATION) {
        total
        edges {
          cursor
          node {
            ... on Publication {
              content_hash
            }
          }
        }
      }
    }
  `

  const { data, errors } = await graphqlClient.query(query)

  t.falsy(errors, "Should not have any GraphQL errors")
  t.truthy(data.search, "Search result should exist")
  t.true(data.search.total >= 0, "Should return results or empty set")
})

test.serial(
  "Success: search should support after cursor for pagination",
  async (t) => {
    const { graphqlClient } = t.context

    // First get the first page
    const firstPageQuery = `
    query SearchPublications($first: Int) {
      search(type: PUBLICATION, first: $first) {
        total
        edges {
          cursor
          node {
            ... on Publication {
              content_hash
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `

    const firstPageResult = await graphqlClient.query(firstPageQuery, {
      variables: { first: 1 },
    })
    t.falsy(firstPageResult.errors, "First page should not have errors")

    if (firstPageResult.data.search.pageInfo.hasNextPage) {
      // Use cursor to get second page
      const secondPageQuery = `
      query SearchPublications($first: Int, $after: String) {
        search(type: PUBLICATION, first: $first, after: $after) {
          total
          edges {
            cursor
            node {
              ... on Publication {
                content_hash
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `

      const secondPageResult = await graphqlClient.query(secondPageQuery, {
        variables: {
          first: 1,
          after: firstPageResult.data.search.pageInfo.endCursor,
        },
      })
      t.falsy(secondPageResult.errors, "Second page should not have errors")
      t.truthy(secondPageResult.data.search, "Second page should exist")
      t.true(
        secondPageResult.data.search.edges.length > 0,
        "Second page should have results",
      )
    }
  },
)

// ==================== Edge Case Tests ====================

test("Success: search with negative first should handle gracefully", async (t) => {
  const { graphqlClient } = t.context

  const query = `
    query SearchPublications($first: Int) {
      search(type: PUBLICATION, first: $first) {
        total
        edges {
          cursor
          node {
            ... on Publication {
              content_hash
            }
          }
        }
      }
    }
  `

  const { data, errors } = await graphqlClient.query(query, {
    variables: { first: -1 },
  })

  t.falsy(errors, "Should not have any GraphQL errors")
  t.truthy(data.search, "Search result should exist")
  t.true(data.search.total >= 0, "Should return results or empty set")
})

test("Success: search with very large first should handle gracefully", async (t) => {
  const { graphqlClient } = t.context

  const query = `
    query SearchPublications($first: Int) {
      search(type: PUBLICATION, first: $first) {
        total
        edges {
          cursor
          node {
            ... on Publication {
              content_hash
            }
          }
        }
      }
    }
  `

  const { data, errors } = await graphqlClient.query(query, {
    variables: { first: 10000 },
  })

  t.falsy(errors, "Should not have any GraphQL errors")
  t.truthy(data.search, "Search result should exist")
  t.true(data.search.total >= 0, "Should return results or empty set")
  t.true(
    data.search.edges.length <= 10000,
    "Should not return more than requested",
  )
})

// Test integration token permissions for search
test("Success: search PUBLICATION with integration token should return all publications", async (t) => {
  const { graphqlClient } = t.context

  // 先插入一个非本节点的发布内容用于测试
  const otherNodeContent = await Content.create({
    type: "POST",
    body: `Other node content for search test ${Date.now()}`,
  })

  const _otherNodePublication = await Publication.query().insert({
    content_hash: otherNodeContent.content_hash,
    author_address: t.context.nodeB.address,
    signature: `0x${Math.random().toString(16).substr(2, 130)}`,
  })

  // 使用 integration token 搜索发布内容
  const integrationToken = t.context.createIntegrationJwt([
    "search:publications",
  ])

  const query = `
    query SearchPublications($first: Int) {
      search(type: PUBLICATION, first: $first) {
        total
        edges {
          node {
            ... on Publication {
              content {
                body
              }
              author {
                address
              }
            }
          }
        }
      }
    }
  `

  const { data, errors } = await graphqlClient.query(query, {
    variables: { first: 10 },
    headers: { Authorization: `Bearer ${integrationToken}` },
  })

  t.falsy(errors, "Should not have any GraphQL errors")
  t.truthy(data.search, "Search result should exist")
  t.true(data.search.total >= 0, "Should return results or empty set")

  // 验证返回的数据包含其他节点的发布内容
  const nodeAddresses = data.search.edges.map(
    (edge) => edge.node.author.address,
  )
  t.true(
    nodeAddresses.includes(TEST_NODE_B.address),
    "Should include other node publications",
  )
})

test("Success: search COMMENT with integration token should return all comments", async (t) => {
  const { graphqlClient } = t.context

  // 先插入一个非本节点的发布内容和评论用于测试
  const otherNodeContent = await Content.create({
    type: "POST",
    body: `Other node content for comment search test ${Date.now()}`,
  })

  const otherNodePublication = await Publication.query().insert({
    content_hash: otherNodeContent.content_hash,
    author_address: t.context.nodeB.address,
    signature: `0x${Math.random().toString(16).substr(2, 130)}`,
  })

  const _otherNodeComment = await Comment.query().insert({
    publication_id: otherNodePublication.id,
    body: `Other node comment for search test ${Date.now()}`,
    author_name: "other_user",
    author_id: "other@example.com",
    auth_type: "EMAIL",
    status: "PENDING", // 未确认状态，只有 integration token 才能看到
  })

  // 使用 integration token 搜索评论
  const integrationToken = t.context.createIntegrationJwt(["search:comments"])

  const query = `
    query SearchComments($first: Int, $publicationId: ID!) {
      search(type: COMMENT, first: $first, filterBy: { publication_id: $publicationId }) {
        total
        edges {
          node {
            ... on Comment {
              body
              status
              author_name
            }
          }
        }
      }
    }
  `

  const { data, errors } = await graphqlClient.query(query, {
    variables: {
      first: 10,
      publicationId: otherNodePublication.id.toString(),
    },
    headers: { Authorization: `Bearer ${integrationToken}` },
  })

  t.falsy(errors, "Should not have any GraphQL errors")
  t.truthy(data.search, "Search result should exist")
  t.true(data.search.total >= 0, "Should return results or empty set")

  // 验证返回的数据包含未确认状态的评论
  const statuses = data.search.edges.map((edge) => edge.node.status)
  t.true(
    statuses.includes("PENDING"),
    "Should include pending comments with integration token",
  )
})

test("Success: search PUBLICATION without token should return only self-authored publications", async (t) => {
  const { graphqlClient } = t.context

  // 不使用 token 搜索发布内容（游客模式）
  const query = `
    query SearchPublications($first: Int) {
      search(type: PUBLICATION, first: $first) {
        total
        edges {
          node {
            ... on Publication {
              content {
                body
              }
              author {
                address
              }
            }
          }
        }
      }
    }
  `

  const { data, errors } = await graphqlClient.query(query, {
    variables: { first: 10 },
    // 不传递 Authorization header
  })

  t.falsy(errors, "Should not have any GraphQL errors")
  t.truthy(data.search, "Search result should exist")
  t.true(data.search.total >= 0, "Should return results or empty set")

  // 验证返回的数据只包含自己节点的发布内容
  if (data.search.edges.length > 0) {
    const nodeAddress = TEST_ETHEREUM_ADDRESS_NODE_A
    data.search.edges.forEach((edge) => {
      t.is(
        edge.node.author.address,
        nodeAddress,
        "Should only return self-authored publications",
      )
    })
  }
})

test("Success: search COMMENT without token should return only confirmed comments", async (t) => {
  const { graphqlClient } = t.context

  // 不使用 token 搜索评论（游客模式）
  const query = `
    query SearchComments($first: Int) {
      search(type: COMMENT, first: $first, filterBy: { publication_id: "1" }) {
        total
        edges {
          node {
            ... on Comment {
              body
              status
              author_name
            }
          }
        }
      }
    }
  `

  const { data, errors } = await graphqlClient.query(query, {
    variables: { first: 10 },
    // 不传递 Authorization header
  })

  t.falsy(errors, "Should not have any GraphQL errors")
  t.truthy(data.search, "Search result should exist")
  t.true(data.search.total >= 0, "Should return results or empty set")

  // 验证返回的数据只包含已确认的评论
  if (data.search.edges.length > 0) {
    data.search.edges.forEach((edge) => {
      t.is(
        edge.node.status,
        "CONFIRMED",
        "Should only return confirmed comments",
      )
    })
  }
})
