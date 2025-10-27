import mercurius from "mercurius" // 修正导入路径（假设此包）
import { graphql } from "swiftify"
import validator from "validator"
import { getAddress, recoverTypedDataAddress } from "viem"
import { Connection, Node, Setting } from "../../models/index.mjs"

const { ErrorWithProps } = mercurius

const connectionMutations = {
  createConnection: {
    type: graphql.type("NonNull", graphql.model(Node)), // 返回被关注的节点 (我们的自节点)
    args: {
      typedData: { type: graphql.type("NonNull", graphql.type("JSON")) },
      signature: { type: graphql.type("NonNull", graphql.type("String")) },
    },
    resolve: async (_parent, { typedData, signature }, context) => {
      const { request } = context

      request.log.debug(
        {
          followeeAddress: typedData?.message?.followeeAddress,
          followerUrl: typedData?.message?.followerUrl,
        },
        "Creating connection",
      )

      // 1. 检查是否允许关注（放在最前面，避免不必要的查询）
      const allowFollowSetting = await Setting.query().findOne({
        key: "allow_follow",
      })
      if (allowFollowSetting && allowFollowSetting.value !== "true") {
        throw new ErrorWithProps("Following is disabled for this node.", {
          code: "FOLLOW_DISABLED",
        })
      }

      // 2. 获取自节点 (被关注方，即 Node A)
      const selfNode = await request.config.getSelfNode()

      // 3. 验证载荷结构
      if (!typedData || !signature || !typedData.message) {
        throw new ErrorWithProps("Payload is invalid or incomplete.", {
          code: "VALIDATION_FAILED",
        })
      }

      const { followeeAddress, followeeUrl, followerUrl, timestamp } =
        typedData.message

      // 基础消息字段验证
      if (
        !followeeAddress ||
        !followeeUrl ||
        !followerUrl ||
        typeof timestamp === "undefined"
      ) {
        throw new ErrorWithProps("Message fields are invalid or incomplete.", {
          code: "VALIDATION_FAILED",
        })
      }

      // 4. 恢复签名者地址 (这是关注方地址，即 Node B)
      let followerSignerAddress
      try {
        followerSignerAddress = await recoverTypedDataAddress({
          ...typedData,
          signature: signature,
        })
      } catch {
        throw new ErrorWithProps("Invalid signature provided.", {
          code: "INVALID_SIGNATURE",
        })
      }

      // 5. 验证时间戳 (在 1 小时内)
      const currentTime = Math.floor(Date.now() / 1000)
      const oneHour = 3600
      if (
        timestamp < currentTime - oneHour ||
        timestamp > currentTime + oneHour
      ) {
        throw new ErrorWithProps("Timestamp is outside the acceptable range.", {
          code: "VALIDATION_FAILED",
        })
      }

      // 6. 验证 URL 格式
      if (
        !validator.isURL(followeeUrl, {
          protocols: ["https", "http"],
          require_protocol: true,
          require_tld: false, // 允许localhost等开发环境URL
        })
      ) {
        throw new ErrorWithProps("Followee URL format is invalid.", {
          code: "VALIDATION_FAILED",
        })
      }
      if (
        !validator.isURL(followerUrl, {
          protocols: ["https", "http"],
          require_protocol: true,
          require_tld: false, // 允许localhost等开发环境URL
        })
      ) {
        throw new ErrorWithProps("Follower URL format is invalid.", {
          code: "VALIDATION_FAILED",
        })
      }

      // 7. 验证自节点配置
      if (!selfNode) {
        throw new ErrorWithProps("Self node not configured.", {
          code: "INTERNAL_SERVER_ERROR",
        })
      }

      // 确保 typedData 中的 followeeAddress 与我们的自节点地址匹配
      if (
        getAddress(followeeAddress).toLowerCase() !==
        selfNode.address.toLowerCase()
      ) {
        throw new ErrorWithProps("Followee identity mismatch.", {
          code: "FOLLOWEE_IDENTITY_MISMATCH",
        })
      }

      // 8. 验证签名者地址与 followerUrl 的 profile 地址匹配
      let fetchedFollowerProfile
      try {
        const profileResponse = await fetch(`${followerUrl}/ewp/profile`)
        if (!profileResponse.ok) {
          throw new Error(
            `Failed to fetch follower profile from ${followerUrl}: ${profileResponse.status}`,
          )
        }
        fetchedFollowerProfile = await profileResponse.json()
      } catch (fetchError) {
        throw new ErrorWithProps(
          `Failed to fetch follower profile: ${fetchError.message}`,
          { code: "INTERNAL_SERVER_ERROR" },
        )
      }

      if (
        getAddress(fetchedFollowerProfile.address).toLowerCase() !==
        followerSignerAddress.toLowerCase()
      ) {
        throw new ErrorWithProps(
          "Signer address from profile does not match recovered signer.",
          { code: "SIGNER_MISMATCH" },
        )
      }

      // 9. 向关注方服务器 (Node B) 发起 EWP POST /connections 调用
      try {
        const ewpResponse = await fetch(`${followerUrl}/ewp/connections`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ typedData, signature }), // 发送原始签名载荷
        })

        if (!ewpResponse.ok) {
          const errorBody = await ewpResponse.json()
          if (
            ewpResponse.status === 409 &&
            errorBody.error === "CONNECTION_ALREADY_EXISTS"
          ) {
            // 409 状态码表示连接已存在，这应该被视为成功
            request.log.info(
              "EWP connection already exists, treating as success",
            )
          } else {
            throw new ErrorWithProps(
              `EWP connection failed: ${errorBody.error || ewpResponse.statusText}`,
              { code: "INTERNAL_SERVER_ERROR" },
            )
          }
        }
      } catch (fetchError) {
        throw new ErrorWithProps(
          `EWP connection network error: ${fetchError.message}`,
          { code: "INTERNAL_SERVER_ERROR" },
        )
      }

      // --- 重要：followerNode 的创建/更新已移至 EWP 握手成功之后 ---
      // 10. 查找或创建关注方节点 (外部节点，即 Node B)
      let followerNode = await Node.query().findOne({
        address: followerSignerAddress,
      })
      if (followerNode) {
        // 更新现有节点信息
        await followerNode.$query().patch({
          url: fetchedFollowerProfile.url,
          title: fetchedFollowerProfile.title,
          description: fetchedFollowerProfile.description,
          updated_at: fetchedFollowerProfile.updated_at,
        })
      } else {
        // 创建新节点
        followerNode = await Node.query().insert({
          address: followerSignerAddress,
          url: fetchedFollowerProfile.url,
          title: fetchedFollowerProfile.title,
          description: fetchedFollowerProfile.description,
          is_self: false,
          updated_at: fetchedFollowerProfile.updated_at,
        })
      }

      // 11. 创建本地连接记录
      const existingConnection = await Connection.query().findOne({
        follower_address: followerNode.address,
        followee_address: selfNode.address,
      })

      if (existingConnection) {
        throw new ErrorWithProps("Connection already exists.", {
          code: "CONNECTION_ALREADY_EXISTS",
        })
      }

      await Connection.query().insert({
        follower_address: followerNode.address,
        followee_address: selfNode.address,
      })

      // 12. 返回关注方
      request.log.info(
        {
          follower_address: followerNode.address,
          follower_url: followerNode.url,
        },
        "Connection created successfully",
      )

      return followerNode
    },
  },

  destroyConnection: {
    type: graphql.type("NonNull", graphql.model(Node)), // 返回被取消关注的节点
    args: {
      typedData: { type: graphql.type("NonNull", graphql.type("JSON")) },
      signature: { type: graphql.type("NonNull", graphql.type("String")) },
    },
    resolve: async (_parent, { typedData, signature }, context) => {
      const { request } = context
      const selfNode = await request.config.getSelfNode()

      const { followeeAddress, followerAddress, timestamp } = typedData.message

      // 基础消息字段验证
      if (
        !followeeAddress ||
        !followerAddress ||
        typeof timestamp === "undefined"
      ) {
        throw new ErrorWithProps("Message fields are invalid or incomplete.", {
          code: "VALIDATION_FAILED",
        })
      }

      request.log.debug(
        {
          followeeAddress: typedData?.message?.followeeAddress,
          followerAddress: typedData?.message?.followerAddress,
        },
        "Destroying connection",
      )

      // 2. 恢复签名者地址 (这是关注方地址，即 Node B)
      let followerSignerAddress
      try {
        followerSignerAddress = await recoverTypedDataAddress({
          ...typedData,
          signature: signature,
        })
      } catch (e) {
        request.log.error(
          { err: e },
          "DestroyConnection - Signature recovery failed:",
        )
        throw new ErrorWithProps("Invalid signature provided.", {
          code: "INVALID_SIGNATURE",
        })
      }

      // 3. 验证时间戳 (在 1 小时内)
      const currentTime = Math.floor(Date.now() / 1000)
      const oneHour = 3600
      if (
        timestamp < currentTime - oneHour ||
        timestamp > currentTime + oneHour
      ) {
        throw new ErrorWithProps("Timestamp is outside the acceptable range.", {
          code: "VALIDATION_FAILED",
        })
      }

      // 4. 获取自节点
      if (!selfNode) {
        throw new ErrorWithProps("Self node not configured.", {
          code: "INTERNAL_SERVER_ERROR",
        })
      }

      // 根据 typedData 确定场景和验证逻辑
      const isFollowerSelf =
        followerAddress.toLowerCase() === selfNode.address.toLowerCase()
      const isFolloweeSelf =
        followeeAddress.toLowerCase() === selfNode.address.toLowerCase()

      request.log.debug(
        {
          followerAddress: followerAddress,
          followeeAddress: followeeAddress,
          selfNodeAddress: selfNode.address,
          isFollowerSelf: isFollowerSelf,
          isFolloweeSelf: isFolloweeSelf,
        },
        "DestroyConnection - Scenario determination:",
      )

      if (!isFollowerSelf && !isFolloweeSelf) {
        throw new ErrorWithProps(
          "Current node is not involved in this connection.",
          { code: "FOLLOWEE_IDENTITY_MISMATCH" },
        )
      }

      // 5. 验证签名者地址与消息中的 followerAddress 匹配
      if (
        getAddress(followerAddress).toLowerCase() !==
        followerSignerAddress.toLowerCase()
      ) {
        throw new ErrorWithProps(
          "Signer address does not match follower address in message.",
          { code: "SIGNER_MISMATCH" },
        )
      }

      let followerNode, followeeNode
      let connection

      if (isFollowerSelf) {
        // 场景1：从关注者节点发起（连接列表页面）
        // 当前节点是关注者，需要向被关注者节点发送 EWP DELETE 请求
        request.log.info(
          "DestroyConnection - Scenario 1: Initiated from follower node",
        )

        followerNode = selfNode
        followeeNode = await Node.query().findOne({ address: followeeAddress })

        if (!followeeNode) {
          throw new ErrorWithProps("Followee node not found.", {
            code: "NOT_FOUND",
          })
        }

        // 查找连接记录
        connection = await Connection.query().findOne({
          follower_address: selfNode.address,
          followee_address: followeeNode.address,
        })

        if (!connection) {
          throw new ErrorWithProps("Connection not found.", {
            code: "NOT_FOUND",
          })
        }

        // 向被关注者节点发送 EWP DELETE 请求
        try {
          const ewpResponse = await fetch(
            `${followeeNode.url}/ewp/connections`,
            {
              method: "DELETE",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ typedData, signature }),
            },
          )
          if (!ewpResponse.ok) {
            const errorBody = await ewpResponse.json()
            throw new ErrorWithProps(
              `EWP connection deletion failed: ${errorBody.error || ewpResponse.statusText}`,
              { code: "INTERNAL_SERVER_ERROR" },
            )
          }
        } catch (fetchError) {
          throw new ErrorWithProps(
            `EWP connection deletion network error: ${fetchError.message}`,
            { code: "INTERNAL_SERVER_ERROR" },
          )
        }

        // 删除本地连接记录
        await Connection.query().deleteById(connection.id)
      } else if (isFolloweeSelf) {
        // 场景2：从被关注者节点发起（Header 组件的关注按钮）
        // 当前节点是被关注者，需要向关注者节点发送 EWP DELETE 请求
        request.log.info(
          "DestroyConnection - Scenario 2: Initiated from followee node",
        )

        followeeNode = selfNode
        followerNode = await Node.query().findOne({
          address: followerSignerAddress,
        })

        if (!followerNode) {
          throw new ErrorWithProps("Follower node not found.", {
            code: "NOT_FOUND",
          })
        }

        // 查找连接记录
        connection = await Connection.query().findOne({
          follower_address: followerNode.address,
          followee_address: selfNode.address,
        })

        if (!connection) {
          throw new ErrorWithProps("Connection not found.", {
            code: "NOT_FOUND",
          })
        }

        // 向关注者节点发送 EWP DELETE 请求
        try {
          const ewpResponse = await fetch(
            `${followerNode.url}/ewp/connections`,
            {
              method: "DELETE",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ typedData, signature }),
            },
          )
          if (!ewpResponse.ok) {
            const errorBody = await ewpResponse.json()
            throw new ErrorWithProps(
              `EWP connection deletion failed: ${errorBody.error || ewpResponse.statusText}`,
              { code: "INTERNAL_SERVER_ERROR" },
            )
          }
        } catch (fetchError) {
          throw new ErrorWithProps(
            `EWP connection deletion network error: ${fetchError.message}`,
            { code: "INTERNAL_SERVER_ERROR" },
          )
        }

        // 删除本地连接记录
        await Connection.query().deleteById(connection.id)
      }

      // 10. 返回被取消关注的节点
      request.log.info(
        {
          connection_id: connection.id,
          follower_address: followerNode.address,
          followee_address: followeeNode.address,
          scenario: isFollowerSelf
            ? "follower_initiated"
            : "followee_initiated",
        },
        "Connection destroyed successfully",
      )

      return isFollowerSelf ? followeeNode : followerNode
    },
  },
}

export { connectionMutations } // 导出包含 mutation 的对象
