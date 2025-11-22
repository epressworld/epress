import nodemailer from "nodemailer"
import { Router } from "solidify.js"

const router = new Router()

/**
 * Validates SMTP transport configuration
 * @param {string} mailTransport - SMTP transport configuration string
 * @returns {Promise<{valid: boolean, message?: string, error?: string}>}
 */
export async function validateSMTPTransport(mailTransport) {
  // Validate input
  if (!mailTransport || typeof mailTransport !== "string") {
    return {
      valid: false,
      error: "Mail transport configuration is required",
    }
  }

  // Trim whitespace
  const trimmedTransport = mailTransport.trim()
  if (!trimmedTransport) {
    return {
      valid: false,
      error: "Mail transport configuration cannot be empty",
    }
  }

  // Create transporter with the provided configuration
  // Disable pooling and set timeouts to prevent hanging connections
  let transporter
  try {
    const transportConfig =
      typeof trimmedTransport === "string" ? trimmedTransport : trimmedTransport

    transporter = nodemailer.createTransport(transportConfig, {
      pool: false, // Disable connection pooling for validation
      maxConnections: 1,
      maxMessages: 1,
      socketTimeout: 10000, // 10 seconds
      greetingTimeout: 10000, // 10 seconds
      connectionTimeout: 10000, // 10 seconds
    })
  } catch (error) {
    return {
      valid: false,
      error: `Invalid transport configuration: ${error.message}`,
    }
  }

  // Verify the connection configuration
  try {
    await transporter.verify()
    return {
      valid: true,
      message: "SMTP configuration is valid",
    }
  } catch (error) {
    // Connection verification failed
    return {
      valid: false,
      error: `SMTP verification failed: ${error.message}`,
    }
  }
}

/**
 * SMTP Configuration Validation API
 * POST /api/smtp_check
 *
 * Validates SMTP transport configuration using nodemailer.verify()
 * This endpoint is used for asynchronous validation in the installer and settings forms
 */
router.post("/smtp_check", async (request, reply) => {
  try {
    const { mailTransport } = request.body
    const result = await validateSMTPTransport(mailTransport)

    if (result.valid) {
      return reply.code(200).send(result)
    } else {
      return reply.code(400).send(result)
    }
  } catch (error) {
    // Unexpected error
    request.log.error(error, "[SMTP Check API] POST error")
    return reply.code(500).send({
      valid: false,
      error: `Server error: ${error.message}`,
    })
  }
})

export default router.plugin()
