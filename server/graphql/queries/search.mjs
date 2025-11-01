import mercurius from "mercurius"
import { graphql } from "swiftify"
import { Comment, Node, Publication } from "../../models/index.mjs"

const { ErrorWithProps } = mercurius

export const searchQuery = {
  search: graphql.presets.search({
    NODE: {
      model: Node,
      compose: (search) => async (root, args, ctx, info) => {
        const { request } = ctx

        request.log.debug(
          {
            type: args?.filterBy?.type,
            user: ctx.user?.sub,
          },
          "Searching nodes",
        )

        const query = Node.query()
        const owner = await Node.query().findOne({ is_self: true })
        if (!args?.filterBy?.type) {
          throw new ErrorWithProps("type is required", {
            code: "INVALID_QUERY",
          })
        }
        if (args.filterBy.type === "following") {
          query
            .joinRelated("following")
            .where({ "following.follower_address": owner.address })
        } else {
          query
            .joinRelated("followers")
            .where({ "followers.followee_address": owner.address })
        }
        return search(root, { ...args, query }, ctx, info)
      },
      resolverOptions: {
        sortable: ["created_at", "updated_at"],
        searchable: ["title", "description"],
      },
    },

    // ===============================
    //        🔍 PUBLICATION 搜索
    // ===============================
    PUBLICATION: {
      model: Publication,
      compose: (search) => async (root, args, ctx, info) => {
        const { request } = ctx

        request.log.debug(
          {
            user: ctx.user?.sub,
            filterBy: args?.filterBy,
          },
          "Searching publications",
        )

        // 只联接必要的表（不包含 hashtags）
        const query = Publication.query().joinRelated({
          content: true,
          author: true,
        })

        // 权限检查：如果没有 search:publications 权限，则只能搜索自己的内容
        if (!ctx.request.cani("search:publications")) {
          const selfNode = await ctx.request.config.getSelfNode()
          if (selfNode) {
            query.where("author.address", selfNode.address)
          }
        }

        return search(root, { ...args, query }, ctx, info)
      },
      resolverOptions: {
        cursor: {
          type: "keyset",
          column: "publications.id",
        },
        searchable: ["body", "publications.description"],
        filterable: [
          "type",
          ({ filterBy, query }) => {
            // 按签名筛选
            if (filterBy.isSigned === "true" || filterBy.isSigned === true) {
              query.whereNotNull("signature")
            } else if (
              filterBy.isSigned === "false" ||
              filterBy.isSigned === false
            ) {
              query.whereNull("signature")
            }

            // 按内容哈希筛选
            if (filterBy.content_hash) {
              query.where("content.content_hash", filterBy.content_hash)
            }

            // ✅ 按 hashtag 筛选（关键修改点）
            if (filterBy.hashtag) {
              const hashtagValue = filterBy.hashtag.toLowerCase()
              query.whereExists(
                Publication.relatedQuery("hashtags")
                  .select(1)
                  .where("hashtags.hashtag", hashtagValue),
              )
            }
          },
        ],
      },
    },

    COMMENT: {
      model: Comment,
      compose: (search) => async (root, args, ctx, info) => {
        const { request } = ctx

        request.log.debug(
          {
            publication_id: args?.filterBy?.publication_id,
            user: ctx.user?.sub,
          },
          "Searching comments",
        )

        if (!args?.filterBy?.publication_id) {
          throw new ErrorWithProps("publication_id is required", {
            code: "INVALID_QUERY",
          })
        }

        const query = Comment.query().leftJoinRelated("commenter")

        // 权限检查：如果没有 search:comments 权限，则只能看到已确认的评论
        if (!ctx.request.cani("search:comments")) {
          query.where("status", "CONFIRMED")
        }

        return search(root, { ...args, query }, ctx, info)
      },
      resolverOptions: {
        sortable: ["created_at", "updated_at"],
        searchable: ["body"],
        filterable: ["publication_id", "author_name", "status"],
      },
    },
  }),
}
