import { graphql } from "swiftify"
import { getAddress } from "viem"
import { Connection, Node } from "../../models/index.mjs"

export const connectionQuery = {
  isFollower: {
    type: graphql.type("NonNull", graphql.type("Boolean")),
    args: {
      address: { type: graphql.type("NonNull", graphql.type("String")) },
    },
    resolve: async (_parent, { address }, context) => {
      const { request } = context
      try {
        // 验证地址格式
        const normalizedAddress = getAddress(address)

        // 获取当前节点（被关注方）
        const selfNode = await Node.query().findOne({ is_self: true })
        if (!selfNode) {
          throw new Error("Self node not configured")
        }

        // 查找关注者节点
        const followerNode = await Node.query().findOne({
          address: normalizedAddress,
        })

        if (!followerNode) {
          // 如果关注者节点不存在，说明没有关注关系
          return false
        }

        // 检查是否存在连接关系
        const connection = await Connection.query().findOne({
          follower_address: followerNode.address,
          followee_address: selfNode.address,
        })

        return !!connection
      } catch (error) {
        request.log.error({ err: error }, "Error checking follower status:")
        // 如果出现错误（如地址格式错误），返回false
        return false
      }
    },
  },
}
