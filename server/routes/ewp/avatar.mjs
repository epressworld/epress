import { Router } from "swiftify"
import { Setting } from "../../models/index.mjs"

export const DEFAULT_AVATAR =
  "data:image/png;base64,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"

const router = new Router()

router.get("/avatar", async (request, reply) => {
  request.log.debug("Avatar endpoint accessed")

  try {
    const avatar = await Setting.get("avatar", DEFAULT_AVATAR)

    // Extract MIME type and base64 data from the data URI
    const mimeMatch = avatar.match(/^data:(image\/[a-zA-Z0-9+\-.]+);base64,/)
    let contentType = "application/octet-stream" // Fallback
    let base64Data = avatar // Assume it's just base64 data if no prefix

    if (mimeMatch?.[1]) {
      contentType = mimeMatch[1]
      base64Data = avatar.substring(mimeMatch[0].length)
    } else {
      // If the data URI format is not strictly followed, log an error
      // and fall back to the default PNG.
      request.log.warn(
        "Avatar data URI format is invalid, falling back to default",
      )
      contentType = "image/png"
      base64Data = DEFAULT_AVATAR.substring(DEFAULT_AVATAR.indexOf(",") + 1)
    }

    const imageBuffer = Buffer.from(base64Data, "base64")

    request.log.info(
      {
        contentType,
        size: imageBuffer.length,
        hasCustomAvatar: avatar !== DEFAULT_AVATAR,
      },
      "Avatar served successfully",
    )

    reply.header("Content-Type", contentType).send(imageBuffer)
  } catch (error) {
    request.log.error(
      {
        error: error.message,
        stack: error.stack,
      },
      "Avatar endpoint failed",
    )
    reply.code(500).send({ error: "Internal Server Error" })
  }
})

export default router.plugin()
