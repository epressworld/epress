// test/graphql/suggestion.test.mjs
import test from "ava"
import { Hashtag } from "../../server/models/index.mjs"
import "../setup.mjs"

test("suggestions query should return mention suggestions", async (t) => {
  const { graphqlClient } = t.context

  const query = `
    query GetSuggestions($query: String!, $type: String!) {
      suggestions(query: $query, type: $type, limit:10) {
        id
        label
        type
        address
        url
      }
    }
  `

  const variables = {
    query: "test",
    type: "mention",
  }

  const { data, errors } = await graphqlClient.query(query, {
    variables,
  })

  t.falsy(errors, "Should not have any GraphQL errors")
  t.truthy(data.suggestions, "Suggestions data should exist")
  t.true(Array.isArray(data.suggestions), "Suggestions should be an array")
  t.true(data.suggestions.length > 0, "Should return at least one suggestion")

  const firstSuggestion = data.suggestions[0]
  t.is(firstSuggestion.type, "mention", "Type should be mention")
  t.truthy(firstSuggestion.address, "Should have address")
  t.truthy(firstSuggestion.url, "Should have url")
  t.truthy(firstSuggestion.label, "Should have label")
})

test("suggestions query should return hashtag suggestions", async (t) => {
  await Hashtag.query().insert({ hashtag: "test" })
  await Hashtag.query().insert({ hashtag: "technology" })
  await Hashtag.query().insert({ hashtag: "testing" })
  const { graphqlClient } = t.context

  const query = `
    query GetSuggestions($query: String!, $type: String!) {
      suggestions(query: $query, type: $type, limit:10) {
        id
        label
        type
        hashtag
      }
    }
  `

  const variables = {
    query: "tech",
    type: "hashtag",
  }

  const { data, errors } = await graphqlClient.query(query, {
    variables,
  })

  t.falsy(errors, "Should not have any GraphQL errors")
  t.truthy(data.suggestions, "Suggestions data should exist")
  t.true(Array.isArray(data.suggestions), "Suggestions should be an array")
  t.true(data.suggestions.length > 0, "Should return at least one suggestion")

  const firstSuggestion = data.suggestions[0]
  t.is(firstSuggestion.type, "hashtag", "Type should be hashtag")
  t.truthy(firstSuggestion.hashtag, "Should have hashtag")
  t.true(firstSuggestion.label.startsWith("#"), "Label should start with #")
})

test("suggestions query should handle empty results", async (t) => {
  const { graphqlClient } = t.context

  const query = `
    query GetSuggestions($query: String!, $type: String!) {
      suggestions(query: $query, type: $type, limit:10) {
        id
        label
        type
      }
    }
  `

  const variables = {
    query: "nonexistentquerythatdoesnotmatch",
    type: "mention",
  }

  const { data, errors } = await graphqlClient.query(query, {
    variables,
  })

  t.falsy(errors, "Should not have any GraphQL errors")
  t.truthy(data.suggestions, "Suggestions data should exist")
  t.true(Array.isArray(data.suggestions), "Suggestions should be an array")
  t.is(data.suggestions.length, 0, "Should return empty array")
})

test("suggestions query should respect limit parameter", async (t) => {
  const { graphqlClient } = t.context

  const query = `
    query GetSuggestions($query: String!, $type: String!) {
      suggestions(query: $query, type: $type, limit:1) {
        id
        label
        type
      }
    }
  `

  const variables = {
    query: "test",
    type: "hashtag",
  }

  const { data, errors } = await graphqlClient.query(query, {
    variables,
  })

  t.falsy(errors, "Should not have any GraphQL errors")
  t.truthy(data.suggestions, "Suggestions data should exist")
  t.true(data.suggestions.length <= 1, "Should respect limit parameter")
})

test("suggestions query should return error for invalid type", async (t) => {
  const { graphqlClient } = t.context

  const query = `
    query GetSuggestions($query: String!, $type: String!) {
      suggestions(query: $query, type: $type, limit:10) {
        id
        label
        type
      }
    }
  `

  const variables = {
    query: "test",
    type: "invalid_type",
    limit: 10,
  }

  const { data, errors } = await graphqlClient.query(query, {
    variables,
  })

  t.truthy(errors, "Should return GraphQL errors")
  t.is(data, null, "Data should be null")
  t.true(
    errors.some((e) => e.message.includes("Invalid suggestion type")),
    "Error message should indicate invalid type",
  )
})
