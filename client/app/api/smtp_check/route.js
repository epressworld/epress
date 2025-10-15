import { NextResponse } from "next/server"
import { validateSMTPTransport } from "./validate"

/**
 * SMTP Configuration Validation API
 * POST /api/smtp_check
 *
 * Validates SMTP transport configuration using nodemailer.verify()
 * This endpoint is used for asynchronous validation in the installer and settings forms
 */
export async function POST(request) {
  try {
    const { mailTransport } = await request.json()
    const result = await validateSMTPTransport(mailTransport)
    const { status, ...body } = result
    return NextResponse.json(body, { status })
  } catch (error) {
    // Unexpected error
    return NextResponse.json(
      {
        valid: false,
        error: `Server error: ${error.message}`,
      },
      { status: 500 },
    )
  }
}
