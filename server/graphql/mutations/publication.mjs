import { GraphQLUpload } from "graphql-upload-minimal"
import mercurius from "mercurius"
import { graphql } from "swiftify"
import { verifyTypedData } from "viem"
import { Content, Node, Publication } from "../../models/index.mjs"

const { ErrorWithProps } = mercurius

/**
 * 辅助函数：将内容分发给关注者 (定义在同一文件内)
 */
async function distributeToFollowers({ publication, signature, request }) {
  try {
    const selfNode = await Node.query().findOne({ is_self: true })
    const profileVersion = selfNode ? selfNode.profile_version : 0

    const followers = await Node.query()
      .joinRelated("followers")
      .where("followers.followee_address", publication.author.address)

    request.log.info(
      `Distributing publication ${publication.id} to ${followers.length} followers.`,
    )

    for (const follower of followers) {
      try {
        await fetch(`${follower.url}/ewp/replications`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Epress-Profile-Version": profileVersion.toString(),
          },
          body: JSON.stringify({
            typedData: publication.statementOfSource,
            signature,
          }),
        })
        request.log.info(
          `Successfully sent replication request to ${follower.url}`,
        )
      } catch (e) {
        request.log.error(
          `Failed to send replication request to ${follower.url}: ${e.message}`,
        )
      }
    }
  } catch (e) {
    request.log.error({ err: e }, "Failed to fetch followers for distribution")
  }
}

// Define CreatePublicationInput GraphQL 输入类型
const CreatePublicationInput = graphql.type("InputObjectType", {
  name: "CreatePublicationInput",
  fields: {
    type: { type: graphql.type("NonNull", graphql.type("String")) },
    body: { type: graphql.type("String") },
    file: { type: GraphQLUpload },
    description: { type: graphql.type("String") },
  },
})

const UpdatePublicationInput = graphql.type("InputObjectType", {
  name: "UpdatePublicationInput",
  fields: {
    id: { type: graphql.type("NonNull", graphql.type("ID")) },
    body: { type: graphql.type("String") },
    description: { type: graphql.type("String") },
  },
})

// Define createPublication mutation 的解析器
const publicationMutations = {
  createPublication: {
    type: graphql.type("NonNull", graphql.model(Publication)),
    args: {
      input: { type: graphql.type("NonNull", CreatePublicationInput) },
    },
    resolve: async (_parent, { input }, context) => {
      const { request } = context

      request.log.debug(
        {
          user: context.user?.sub,
          type: input?.type,
          hasBody: !!input.body,
          hasFile: !!input.file,
        },
        "Creating publication",
      )

      // 1. 认证检查：确保是节点所有者
      if (!context.request.cani("create:publications")) {
        if (!context.user) {
          throw new ErrorWithProps("Authentication required.", {
            code: "UNAUTHENTICATED",
          })
        } else {
          throw new ErrorWithProps("Insufficient permissions.", {
            code: "FORBIDDEN",
          })
        }
      }

      const { body, file, description } = input
      const type = input?.type?.toUpperCase()
      const authorAddress = context.user.sub

      request.log.debug("Authentication passed")

      // 2. 输入验证：根据类型检查 body 和 file 的互斥性及存在性
      if (type === "POST") {
        if (!body) {
          throw new ErrorWithProps("body is required for POST type.", {
            code: "VALIDATION_FAILED",
          })
        }
        if (file) {
          throw new ErrorWithProps(
            "Only one of body or file can be provided.",
            { code: "VALIDATION_FAILED" },
          )
        }
      } else if (type === "FILE") {
        if (!file) {
          throw new ErrorWithProps("file is required for FILE type.", {
            code: "VALIDATION_FAILED",
          })
        }
        if (!description) {
          throw new ErrorWithProps("description is required for FILE type.", {
            code: "VALIDATION_FAILED",
          })
        }
      } else {
        throw new ErrorWithProps(
          "Invalid publication type. Must be post or file.",
          { code: "VALIDATION_FAILED" },
        )
      }

      // 3. 获取作者节点 ID
      const authorNode = await Node.query().findOne({ address: authorAddress })
      if (!authorNode) {
        throw new ErrorWithProps("Author node not found.", {
          code: "INTERNAL_SERVER_ERROR",
        })
      }

      // --- 重构内容创建：使用 Content.create() ---
      let createdContent
      try {
        request.log.debug("Creating content")
        if (type === "POST") {
          createdContent = await Content.create({ type, body: body })
        } else if (type === "FILE") {
          createdContent = await Content.create({ type, file: file })
        }
        request.log.debug("Content created successfully")
      } catch (error) {
        request.log.error({ err: error }, "Content creation failed:")
        // 捕获 Content.create() 抛出的错误
        if (error.code === "VALIDATION_FAILED") {
          // 这种情况应该在上面的输入验证中捕获
          throw new ErrorWithProps("Content (body or file) is required.", {
            code: "VALIDATION_FAILED",
          })
        }
        // 如果 Content.create() 更新后抛出 FILE_TOO_LARGE 或 UNSUPPORTED_FILE_TYPE，
        // 这些错误将在这里传播。
        if (error.code) {
          // 如果是 Content.create() 抛出的 ErrorWithProps
          throw error
        }
        throw new ErrorWithProps(`Failed to create content: ${error.message}`, {
          code: "INTERNAL_SERVER_ERROR",
        })
      }

      // 使用 createdContent 中的 content_hash
      const contentHash = createdContent.content_hash

      // 5. 创建 Publication 记录
      const publication = await Publication.query().insert({
        content_hash: contentHash,
        author_address: authorNode.address,
        signature: null, // 初始为未签名状态
        description: description, // Add description for FILE type
      })

      // 6. 返回新创建的 Publication 并加载关联数据
      request.log.info(
        {
          publication_id: publication.id,
          content_hash: contentHash,
          author: authorAddress,
          type,
        },
        "Publication created successfully",
      )

      return Publication.query()
        .findById(publication.id)
        .withGraphFetched("[author, content]")
    },
  },
  updatePublication: {
    type: graphql.type("NonNull", graphql.model(Publication)),
    args: {
      input: { type: graphql.type("NonNull", UpdatePublicationInput) },
    },
    resolve: async (_parent, { input }, context) => {
      const { id, body, description } = input
      const { user, request } = context

      request.log.debug(
        {
          publication_id: id,
          user: user?.sub,
          hasBody: !!body,
          hasDescription: !!description,
        },
        "Updating publication",
      )

      // 1. 权限检查
      if (!context.request.cani("update:publications")) {
        if (!user) {
          throw new ErrorWithProps("Authentication required.", {
            code: "UNAUTHENTICATED",
          })
        } else {
          throw new ErrorWithProps("Insufficient permissions.", {
            code: "FORBIDDEN",
          })
        }
      }

      // 2. 获取帖子及其作者信息
      const publication = await Publication.query()
        .findById(id)
        .withGraphFetched("author")

      // 3. 校验
      if (!publication) {
        throw new ErrorWithProps("Publication not found.", {
          code: "NOT_FOUND",
        })
      }
      if (publication.author.address.toLowerCase() !== user.sub.toLowerCase()) {
        throw new ErrorWithProps(
          "You are not authorized to update this publication.",
          { code: "FORBIDDEN" },
        )
      }
      if (publication.signature) {
        throw new ErrorWithProps("Cannot update a signed publication.", {
          code: "FORBIDDEN",
        })
      }

      // 4. 更新逻辑 (仅当 body 或 description 有新内容时)
      if (body || description) {
        // 获取原始内容
        const originalContent = await Content.query().findById(
          publication.content_hash,
        )

        if (originalContent && originalContent.type === "FILE") {
          // 对于 FILE 类型，更新 Publication 的 description 字段
          await publication.$query().patch({ description: description })
        } else if (originalContent && originalContent.type === "POST") {
          // 对于 POST 类型，创建新的 Content 记录（保持不可变性）
          const newContent = await Content.create({
            type: "POST",
            body: body,
          })
          // 更新 publication，使其指向新内容的哈希
          await publication
            .$query()
            .patch({ content_hash: newContent.content_hash })
        } else {
          // Fallback for unknown content type or no original content
          throw new ErrorWithProps("Cannot update unknown content type.", {
            code: "INTERNAL_SERVER_ERROR",
          })
        }
      }

      // 5. 重新获取并返回更新后的帖子，确保关联数据正确
      request.log.info(
        {
          publication_id: id,
          user: user.sub,
          updated: !!body || !!description,
        },
        "Publication updated successfully",
      )

      return await Publication.query().findById(id)
    },
  },
  destroyPublication: {
    type: graphql.type("NonNull", graphql.model(Publication)),
    args: {
      id: { type: graphql.type("NonNull", graphql.type("ID")) },
    },
    resolve: async (_parent, { id }, context) => {
      const { request } = context

      request.log.debug(
        {
          publication_id: id,
          user: context.user?.sub,
        },
        "Destroying publication",
      )

      // 1. Check for authentication
      if (!context.request.cani("delete:publications")) {
        if (!context.user) {
          throw new ErrorWithProps("Authentication required.", {
            code: "UNAUTHENTICATED",
          })
        } else {
          throw new ErrorWithProps("Insufficient permissions.", {
            code: "FORBIDDEN",
          })
        }
      }

      // 2. Find the publication by ID
      const publication = await Publication.query().findById(id)

      // 3. If not found, throw an error
      if (!publication) {
        throw new ErrorWithProps("The requested publication was not found.", {
          code: "NOT_FOUND",
        })
      }

      // 4. Delete the publication
      await publication.$query().delete()

      // 5. Return the deleted publication data
      request.log.info(
        {
          publication_id: id,
          user: context.user.sub,
          author: publication.author_address,
        },
        "Publication destroyed successfully",
      )

      return publication
    },
  },
  signPublication: {
    type: graphql.type("NonNull", graphql.model(Publication)),
    args: {
      id: { type: graphql.type("NonNull", graphql.type("ID")) },
      signature: { type: graphql.type("NonNull", graphql.type("String")) },
    },
    resolve: async (_parent, { id, signature }, context) => {
      const { user, request } = context

      request.log.debug(
        {
          publication_id: id,
          user: user?.sub,
        },
        "Signing publication",
      )

      if (!user) {
        throw new ErrorWithProps("Authentication required.", {
          code: "UNAUTHENTICATED",
        })
      }

      // 1. 查找目标 publication 及其关联数据
      const publication = await Publication.query()
        .findById(id)
        .withGraphFetched("[content, author]")
      if (!publication) {
        throw new ErrorWithProps("Publication not found.", {
          code: "NOT_FOUND",
        })
      }

      // 2. 验证权限和状态
      if (publication.author.address !== user.sub) {
        throw new ErrorWithProps(
          "You are not authorized to sign this publication.",
          { code: "FORBIDDEN" },
        )
      }
      if (publication.signature) {
        throw new ErrorWithProps("Publication is already signed.", {
          code: "FORBIDDEN",
        })
      }

      // 3. 验证 EIP-712 签名
      const typedData = publication.statementOfSource

      const isValid = await verifyTypedData({
        address: user.sub,
        domain: typedData.domain,
        types: typedData.types,
        primaryType: typedData.primaryType,
        message: typedData.message,
        signature,
      })

      if (!isValid) {
        throw new ErrorWithProps("Invalid signature.", {
          code: "INVALID_SIGNATURE",
        })
      }

      // 4. 时间戳用于时间线排序，节点所有者可以随时对内容进行签名
      // 安全性由签名验证和地址验证保证

      // 5. 更新数据库，保存签名
      await publication.$query().patch({ signature })

      // 6. 异步分发给所有关注者
      distributeToFollowers({
        publication,
        typedData,
        signature,
        request,
      }).catch((error) => {
        request.log.error({ err: error }, "Failed to distribute to followers:")
      })

      request.log.info(
        {
          publication_id: id,
          user: user.sub,
          content_hash: publication.content.content_hash,
        },
        "Publication signed successfully",
      )

      return publication
    },
  },
}

const types = [CreatePublicationInput, UpdatePublicationInput]

export { publicationMutations, types }
