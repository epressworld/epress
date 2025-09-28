import mercurius from "mercurius"
import { graphql } from "swiftify"
import validator from "validator"
import { getAddress, isAddress, recoverTypedDataAddress } from "viem" // 导入 verifyTypedData
import { Comment, Node, Publication, Setting } from "../../models/index.mjs" // 导入 Node 用于 selfNode.address
import { hash } from "../../utils/crypto.mjs" // 导入 hash 工具
import { renderEmail, sendEmail } from "../../utils/email/index.mjs"

const { ErrorWithProps } = mercurius

// 定义 CreateCommentInput 类型
const CreateCommentInput = graphql.type("InputObjectType", {
  name: "CreateCommentInput",
  fields: {
    publication_id: { type: graphql.type("NonNull", graphql.type("ID")) },
    body: { type: graphql.type("NonNull", graphql.type("String")) },
    commenter_username: {
      type: graphql.type("NonNull", graphql.type("String")),
    },
    auth_type: { type: graphql.type("NonNull", graphql.type("String")) }, // 将根据 CommentAuthType 枚举进行验证
    commenter_email: { type: graphql.type("String") },
    commenter_address: { type: graphql.type("String") },
    signature: { type: graphql.type("String") }, // 新增：签名字段
  },
})

// 定义 CommentAuthType 枚举
const CommentAuthType = graphql.type("EnumType", {
  name: "CommentAuthType",
  values: {
    EMAIL: { value: "EMAIL" },
    ETHEREUM: { value: "ETHEREUM" },
  },
})

// EIP-712 评论签名类型化数据结构 (CONFIRM)
const COMMENT_SIGNATURE_DOMAIN = {
  name: "epress world",
  version: "1",
  chainId: 1, // 暂时假设 chainId 为 1
}

const COMMENT_SIGNATURE_TYPES = {
  EIP712Domain: [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "chainId", type: "uint256" },
  ],
  CommentSignature: [
    { name: "nodeAddress", type: "address" },
    { name: "commenterAddress", type: "address" },
    { name: "publicationId", type: "uint256" }, // 修改为 publicationId
    { name: "commentBodyHash", type: "bytes32" },
    { name: "timestamp", type: "uint256" },
  ],
}

// 评论签名有效期（秒）
const COMMENT_SIGNATURE_VALIDITY_SECONDS = 600

// EIP-712 评论删除签名类型化数据结构 (DELETE)
const COMMENT_DELETION_DOMAIN = {
  name: "epress world",
  version: "1",
  chainId: 1, // 暂时假设 chainId 为 1
}

const COMMENT_DELETION_TYPES = {
  EIP712Domain: [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "chainId", type: "uint256" },
  ],
  DeleteComment: [
    { name: "nodeAddress", type: "address" }, // 添加 nodeAddress
    { name: "commentId", type: "uint256" },
    { name: "commenterAddress", type: "address" },
  ],
}

const commentMutations = {
  createComment: {
    type: graphql.type("NonNull", graphql.model(Comment)), // 使用 graphql.model 来引用 Comment 模型
    args: {
      input: { type: graphql.type("NonNull", CreateCommentInput) },
    },
    resolve: async (_parent, { input }, context) => {
      const { request } = context
      const {
        publication_id,
        body,
        commenter_username,
        commenter_email,
        commenter_address,
      } = input
      const auth_type = input?.auth_type?.toUpperCase()
      const { app } = context

      request.log.debug(
        {
          publication_id,
          auth_type,
          commenter_username,
        },
        "Creating comment",
      )

      // 1. 检查是否允许评论（放在最前面，避免不必要的查询）
      const allowCommentSetting = await Setting.query().findOne({
        key: "allow_comment",
      })
      if (allowCommentSetting && allowCommentSetting.value !== "true") {
        throw new ErrorWithProps("Commenting is disabled for this node.", {
          code: "COMMENT_DISABLED",
        })
      }

      // 2. 验证输入字段
      if (!body || body.trim() === "") {
        throw new ErrorWithProps("Comment body cannot be empty.", {
          code: "VALIDATION_FAILED",
        })
      }
      if (commenter_username.length > 50) {
        throw new ErrorWithProps(
          "Commenter username too long (max 50 characters).",
          { code: "VALIDATION_FAILED" },
        )
      }
      if (!["EMAIL", "ETHEREUM"].includes(auth_type)) {
        throw new ErrorWithProps(
          "Invalid auth_type. Must be EMAIL or ETHEREUM.",
          { code: "VALIDATION_FAILED" },
        )
      }

      const selfNode = await Node.query().findOne({ is_self: true })

      const publication = await Publication.query().findById(publication_id)
      if (!publication) {
        throw new ErrorWithProps("Publication not found.", {
          code: "NOT_FOUND",
        }) // 在签名验证前检查 publication 是否存在
      }

      // 3. 验证 auth_type 特定字段
      let status
      const newCommentData = {
        publication_id,
        body,
        commenter_username,
        auth_type,
        commenter_email: null,
        commenter_address: null,
        signature: null,
      }

      if (auth_type === "EMAIL") {
        if (!commenter_email || !validator.isEmail(commenter_email)) {
          throw new ErrorWithProps("Invalid email format.", {
            code: "VALIDATION_FAILED",
          })
        }
        status = "PENDING"
        newCommentData.commenter_email = commenter_email
      } else if (auth_type === "ETHEREUM") {
        if (!commenter_address || !isAddress(commenter_address)) {
          throw new ErrorWithProps("Invalid Ethereum address format.", {
            code: "VALIDATION_FAILED",
          })
        }
        // 新流程：创建阶段不再校验或保存签名，一律标记为 PENDING
        status = "PENDING"
        newCommentData.commenter_address = commenter_address
        // 保持 signature 为 null，待确认阶段写入
      }

      newCommentData.status = status

      // 4. 在数据库中创建评论
      const newComment = await Comment.query().insert(newCommentData)

      // 5. 创建阶段不更新 comment_count（待确认阶段更新）

      // 6. 如果是 EMAIL 认证，发送确认邮件并存储 token
      if (auth_type === "EMAIL") {
        const token = await app.jwt.sign(
          {
            aud: "comment",
            comment_id: newComment.id,
            sub: commenter_email,
            action: "confirm",
          },
          { expiresIn: "24h" },
        )

        // Send email (handle potential errors)
        try {
          const verificationLink = `${selfNode.url}/verify?token=${token}`
          request.log.debug(
            {
              verificationLink,
            },
            "Verification link generated",
          )
          await sendEmail(
            commenter_email,
            "epress 评论确认",
            await renderEmail("commentVerificationEmail", {
              verificationLink,
            }),
          )
        } catch (emailError) {
          request.log.error(
            { err: emailError },
            "Failed to send verification email:",
          )
          // 邮件发送失败不应该阻止评论创建，但应该记录错误
          // 评论仍然会被创建，状态为PENDING，用户可以通过其他方式验证
        }
      }

      // 7. 返回创建的评论
      request.log.info(
        {
          comment_id: newComment.id,
          publication_id,
          auth_type,
          status,
        },
        "Comment created successfully",
      )

      return newComment
    },
  },

  // 统一确认接口：支持 EMAIL（JWT）或 ETHEREUM（EIP-712 签名）
  confirmComment: {
    type: graphql.type("NonNull", graphql.model(Comment)),
    args: {
      id: { type: graphql.type("ID") }, // 以太坊确认需要 id；邮箱确认可不提供
      tokenOrSignature: {
        type: graphql.type("NonNull", graphql.type("String")),
      },
    },
    resolve: async (_parent, { id, tokenOrSignature }, context) => {
      const { app, request } = context
      request.log.debug("Confirming comment")

      // 尝试作为 JWT 验证（EMAIL 路径）
      let isJwt = false
      let payload
      try {
        payload = await app.jwt.verify(tokenOrSignature)
        isJwt = true
      } catch {
        isJwt = false
      }

      if (isJwt) {
        // 验证 JWT audience
        if (payload.aud !== "comment") {
          throw new ErrorWithProps("Invalid token audience.", {
            code: "INVALID_SIGNATURE",
          })
        }
        const { comment_id, action, sub } = payload
        if (!comment_id || action !== "confirm") {
          throw new ErrorWithProps("Invalid token payload or action.", {
            code: "INVALID_SIGNATURE",
          })
        }

        const comment = await Comment.query().findById(comment_id)
        if (!comment) {
          throw new ErrorWithProps("Comment not found.", {
            code: "NOT_FOUND",
          })
        }

        if (comment.status === "CONFIRMED") {
          return comment
        }
        if (comment.auth_type !== "EMAIL" || comment.commenter_email !== sub) {
          throw new ErrorWithProps("Token information does not match.", {
            code: "FORBIDDEN",
          })
        }
        if (comment.status !== "PENDING") {
          throw new ErrorWithProps(
            `Cannot verify comment with status: ${comment.status}`,
            { code: "FORBIDDEN" },
          )
        }

        const updatedComment = await comment
          .$query()
          .patchAndFetch({ status: "CONFIRMED" })
        await Publication.updateCommentCount(comment.publication_id)

        request.log.info(
          { comment_id: updatedComment.id },
          "Comment email confirmed successfully",
        )
        return updatedComment
      }

      // ETHEREUM 路径：tokenOrSignature 为签名，必须提供 id
      if (!id) {
        throw new ErrorWithProps(
          "Comment id is required for signature confirmation.",
          {
            code: "VALIDATION_FAILED",
          },
        )
      }
      const comment = await Comment.query().findById(id)
      if (!comment) {
        throw new ErrorWithProps("Comment not found.", { code: "NOT_FOUND" })
      }
      if (comment.status === "CONFIRMED") {
        return comment
      }
      if (comment.auth_type !== "ETHEREUM" || !comment.commenter_address) {
        throw new ErrorWithProps("Signature information does not match.", {
          code: "FORBIDDEN",
        })
      }

      const selfNode = await Node.query().findOne({ is_self: true })
      if (!selfNode) {
        throw new ErrorWithProps("Self node not configured.", {
          code: "INTERNAL_SERVER_ERROR",
        })
      }

      // 构建服务器侧的 typedData（防止客户端篡改）
      const commentBodyHash = `0x${await hash.sha256(comment.body)}`
      const timestampSec = Math.floor(
        new Date(comment.created_at).getTime() / 1000,
      )
      const nowSec = Math.floor(Date.now() / 1000)

      // 有效期检查
      if (nowSec - timestampSec > COMMENT_SIGNATURE_VALIDITY_SECONDS) {
        throw new ErrorWithProps("Signature expired.", {
          code: "EXPIRED_SIGNATURE",
        })
      }

      const typedData = {
        domain: COMMENT_SIGNATURE_DOMAIN,
        types: COMMENT_SIGNATURE_TYPES,
        primaryType: "CommentSignature",
        message: {
          nodeAddress: getAddress(selfNode.address),
          commenterAddress: getAddress(comment.commenter_address),
          publicationId: parseInt(comment.publication_id, 10),
          commentBodyHash,
          timestamp: timestampSec,
        },
      }

      let signerAddress
      try {
        signerAddress = await recoverTypedDataAddress({
          address: getAddress(comment.commenter_address),
          domain: typedData.domain,
          types: typedData.types,
          primaryType: typedData.primaryType,
          message: typedData.message,
          signature: tokenOrSignature,
        })
      } catch {
        throw new ErrorWithProps("Invalid signature or message mismatch.", {
          code: "INVALID_SIGNATURE",
        })
      }

      if (getAddress(signerAddress) !== getAddress(comment.commenter_address)) {
        throw new ErrorWithProps("Signature does not match address.", {
          code: "INVALID_SIGNATURE",
        })
      }

      const updatedComment = await comment
        .$query()
        .patchAndFetch({ status: "CONFIRMED", signature: tokenOrSignature })
      await Publication.updateCommentCount(comment.publication_id)

      request.log.info(
        { comment_id: updatedComment.id },
        "Comment signature confirmed successfully",
      )
      return updatedComment
    },
  },

  destroyComment: {
    type: graphql.type("NonNull", graphql.model(Comment)),
    args: {
      id: { type: graphql.type("NonNull", graphql.type("ID")) },
      signature: { type: graphql.type("String") },
      email: { type: graphql.type("String") },
    },
    resolve: async (_parent, { id, signature, email }, context) => {
      const { app, request } = context

      request.log.debug(
        {
          comment_id: id,
          user: context.user,
          user_aud: context.user?.aud,
          user_sub: context.user?.sub,
          cani_result: context.request.cani("delete:comments"),
        },
        "Destroying comment",
      )

      // 1. 根据 ID 获取评论
      const comment = await Comment.query().findById(id)
      if (!comment) {
        throw new ErrorWithProps("Comment not found.", { code: "NOT_FOUND" })
      }

      // 2. 权限检查：如果已登录且有 delete:comments 权限，直接删除
      if (context.user && context.request.cani("delete:comments")) {
        await comment.$query().delete()
        await Publication.updateCommentCount(comment.publication_id)
        return comment
      }

      const selfNode = await Node.query().findOne({ is_self: true })
      if (!selfNode) {
        throw new ErrorWithProps("Self node not configured.", {
          code: "INTERNAL_SERVER_ERROR",
        })
      }

      // 3. 根据认证类型处理删除逻辑
      if (comment.auth_type === "EMAIL") {
        // 验证邮箱（仅当没有删除权限时）
        if (!email || !validator.isEmail(email)) {
          throw new ErrorWithProps(
            "Email is required and must be valid for EMAIL authenticated comments.",
            { code: "VALIDATION_FAILED" },
          )
        }
        if (comment.commenter_email !== email) {
          throw new ErrorWithProps(
            "Provided email does not match the comment's email.",
            { code: "FORBIDDEN" },
          )
        }

        // 生成删除确认 JWT
        const token = await app.jwt.sign(
          {
            aud: "comment",
            comment_id: comment.id,
            sub: comment.commenter_email,
            action: "destroy",
          },
          { expiresIn: "24h" },
        )

        // 发送确认邮件
        try {
          const deletionLink = `${selfNode.url}/verify?token=${token}`
          request.log.debug({ deletionLink }, "Deletion link generated")
          await sendEmail(
            comment.commenter_email,
            "epress comment deletion confirmation",
            await renderEmail("commentDeletionEmail", {
              deletionLink,
            }),
          )
        } catch (emailError) {
          request.log.error(
            { err: emailError },
            "Failed to send comment deletion confirmation email:",
          )
          throw new ErrorWithProps(
            "Failed to send deletion confirmation email.",
            { code: "INTERNAL_SERVER_ERROR" },
          )
        }

        // 返回评论对象，状态不变，等待确认
        request.log.info(
          {
            comment_id: comment.id,
            auth_type: comment.auth_type,
          },
          "Comment deletion email sent",
        )

        return comment
      } else if (comment.auth_type === "ETHEREUM") {
        // 验证签名
        if (!signature) {
          throw new ErrorWithProps(
            "Signature is required for ETHEREUM authenticated comments.",
            { code: "VALIDATION_FAILED" },
          )
        }
        if (!comment.commenter_address) {
          throw new ErrorWithProps(
            "Commenter Ethereum address not found for signature verification.",
            { code: "INTERNAL_SERVER_ERROR" },
          )
        }

        const typedData = {
          domain: COMMENT_DELETION_DOMAIN,
          types: COMMENT_DELETION_TYPES,
          primaryType: "DeleteComment",
          message: {
            commentId: parseInt(comment.id, 10), // commentId 必须是 uint256，所以需要转换为数字
            nodeAddress: getAddress(selfNode.address), // 添加 nodeAddress
            commenterAddress: getAddress(comment.commenter_address),
          },
        }

        let signerAddress
        try {
          signerAddress = await recoverTypedDataAddress({
            address: getAddress(comment.commenter_address),
            domain: typedData.domain,
            types: typedData.types,
            primaryType: typedData.primaryType,
            message: typedData.message,
            signature: signature,
          })
        } catch {
          throw new ErrorWithProps("Invalid signature or message mismatch.", {
            code: "INVALID_SIGNATURE",
          })
        }
        if (
          getAddress(signerAddress) !== getAddress(comment.commenter_address)
        ) {
          throw new ErrorWithProps(
            "Signature does not match the comment's Ethereum address.",
            { code: "FORBIDDEN" },
          )
        }

        // 删除评论
        await comment.$query().delete()

        // 更新 publication 的 comment_count
        await Publication.updateCommentCount(comment.publication_id)

        request.log.info(
          {
            comment_id: comment.id,
            auth_type: comment.auth_type,
          },
          "Comment deleted successfully",
        )

        return comment
      } else {
        throw new ErrorWithProps(
          "Unsupported authentication type for comment deletion.",
          { code: "INTERNAL_SERVER_ERROR" },
        )
      }
    },
  },

  confirmCommentDeletion: {
    type: graphql.type("NonNull", graphql.model(Comment)),
    args: {
      token: { type: graphql.type("NonNull", graphql.type("String")) },
    },
    resolve: async (_parent, { token }, context) => {
      const { app, request } = context
      let payload

      request.log.debug("Confirming comment deletion")

      // 1. 验证 JWT
      try {
        payload = await app.jwt.verify(token)
      } catch {
        throw new ErrorWithProps("Invalid or expired token.", {
          code: "INVALID_SIGNATURE",
        })
      }

      // 2. 验证 JWT audience
      if (payload.aud !== "comment") {
        throw new ErrorWithProps("Invalid token audience.", {
          code: "INVALID_SIGNATURE",
        })
      }

      // 3. 从载荷中获取 comment_id 和 action
      const { comment_id, sub: comment_email, action } = payload
      if (!comment_id || !comment_email || action !== "destroy") {
        throw new ErrorWithProps("Invalid token payload or action.", {
          code: "INVALID_SIGNATURE",
        })
      }

      // 3. 在数据库中查找对应的评论
      const comment = await Comment.query().findById(comment_id)
      if (!comment) {
        throw new ErrorWithProps("Comment not found.", { code: "NOT_FOUND" })
      }

      // 4. 验证评论的认证类型和邮箱是否匹配
      if (
        comment.auth_type !== "EMAIL" ||
        comment.commenter_email !== comment_email
      ) {
        throw new ErrorWithProps(
          "Token information does not match the comment.",
          { code: "FORBIDDEN" },
        )
      }

      // 5. 删除评论
      await comment.$query().delete()

      // 6. 更新 publication 的 comment_count
      await Publication.updateCommentCount(comment.publication_id)

      // 7. 返回被删除的评论
      request.log.info(
        {
          comment_id: comment.id,
          publication_id: comment.publication_id,
        },
        "Comment deletion confirmed successfully",
      )

      return comment
    },
  },
}

const types = [CreateCommentInput, CommentAuthType]
export { commentMutations, types }
