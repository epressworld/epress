import { Router } from "swiftify"
import { Setting } from "../../models/index.mjs"

const router = new Router()

router.get("/avatar", async (request, reply) => {
  request.log.debug("Avatar endpoint accessed")

  try {
    const avatarSetting = await Setting.query().findOne({ key: "avatar" })

    const defaultBase64DataUri =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
    let finalDataUri = defaultBase64DataUri

    if (avatarSetting?.value) {
      finalDataUri = avatarSetting.value
    }

    // Extract MIME type and base64 data from the data URI
    const mimeMatch = finalDataUri.match(
      /^data:(image\/[a-zA-Z0-9+\-.]+);base64,/,
    )
    let contentType = "application/octet-stream" // Fallback
    let base64Data = finalDataUri // Assume it's just base64 data if no prefix

    if (mimeMatch?.[1]) {
      contentType = mimeMatch[1]
      base64Data = finalDataUri.substring(mimeMatch[0].length)
    } else {
      // If the data URI format is not strictly followed, log an error
      // and fall back to the default PNG.
      request.log.warn(
        "Avatar data URI format is invalid, falling back to default",
      )
      contentType = "image/png"
      base64Data = defaultBase64DataUri.substring(
        defaultBase64DataUri.indexOf(",") + 1,
      )
    }

    const imageBuffer = Buffer.from(base64Data, "base64")

    request.log.info(
      {
        contentType,
        size: imageBuffer.length,
        hasCustomAvatar: !!avatarSetting?.value,
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
