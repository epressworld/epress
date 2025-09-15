import { graphql } from "swiftify"
import { types as commentTypes } from "./mutations/comment.mjs"
import mutations from "./mutations/index.mjs"
import { UpdateProfileInput } from "./mutations/profile.mjs"
import { types as publicationTypes } from "./mutations/publication.mjs"
import queries from "./queries/index.mjs"
import { NodeStatusType } from "./queries/nodeStatus.mjs"
import { ProfileType } from "./queries/profile.mjs"
import { SettingsType } from "./queries/settings.mjs"

const { plugin, Loader, type } = graphql

export default function () {
  return plugin({
    graphiql: true,
    path: "/api/graphql",
    allowBatchedQueries: true,
    context: async (request, reply) => {
      // request.user is already populated by the preHandler hook
      return { loader: new Loader(), request, reply, user: request.user }
    },
    schema: type("Schema", {
      query: type("ObjectType", {
        name: "Query",
        fields: queries,
      }),
      mutation: type("ObjectType", {
        name: "Mutation",
        fields: mutations,
      }),
    }),
    types: [
      NodeStatusType,
      ProfileType,
      SettingsType,
      UpdateProfileInput,
      ...publicationTypes,
      ...commentTypes,
    ],
  })
}
