import { NextResponse } from "next/server"
import nodemailer from "nodemailer"

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

    // Validate input
    if (!mailTransport || typeof mailTransport !== "string") {
      return NextResponse.json(
        {
          valid: false,
          error: "Mail transport configuration is required",
        },
        { status: 400 },
      )
    }

    // Trim whitespace
    const trimmedTransport = mailTransport.trim()
    if (!trimmedTransport) {
      return NextResponse.json(
        {
          valid: false,
          error: "Mail transport configuration cannot be empty",
        },
        { status: 400 },
      )
    }

    // Create transporter with the provided configuration
    let transporter
    try {
      transporter = nodemailer.createTransport(trimmedTransport)
    } catch (error) {
      return NextResponse.json(
        {
          valid: false,
          error: `Invalid transport configuration: ${error.message}`,
        },
        { status: 400 },
      )
    }

    // Verify the connection configuration
    try {
      await transporter.verify()
      return NextResponse.json({
        valid: true,
        message: "SMTP configuration is valid",
      })
    } catch (error) {
      // Connection verification failed
      return NextResponse.json(
        {
          valid: false,
          error: `SMTP verification failed: ${error.message}`,
        },
        { status: 400 },
      )
    }
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
