import { graphql } from "swiftify"

// Define the GraphQL Profile type manually, as it's a subset of the Node model
const ProfileType = graphql.type("ObjectType", {
  name: "Profile",
  fields: {
    address: { type: graphql.type("NonNull", graphql.type("String")) },
    url: { type: graphql.type("NonNull", graphql.type("String")) },
    title: { type: graphql.type("String") },
    description: { type: graphql.type("String") },
    created_at: { type: graphql.type("NonNull", graphql.type("String")) },
    updated_at: { type: graphql.type("NonNull", graphql.type("String")) },
  },
})

// Define the query resolver for 'profile'
const profileQuery = {
  profile: {
    type: ProfileType, // Use the newly defined ProfileType
    resolve: async (_parent, _args, context) => {
      const { request } = context

      request.log.debug("Fetching profile")

      const node = await request.config.getSelfNode()

      if (!node) {
        request.log.error("Self node not found")
        throw new Error("Self node not configured")
      }

      request.log.debug(
        {
          address: node.address,
          created_at: node.created_at,
          updated_at: node.updated_at,
        },
        "Profile fetched successfully",
      )

      return {
        address: node.address,
        url: node.url,
        title: node.title,
        description: node.description,
        created_at: new Date(node.created_at).toISOString(),
        updated_at: new Date(node.updated_at).toISOString(),
      }
    },
  },
}

export { ProfileType, profileQuery }
