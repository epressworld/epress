import crypto from "node:crypto"
import { knexMigration, Router } from "swiftify"
import * as models from "../models/index.mjs"

const router = new Router()

/**
 * Perform installation
 * POST /api/install
 */
router.post("/api/install", async (request, reply) => {
  try {
    // Check if already installed
    const isInstalled = await models.Node.isInstalled()
    if (isInstalled) {
      request.log.warn("Installation attempted but system is already installed")
      return reply.code(403).send({
        error: "ALREADY_INSTALLED",
        message:
          "System is already installed. Installation endpoint is locked.",
      })
    }

    const { node, settings } = request.body

    // Validate request structure
    if (!node || !settings) {
      return reply.code(400).send({
        error: "VALIDATION_ERROR",
        message: "Request must contain 'node' and 'settings' objects",
      })
    }

    const {
      address: nodeAddress,
      url: nodeUrl,
      title: nodeTitle,
      description: nodeDescription,
      avatar: nodeAvatar,
    } = node

    const {
      mailTransport,
      mailFrom,
      defaultLanguage,
      defaultTheme,
      walletConnectProjectId,
    } = settings

    // Validate required fields
    if (!nodeAddress || !nodeUrl || !nodeTitle) {
      return reply.code(400).send({
        error: "VALIDATION_ERROR",
        message: "Node address, URL, and title are required",
      })
    }

    // Validate node address format (0x followed by 40 hex characters)
    if (!/^0x[a-fA-F0-9]{40}$/.test(nodeAddress)) {
      return reply.code(400).send({
        error: "VALIDATION_ERROR",
        message: "Invalid node address format",
      })
    }

    // Validate node URL format
    if (!/^https?:\/\/.+/.test(nodeUrl)) {
      return reply.code(400).send({
        error: "VALIDATION_ERROR",
        message: "Invalid node URL format",
      })
    }

    // Validate avatar format (data URL) if provided
    if (
      nodeAvatar &&
      !/^data:image\/(png|jpeg|jpg|gif|webp);base64,/.test(nodeAvatar)
    ) {
      return reply.code(400).send({
        error: "VALIDATION_ERROR",
        message: "Invalid avatar format. Must be a data URL with image type.",
      })
    }

    request.log.info(
      {
        nodeAddress,
        nodeUrl,
        nodeTitle,
      },
      "Starting installation process",
    )

    // Run migrations to create tables
    await knexMigration(Object.values(models))

    request.log.info("Database tables created successfully")

    // Generate JWT secret
    const jwtSecret = crypto.randomBytes(32).toString("hex")
    const jwtExpiresIn = "24h"

    // Create self-node record
    const selfNode = await models.Node.query().insert({
      address: nodeAddress,
      url: nodeUrl,
      title: nodeTitle,
      description: nodeDescription || "Personal publishing node",
      is_self: true,
      profile_version: 0,
    })

    request.log.info(
      {
        nodeAddress: selfNode.address,
      },
      "Self-node record created",
    )

    // Create settings records
    const settingsToCreate = {
      // Authentication settings
      jwt_secret: jwtSecret,
      jwt_expires_in: jwtExpiresIn,

      // Mail settings (optional)
      ...(mailTransport && { mail_transport: mailTransport }),
      ...(mailFrom && { mail_from: mailFrom }),

      // Client settings
      default_language: defaultLanguage || "en",
      default_theme: defaultTheme || "light",

      // WalletConnect settings (optional)
      ...(walletConnectProjectId && {
        walletconnect_projectid: walletConnectProjectId,
      }),

      // Avatar setting (optional)
      ...(nodeAvatar && { avatar: nodeAvatar }),

      // Default node settings
      allow_comment: "true",
      enable_rss: "true",
      allow_follow: "true",
    }

    await models.Setting.setMany(settingsToCreate)

    request.log.info(
      {
        settingsCount: Object.keys(settingsToCreate).length,
      },
      "Settings created successfully",
    )

    // Installation complete
    request.log.info("Installation completed successfully")

    reply.send({
      success: true,
      message: "Installation completed successfully",
      node: {
        address: selfNode.address,
        url: selfNode.url,
        title: selfNode.title,
        description: selfNode.description,
      },
    })
  } catch (error) {
    request.log.error(
      {
        error: error.message,
        stack: error.stack,
      },
      "Installation failed",
    )
    reply.code(500).send({
      error: "INSTALLATION_FAILED",
      message: error.message,
    })
  }
})

export default router.plugin()
