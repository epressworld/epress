import { graphql } from "swiftify"
import { Comment, Node, Publication } from "../../models/index.mjs"

export const fetchQuery = {
  fetch: graphql.presets.fetch({
    NODE: { model: Node },
    PUBLICATION: {
      model: Publication,
      resolve: async (_root, args, context) => {
        const { request } = context

        request.log.debug(
          {
            id: args.id,
            user: context.user?.sub,
            isContentHash: args.id.startsWith("0x"),
          },
          "Fetching publication",
        )

        // 使用Swiftify的关联查询功能
        const query = Publication.query()
          .joinRelated("author")
          .select("publications.*")

        // 权限检查：如果没有 fetch:publications 权限，则只能获取自己的内容
        if (!context.request.cani("fetch:publications")) {
          // 从请求缓存获取节点地址
          const selfNode = await context.request.config.getSelfNode()
          if (selfNode) {
            query.where("author.address", selfNode.address)
          }
        }

        if (args.id.startsWith("0x")) {
          return await query
            .where({ content_hash: args.id })
            .orderBy("created_at", "desc")
            .first()
        } else {
          return await query.findById(args.id)
        }
      },
    },
    COMMENT: {
      model: Comment,
      resolve: async (_root, args, context) => {
        const { request } = context

        request.log.debug(
          {
            id: args.id,
            user: context.user?.sub,
          },
          "Fetching comment",
        )

        // 权限检查：如果没有 fetch:comments 权限，则只能获取已确认的评论
        if (!context.request.cani("fetch:comments")) {
          return await Comment.query()
            .where({ id: args.id, status: "CONFIRMED" })
            .first()
        }

        return await Comment.query().findById(args.id)
      },
    },
  }),
}
