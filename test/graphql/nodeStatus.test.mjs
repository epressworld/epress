import test from "ava"
import "../setup.mjs" // Import for side effects (global hooks)
import pkg from "../../package.json" with { type: "json" }

test("should return the node status with version and startedAt", async (t) => {
  const { graphqlClient } = t.context // Get graphqlClient from global context
  const query = `
    query {
      nodeStatus {
        version
        startedAt
      }
    }
  `

  const response = await graphqlClient.query(query) // Use graphqlClient

  t.falsy(response.errors, "Should not have any GraphQL errors") // Check for GraphQL errors
  t.truthy(response.data.nodeStatus)
  t.is(response.data.nodeStatus.version, pkg.version)
  t.truthy(response.data.nodeStatus.startedAt)
  t.false(Number.isNaN(new Date(response.data.nodeStatus.startedAt).getTime()))
})
