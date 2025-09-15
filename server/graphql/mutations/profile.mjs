import { GraphQLUpload } from "graphql-upload-minimal"
import mercurius from "mercurius"
import { graphql } from "swiftify"
import { verifyTypedData } from "viem"
import { Node, Setting } from "../../models/index.mjs"
import { ProfileType } from "../queries/profile.mjs"

const { ErrorWithProps } = mercurius

// Helper function: Convert file stream to Base64 Data URI with size validation
const streamToDataURI = (stream, mimetype, maxSizeInMB) => {
  return new Promise((resolve, reject) => {
    const chunks = []
    let totalSize = 0
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024

    stream.on("data", (chunk) => {
      totalSize += chunk.length
      if (totalSize > maxSizeInBytes) {
        stream.destroy()
        reject(
          new ErrorWithProps(`File size cannot exceed ${maxSizeInMB}MB.`, {
            code: "VALIDATION_FAILED",
          }),
        )
      }
      chunks.push(chunk)
    })

    stream.on("end", () => {
      const buffer = Buffer.concat(chunks)
      resolve(`data:${mimetype};base64,${buffer.toString("base64")}`)
    })

    stream.on("error", (err) => {
      reject(err)
    })
  })
}

// Define updateProfile mutation input type
const UpdateProfileInput = graphql.type("InputObjectType", {
  name: "UpdateProfileInput",
  fields: {
    title: { type: graphql.type("String") },
    description: { type: graphql.type("String") },
    url: { type: graphql.type("String") },
    avatar: { type: GraphQLUpload },
    background: { type: GraphQLUpload },
  },
})

const updateProfileMutation = {
  updateProfile: {
    type: ProfileType,
    args: {
      input: { type: graphql.type("NonNull", UpdateProfileInput) },
    },
    resolve: async (_parent, { input }, context) => {
      const { user, request } = context

      if (!user) {
        throw new ErrorWithProps(
          "You must be logged in to update your profile.",
          { code: "UNAUTHENTICATED" },
        )
      }

      request.log.debug(
        {
          user: user.sub,
          fields: Object.keys(input).filter((key) => input[key] !== undefined),
        },
        "Updating profile",
      )

      const { title, description, url, avatar, background } = input

      if (title && title.length > 255) {
        throw new ErrorWithProps("Title cannot exceed 255 characters.", {
          code: "VALIDATION_FAILED",
        })
      }
      if (description && description.length > 160) {
        throw new ErrorWithProps("Description cannot exceed 160 characters.", {
          code: "VALIDATION_FAILED",
        })
      }
      if (url && !url.match(/^https?:\/\/.+/)) {
        throw new ErrorWithProps("URL must be a valid HTTP or HTTPS URL.", {
          code: "VALIDATION_FAILED",
        })
      }

      let updatedNode

      // Use a transaction to ensure atomicity of node update and version increment
      await Node.transaction(async (trx) => {
        const selfNode = await Node.query(trx).findOne({ is_self: true })
        if (!selfNode) {
          throw new Error("Self node configuration not found.")
        }

        const patchData = {}
        if (typeof title === "string") patchData.title = title
        if (typeof description === "string") patchData.description = description
        if (typeof url === "string") patchData.url = url

        if (Object.keys(patchData).length > 0) {
          patchData.profile_version = selfNode.profile_version + 1
          updatedNode = await selfNode.$query(trx).patchAndFetch(patchData)
        } else {
          updatedNode = selfNode
        }

        await Promise.all([
          (async () => {
            if (avatar) {
              const { createReadStream, mimetype } = await avatar
              const stream = createReadStream()
              const dataUri = await streamToDataURI(stream, mimetype, 2)
              await Setting.query(trx)
                .insert({ key: "avatar", value: dataUri })
                .onConflict("key")
                .merge()
            }
          })(),
          (async () => {
            if (background) {
              const { createReadStream, mimetype } = await background
              const stream = createReadStream()
              const dataUri = await streamToDataURI(stream, mimetype, 5)
              await Setting.query(trx)
                .insert({ key: "background", value: dataUri })
                .onConflict("key")
                .merge()
            }
          })(),
        ])
      })

      request.log.info(
        {
          user: user.sub,
          profile_version: updatedNode.profile_version,
          updated_fields: Object.keys(input).filter(
            (key) => input[key] !== undefined,
          ),
        },
        "Profile updated successfully",
      )

      return {
        address: updatedNode.address,
        url: updatedNode.url,
        title: updatedNode.title,
        description: updatedNode.description,
        profile_version: updatedNode.profile_version,
      }
    },
  },
  broadcastProfileUpdate: {
    type: graphql.type("NonNull", graphql.type("Boolean")),
    args: {
      typedData: { type: graphql.type("NonNull", graphql.type("JSON")) },
      signature: { type: graphql.type("NonNull", graphql.type("String")) },
    },
    resolve: async (_parent, { typedData, signature }, context) => {
      const { user, request } = context

      if (!user) {
        throw new ErrorWithProps(
          "You must be logged in to execute broadcast.",
          { code: "UNAUTHENTICATED" },
        )
      }

      request.log.debug(
        {
          user: user.sub,
          message_type: typedData?.primaryType,
        },
        "Broadcasting profile update",
      )

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

      const selfNode = await Node.query().findOne({ is_self: true })
      const profileVersion = selfNode ? selfNode.profile_version : 0

      const nodesToUpdate = await Node.query().where({ is_self: false })

      if (nodesToUpdate.length > 0) {
        request.log.info(
          `Broadcasting profile update to ${nodesToUpdate.length} nodes.`,
        )
        for (const node of nodesToUpdate) {
          fetch(`${node.url}/ewp/nodes/updates`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Epress-Profile-Version": profileVersion.toString(),
            },
            body: JSON.stringify({ typedData, signature }),
          }).catch((err) => {
            request.log.error(
              { err, nodeUrl: node.url },
              "Failed to send profile update",
            )
          })
        }
      } else {
        request.log.info("No nodes to update, skipping broadcast")
      }

      request.log.info(
        {
          user: user.sub,
          nodes_count: nodesToUpdate.length,
        },
        "Profile update broadcast completed",
      )

      return true
    },
  },
}

export { updateProfileMutation, UpdateProfileInput }
