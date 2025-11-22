import { graphql } from "solidify.js"
import { getAddress } from "viem"
import { Connection, Node } from "../../models/index.mjs"

const VisitorType = graphql.type("ObjectType", {
  name: "Visitor",
  fields: {
    isFollower: { type: graphql.type("NonNull", graphql.type("Boolean")) },
    isFollowing: { type: graphql.type("NonNull", graphql.type("Boolean")) },
    node: { type: graphql.model(Node) },
  },
})
export const visitorQuery = {
  visitor: {
    type: VisitorType,
    args: {
      address: { type: graphql.type("NonNull", graphql.type("String")) },
    },
    resolve: async (_parent, { address }, context) => {
      const { request } = context
      try {
        // 验证地址格式
        const normalizedAddress = getAddress(address)

        // 获取当前节点（被关注方）
        const selfNode = await request.config.getSelfNode()

        // 查找关注者节点
        const visitor = await Node.query().findOne({
          address: normalizedAddress,
        })

        if (!visitor) {
          // 如果关注者节点不存在，说明没有关注关系
          return {
            isFollower: false,
            isFollowing: false,
            node: null,
          }
        }

        // 检查是否存在连接关系
        const connections = await Connection.query()
          .where({
            follower_address: visitor.address,
            followee_address: selfNode.address,
          })
          .orWhere({
            follower_address: selfNode.address,
            followee_address: visitor.address,
          })

        return {
          isFollower: connections.some(
            (item) => item.follower_address === visitor.address,
          ),
          isFollowing: connections.some(
            (item) => item.followee_address === visitor.address,
          ),
          node: visitor,
        }
      } catch (error) {
        request.log.error({ err: error }, "Error checking follower status:")
        // 如果出现错误（如地址格式错误），返回false
        return {
          isFollower: false,
          isFollowing: false,
          node: null,
        }
      }
    },
  },
}
