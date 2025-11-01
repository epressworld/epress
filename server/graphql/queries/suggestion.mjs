import mercurius from "mercurius"
import { graphql } from "swiftify"
import { Hashtag, Node } from "../../models/index.mjs"

const { ErrorWithProps } = mercurius

// 定义 Suggestion 类型
const SuggestionType = graphql.type("ObjectType", {
  name: "Suggestion",
  fields: {
    id: { type: graphql.type("NonNull", graphql.type("String")) },
    label: { type: graphql.type("NonNull", graphql.type("String")) },
    type: { type: graphql.type("NonNull", graphql.type("String")) }, // 'mention' or 'hashtag'
    // For mentions
    address: { type: graphql.type("String") },
    url: { type: graphql.type("String") },
    // For hashtags
    hashtag: { type: graphql.type("String") },
  },
})

// 定义 'suggestions' 查询的解析器
const suggestionsQuery = {
  suggestions: {
    type: graphql.type("NonNull", graphql.type("List", SuggestionType)),
    args: {
      query: { type: graphql.type("String") },
      type: { type: graphql.type("NonNull", graphql.type("String")) }, // 'mention' or 'hashtag'
      limit: { type: graphql.type("Int") }, // 可选，默认 10
    },
    resolve: async (_parent, args, context) => {
      const { request } = context
      const { query, type, limit = 10 } = args

      request.log.debug({ query, type, limit }, "Fetching suggestions")

      try {
        if (type === "mention") {
          // 查询节点
          const nodes = await Node.query()
            .where((builder) => {
              if (query) {
                builder
                  .whereRaw("LOWER(title) LIKE ?", [`%${query.toLowerCase()}%`])
                  .orWhereRaw("LOWER(address) LIKE ?", [
                    `%${query.toLowerCase()}%`,
                  ])
              }
            })
            .limit(limit)
            .orderBy("title", "asc")

          return nodes.map((node) => ({
            id: node.address,
            label: node.title,
            type: "mention",
            address: node.address,
            url: node.url,
          }))
        } else if (type === "hashtag") {
          // 查询话题标签
          const hashtags = await Hashtag.query()
            .where((builder) => {
              if (query) {
                builder.whereRaw("LOWER(hashtag) LIKE ?", [
                  `%${query.toLowerCase()}%`,
                ])
              }
            })
            .limit(limit)
            .orderBy("hashtag", "asc")

          return hashtags.map((tag) => ({
            id: tag.id.toString(),
            label: `#${tag.hashtag}`,
            type: "hashtag",
            hashtag: tag.hashtag,
          }))
        } else {
          throw new ErrorWithProps(`Invalid suggestion type: ${type}`, {
            code: "INVALID_SUGGESITION_TYPE",
          })
        }
      } catch (error) {
        request.log.error({ error }, "Error fetching suggestions")
        throw error
      }
    },
  },
}

export { SuggestionType, suggestionsQuery }
