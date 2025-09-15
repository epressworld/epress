import { graphql } from "swiftify"
import pkg from "../../../package.json" with { type: "json" }

// Helper to read package.json

// Define the GraphQL Type
const NodeStatusType = graphql.type("ObjectType", {
  name: "NodeStatus",
  fields: {
    version: { type: graphql.type("NonNull", graphql.type("String")) },
    startedAt: { type: graphql.type("NonNull", graphql.type("String")) },
  },
})

const nodeStatusQuery = {
  nodeStatus: {
    type: NodeStatusType,
    description: "Retrieves the technical status of the current node.",
    async resolve(_root, _args, context) {
      const { app } = context

      // 1. Get version from package.json
      const version = pkg.version

      // 2. Get startedAt from the decorated server instance
      const startedAt = app.serverStartedAt.toISOString()

      return {
        version,
        startedAt,
      }
    },
  },
}

export { NodeStatusType, nodeStatusQuery }
