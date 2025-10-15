import test from "ava"
import nodemailer from "nodemailer"
import { validateSMTPTransport } from "../../../client/app/api/smtp_check/validate.js"

/**
 * SMTP Check API Tests
 *
 * Note: These are unit tests for the SMTP validation logic.
 * The actual Next.js API route would need to be tested with integration tests
 * using tools like Playwright or Cypress.
 */

// Mock the SMTP validation logic from the API route

test("SMTP validation should reject empty mail transport", async (t) => {
  const result = await validateSMTPTransport("")
  t.false(result.valid)
  t.is(result.error, "Mail transport configuration is required")
})

test("SMTP validation should reject null mail transport", async (t) => {
  const result = await validateSMTPTransport(null)
  t.false(result.valid)
  t.is(result.error, "Mail transport configuration is required")
})

test("SMTP validation should reject undefined mail transport", async (t) => {
  const result = await validateSMTPTransport(undefined)
  t.false(result.valid)
  t.is(result.error, "Mail transport configuration is required")
})

test("SMTP validation should reject non-string mail transport", async (t) => {
  const result = await validateSMTPTransport(123)
  t.false(result.valid)
  t.is(result.error, "Mail transport configuration is required")
})

test("SMTP validation should trim whitespace", async (t) => {
  const result = await validateSMTPTransport("   ")
  t.false(result.valid)
  t.is(result.error, "Mail transport configuration cannot be empty")
})

test("SMTP validation should reject invalid SMTP URL format", async (t) => {
  const result = await validateSMTPTransport("invalid-smtp-url")
  t.false(result.valid)
  t.truthy(result.error)
})

test("SMTP validation should accept valid test account", async (t) => {
  // Use nodemailer's test account for testing
  const testAccount = await nodemailer.createTestAccount()
  const smtpUrl = `smtp://${testAccount.user}:${testAccount.pass}@${testAccount.smtp.host}:${testAccount.smtp.port}`

  const result = await validateSMTPTransport(smtpUrl)
  t.true(result.valid)
  t.is(result.message, "SMTP configuration is valid")
})

test("SMTP validation should reject invalid credentials", async (t) => {
  const invalidSmtp = "smtp://invalid:invalid@smtp.example.com:587"
  const result = await validateSMTPTransport(invalidSmtp)
  t.false(result.valid)
  t.truthy(result.error)
})
