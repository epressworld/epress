import mercurius from "mercurius"
import { graphql } from "solidify.js"
import { getAddress, isAddress, recoverTypedDataAddress } from "viem"
import { Comment, Publication, Setting } from "../../models/index.mjs"
import { hash } from "../../utils/crypto.mjs"

const { ErrorWithProps } = mercurius

const CreateCommentInput = graphql.type("InputObjectType", {
  name: "CreateCommentInput",
  fields: {
    publication_id: { type: graphql.type("NonNull", graphql.type("ID")) },
    body: { type: graphql.type("NonNull", graphql.type("String")) },
    author_name: {
      type: graphql.type("NonNull", graphql.type("String")),
    },
    author_address: { type: graphql.type("NonNull", graphql.type("String")) },
    signature: { type: graphql.type("NonNull", graphql.type("String")) },
  },
})

const COMMENT_SIGNATURE_DOMAIN = {
  name: "epress world",
  version: "1",
  chainId: 1,
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
    { name: "publicationId", type: "uint256" },
    { name: "commentBodyHash", type: "bytes32" },
  ],
}

const COMMENT_DELETION_DOMAIN = {
  name: "epress world",
  version: "1",
  chainId: 1,
}

const COMMENT_DELETION_TYPES = {
  EIP712Domain: [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "chainId", type: "uint256" },
  ],
  DeleteComment: [
    { name: "nodeAddress", type: "address" },
    { name: "commentId", type: "uint256" },
    { name: "commenterAddress", type: "address" },
  ],
}

const commentMutations = {
  createComment: {
    type: graphql.type("NonNull", graphql.model(Comment)),
    args: {
      input: { type: graphql.type("NonNull", CreateCommentInput) },
    },
    resolve: async (_parent, { input }, context) => {
      const { request } = context
      const { publication_id, body, author_name, author_address, signature } =
        input

      request.log.debug(
        {
          publication_id,
          author_name,
        },
        "Creating comment",
      )

      const allowCommentSetting = await Setting.query().findOne({
        key: "allow_comment",
      })
      if (allowCommentSetting && allowCommentSetting.value !== "true") {
        throw new ErrorWithProps("Commenting is disabled for this node.", {
          code: "COMMENT_DISABLED",
        })
      }

      if (!body || body.trim() === "") {
        throw new ErrorWithProps("Comment body cannot be empty.", {
          code: "VALIDATION_FAILED",
        })
      }
      if (author_name.length > 50) {
        throw new ErrorWithProps("Author name too long (max 50 characters).", {
          code: "VALIDATION_FAILED",
        })
      }
      if (!author_address || !isAddress(author_address)) {
        throw new ErrorWithProps("Invalid Ethereum address format.", {
          code: "VALIDATION_FAILED",
        })
      }
      if (!signature) {
        throw new ErrorWithProps("Signature is required.", {
          code: "VALIDATION_FAILED",
        })
      }

      const selfNode = await request.config.getSelfNode()

      const publication = await Publication.query().findById(publication_id)
      if (!publication) {
        throw new ErrorWithProps("Publication not found.", {
          code: "NOT_FOUND",
        })
      }

      const commentBodyHash = `0x${await hash.sha256(body)}`
      const typedData = {
        domain: COMMENT_SIGNATURE_DOMAIN,
        types: COMMENT_SIGNATURE_TYPES,
        primaryType: "CommentSignature",
        message: {
          nodeAddress: getAddress(selfNode.address),
          commenterAddress: getAddress(author_address),
          publicationId: parseInt(publication_id, 10),
          commentBodyHash,
        },
      }

      let signerAddress
      try {
        signerAddress = await recoverTypedDataAddress({
          address: getAddress(author_address),
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

      if (getAddress(signerAddress) !== getAddress(author_address)) {
        throw new ErrorWithProps("Signature does not match address.", {
          code: "INVALID_SIGNATURE",
        })
      }

      const newCommentData = {
        publication_id,
        body,
        author_name,
        author_address,
        signature: signature,
      }

      const newComment = await Comment.query().insert(newCommentData)

      await Publication.updateCommentCount(publication_id)

      request.log.info(
        { comment_id: newComment.id, publication_id },
        "Comment created successfully",
      )

      return newComment
    },
  },

  destroyComment: {
    type: graphql.type("NonNull", graphql.model(Comment)),
    args: {
      id: { type: graphql.type("NonNull", graphql.type("ID")) },
      signature: { type: graphql.type("String") },
    },
    resolve: async (_parent, { id, signature }, context) => {
      const { request } = context

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

      const comment = await Comment.query().findById(id)
      if (!comment) {
        throw new ErrorWithProps("Comment not found.", { code: "NOT_FOUND" })
      }

      if (context.user && context.request.cani("delete:comments")) {
        await comment.$query().delete()
        await Publication.updateCommentCount(comment.publication_id)
        return comment
      }

      const selfNode = await request.config.getSelfNode()
      if (!selfNode) {
        throw new ErrorWithProps("Self node not configured.", {
          code: "INTERNAL_SERVER_ERROR",
        })
      }

      if (!signature) {
        throw new ErrorWithProps(
          "Signature is required for comment deletion.",
          { code: "VALIDATION_FAILED" },
        )
      }
      if (!comment.author_address) {
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
          commentId: parseInt(comment.id, 10),
          nodeAddress: getAddress(selfNode.address),
          commenterAddress: getAddress(comment.author_address),
        },
      }

      let signerAddress
      try {
        signerAddress = await recoverTypedDataAddress({
          address: getAddress(comment.author_address),
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
      if (getAddress(signerAddress) !== getAddress(comment.author_address)) {
        throw new ErrorWithProps(
          "Signature does not match the comment's Ethereum address.",
          { code: "FORBIDDEN" },
        )
      }

      await comment.$query().delete()

      await Publication.updateCommentCount(comment.publication_id)

      request.log.info(
        {
          comment_id: comment.id,
        },
        "Comment deleted successfully",
      )

      return comment
    },
  },
}

const types = [CreateCommentInput]

export { commentMutations, types }
