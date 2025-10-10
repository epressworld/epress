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

        // 公开接口：未登录用户只能搜索自己的内容，已登录用户根据权限决定搜索范围

        const query = Publication.query().joinRelated({
          content: true,
          author: true,
        })

        // 权限检查：如果没有 search:publications 权限，则只能搜索自己的内容
        if (!ctx.request.cani("search:publications")) {
          // 使用环境变量中的节点以太坊地址
          const nodeAddress = process.env.EPRESS_NODE_ADDRESS
          if (nodeAddress) {
            query.where("author.address", nodeAddress)
          }
        }
        return search(root, { ...args, query }, ctx, info)
      },
      resolverOptions: {
        cursor: {
          type: "keyset",
          column: "id",
        },
        searchable: ["body", "publications.description"],
        filterable: [
          "type",
          ({ filterBy, query }) => {
            if (filterBy.isSigned === "true" || filterBy.isSigned === true) {
              query.whereNotNull("signature")
            } else if (
              filterBy.isSigned === "false" ||
              filterBy.isSigned === false
            ) {
              query.whereNull("signature")
            }
            if (filterBy.content_hash) {
              query.where("content.content_hash", filterBy.content_hash)
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

        // 公开接口：未登录用户只能看到已确认的评论，已登录用户根据权限决定可见范围

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
