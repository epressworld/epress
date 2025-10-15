import nodemailer from "nodemailer"

/**
 * Validates SMTP transport configuration
 * @param {string} mailTransport - SMTP transport configuration string
 * @returns {Promise<{valid: boolean, message?: string, error?: string, status: number}>}
 */
export async function validateSMTPTransport(mailTransport) {
  // Validate input
  if (!mailTransport || typeof mailTransport !== "string") {
    return {
      valid: false,
      error: "Mail transport configuration is required",
      status: 400,
    }
  }

  // Trim whitespace
  const trimmedTransport = mailTransport.trim()
  if (!trimmedTransport) {
    return {
      valid: false,
      error: "Mail transport configuration cannot be empty",
      status: 400,
    }
  }

  // Create transporter with the provided configuration
  let transporter
  try {
    transporter = nodemailer.createTransport(trimmedTransport)
  } catch (error) {
    return {
      valid: false,
      error: `Invalid transport configuration: ${error.message}`,
      status: 400,
    }
  }

  // Verify the connection configuration
  try {
    await transporter.verify()
    return {
      valid: true,
      message: "SMTP configuration is valid",
      status: 200,
    }
  } catch (error) {
    // Connection verification failed
    return {
      valid: false,
      error: `SMTP verification failed: ${error.message}`,
      status: 400,
    }
  }
}
