import test from "ava"
import { Connection, Node } from "../../server/models/index.mjs"
import { generateTestAccount } from "../setup.mjs"

// Clean up environment before each test
test.serial.beforeEach(async () => {
  await Connection.query().delete()
  await Node.query().where({ is_self: false }).delete()
})

// Test case 1: Visitor is a follower (visitor -> self)
test.serial(
  "visitor: Should return isFollower=true when visitor follows self",
  async (t) => {
    const { graphqlClient } = t.context

    // Create visitor node
    const visitorAccount = await generateTestAccount()
    const visitorNode = await Node.query().insert({
      address: visitorAccount.address,
      url: "https://visitor.com",
      title: "Visitor Node",
      description: "Test visitor",
      is_self: false,
      profile_version: 0,
    })

    // Get self node
    const selfNode = await Node.query().findOne({ is_self: true })

    // Create connection: visitor -> self
    await Connection.query().insert({
      follower_address: visitorNode.address,
      followee_address: selfNode.address,
    })

    const query = `
    query Visitor($address: String!) {
      visitor(address: $address) {
        isFollower
        isFollowing
        node {
          address
          title
        }
      }
    }
  `
    const variables = { address: visitorAccount.address }
    const { data, errors } = await graphqlClient.query(query, { variables })

    t.falsy(errors, "Should not return any GraphQL errors")
    t.truthy(data.visitor)
    t.true(data.visitor.isFollower, "Should be a follower")
    t.false(data.visitor.isFollowing, "Should not be following")
    t.is(data.visitor.node.address, visitorNode.address)
  },
)

// Test case 2: Visitor is being followed (self -> visitor)
test.serial(
  "visitor: Should return isFollowing=true when self follows visitor",
  async (t) => {
    const { graphqlClient } = t.context

    // Create visitor node
    const visitorAccount = await generateTestAccount()
    const visitorNode = await Node.query().insert({
      address: visitorAccount.address,
      url: "https://visitor.com",
      title: "Visitor Node",
      description: "Test visitor",
      is_self: false,
      profile_version: 0,
    })

    // Get self node
    const selfNode = await Node.query().findOne({ is_self: true })

    // Create connection: self -> visitor
    await Connection.query().insert({
      follower_address: selfNode.address,
      followee_address: visitorNode.address,
    })

    const query = `
    query Visitor($address: String!) {
      visitor(address: $address) {
        isFollower
        isFollowing
        node {
          address
          title
        }
      }
    }
  `
    const variables = { address: visitorAccount.address }
    const { data, errors } = await graphqlClient.query(query, { variables })

    t.falsy(errors, "Should not return any GraphQL errors")
    t.truthy(data.visitor)
    t.false(data.visitor.isFollower, "Should not be a follower")
    t.true(data.visitor.isFollowing, "Should be following")
    t.is(data.visitor.node.address, visitorNode.address)
  },
)

// Test case 3: Mutual following relationship
test.serial(
  "visitor: Should return both true when mutual following exists",
  async (t) => {
    const { graphqlClient } = t.context

    // Create visitor node
    const visitorAccount = await generateTestAccount()
    const visitorNode = await Node.query().insert({
      address: visitorAccount.address,
      url: "https://visitor.com",
      title: "Visitor Node",
      description: "Test visitor",
      is_self: false,
      profile_version: 0,
    })

    // Get self node
    const selfNode = await Node.query().findOne({ is_self: true })

    // Create mutual connections
    await Connection.query().insert({
      follower_address: visitorNode.address,
      followee_address: selfNode.address,
    })
    await Connection.query().insert({
      follower_address: selfNode.address,
      followee_address: visitorNode.address,
    })

    const query = `
    query Visitor($address: String!) {
      visitor(address: $address) {
        isFollower
        isFollowing
        node {
          address
        }
      }
    }
  `
    const variables = { address: visitorAccount.address }
    const { data, errors } = await graphqlClient.query(query, { variables })

    t.falsy(errors, "Should not return any GraphQL errors")
    t.true(data.visitor.isFollower, "Should be a follower")
    t.true(data.visitor.isFollowing, "Should be following")
  },
)

// Test case 4: Visitor node does not exist
test.serial(
  "visitor: Should return false values when visitor node does not exist",
  async (t) => {
    const { graphqlClient } = t.context

    const visitorAccount = await generateTestAccount()

    const query = `
    query Visitor($address: String!) {
      visitor(address: $address) {
        isFollower
        isFollowing
        node {
          address
        }
      }
    }
  `
    const variables = { address: visitorAccount.address }
    const { data, errors } = await graphqlClient.query(query, { variables })

    t.falsy(errors, "Should not return any GraphQL errors")
    t.truthy(data.visitor)
    t.false(data.visitor.isFollower, "Should not be a follower")
    t.false(data.visitor.isFollowing, "Should not be following")
    t.is(data.visitor.node, null, "Node should be null")
  },
)

// Test case 5: No connection exists but node exists
test.serial(
  "visitor: Should return false values when no connection exists",
  async (t) => {
    const { graphqlClient } = t.context

    // Create visitor node without any connections
    const visitorAccount = await generateTestAccount()
    await Node.query().insert({
      address: visitorAccount.address,
      url: "https://visitor.com",
      title: "Visitor Node",
      description: "Test visitor",
      is_self: false,
      profile_version: 0,
    })

    const query = `
    query Visitor($address: String!) {
      visitor(address: $address) {
        isFollower
        isFollowing
        node {
          address
          title
        }
      }
    }
  `
    const variables = { address: visitorAccount.address }
    const { data, errors } = await graphqlClient.query(query, { variables })

    t.falsy(errors, "Should not return any GraphQL errors")
    t.false(data.visitor.isFollower, "Should not be a follower")
    t.false(data.visitor.isFollowing, "Should not be following")
    t.truthy(data.visitor.node, "Node should exist")
  },
)

// Test case 6: Invalid address format should return false values
test.serial(
  "visitor: Should handle invalid address format gracefully",
  async (t) => {
    const { graphqlClient } = t.context

    const query = `
    query Visitor($address: String!) {
      visitor(address: $address) {
        isFollower
        isFollowing
        node {
          address
        }
      }
    }
  `
    const variables = { address: "invalid-address" }
    const { data, errors } = await graphqlClient.query(query, { variables })

    t.falsy(errors, "Should not return GraphQL errors")
    t.truthy(data.visitor)
    t.false(data.visitor.isFollower, "Should return false for invalid address")
    t.false(data.visitor.isFollowing, "Should return false for invalid address")
    t.is(data.visitor.node, null, "Node should be null for invalid address")
  },
)

// Test case 7: Mixed case address should be normalized
test.serial("visitor: Should normalize address case correctly", async (t) => {
  const { graphqlClient } = t.context

  // Create visitor node with checksum address
  const visitorAccount = await generateTestAccount()
  const visitorNode = await Node.query().insert({
    address: visitorAccount.address,
    url: "https://visitor.com",
    title: "Visitor Node",
    description: "Test visitor",
    is_self: false,
    profile_version: 0,
  })

  // Get self node
  const selfNode = await Node.query().findOne({ is_self: true })

  // Create connection
  await Connection.query().insert({
    follower_address: visitorNode.address,
    followee_address: selfNode.address,
  })

  const query = `
    query Visitor($address: String!) {
      visitor(address: $address) {
        isFollower
        isFollowing
        node {
          address
        }
      }
    }
  `
  // Use lowercase address
  const variables = { address: visitorAccount.address.toLowerCase() }
  const { data, errors } = await graphqlClient.query(query, { variables })

  t.falsy(errors, "Should not return any GraphQL errors")
  t.true(
    data.visitor.isFollower,
    "Should find connection with normalized address",
  )
})
