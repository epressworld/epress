import test from "ava"
import nodemailer from "nodemailer"
import "../../setup.mjs"

/**
 * Test suite for SMTP Check API
 *
 * Tests the SMTP configuration validation functionality including:
 * - Input validation
 * - SMTP connection verification
 * - Error handling
 */

test("POST /api/smtp_check should reject empty mailTransport", async (t) => {
  const response = await t.context.app.inject({
    method: "POST",
    url: "/api/smtp_check",
    payload: { mailTransport: "" },
  })

  t.is(response.statusCode, 400)
  const result = response.json()
  t.false(result.valid)
  // Empty string is falsy, so it's caught by the first check
  t.is(result.error, "Mail transport configuration is required")
})

test("POST /api/smtp_check should reject null mailTransport", async (t) => {
  const response = await t.context.app.inject({
    method: "POST",
    url: "/api/smtp_check",
    payload: { mailTransport: null },
  })

  t.is(response.statusCode, 400)
  const result = response.json()
  t.false(result.valid)
  t.is(result.error, "Mail transport configuration is required")
})

test("POST /api/smtp_check should reject non-string mailTransport", async (t) => {
  const response = await t.context.app.inject({
    method: "POST",
    url: "/api/smtp_check",
    payload: { mailTransport: 123 },
  })

  t.is(response.statusCode, 400)
  const result = response.json()
  t.false(result.valid)
  t.is(result.error, "Mail transport configuration is required")
})

test("POST /api/smtp_check should reject whitespace-only mailTransport", async (t) => {
  const response = await t.context.app.inject({
    method: "POST",
    url: "/api/smtp_check",
    payload: { mailTransport: "   " },
  })

  t.is(response.statusCode, 400)
  const result = response.json()
  t.false(result.valid)
  t.is(result.error, "Mail transport configuration cannot be empty")
})

test("POST /api/smtp_check should reject invalid transport configuration", async (t) => {
  const response = await t.context.app.inject({
    method: "POST",
    url: "/api/smtp_check",
    payload: { mailTransport: "invalid-config" },
  })

  t.is(response.statusCode, 400)
  const result = response.json()
  t.false(result.valid)
  t.truthy(result.error)
  t.true(result.error.includes("Invalid transport configuration"))
})

test("POST /api/smtp_check should accept valid SMTP configuration", async (t) => {
  // Create a test account using nodemailer
  const testAccount = await nodemailer.createTestAccount()
  const mailTransport = `smtp://${testAccount.user}:${testAccount.pass}@smtp.ethereal.email:587`

  const response = await t.context.app.inject({
    method: "POST",
    url: "/api/smtp_check",
    payload: { mailTransport },
  })

  t.is(response.statusCode, 200)
  const result = response.json()
  t.true(result.valid)
  t.is(result.message, "SMTP configuration is valid")
})

test("POST /api/smtp_check should reject invalid SMTP credentials", async (t) => {
  const mailTransport = "smtp://invalid:invalid@smtp.ethereal.email:587"

  const response = await t.context.app.inject({
    method: "POST",
    url: "/api/smtp_check",
    payload: { mailTransport },
  })

  t.is(response.statusCode, 400)
  const result = response.json()
  t.false(result.valid)
  t.truthy(result.error)
  t.true(result.error.includes("SMTP verification failed"))
})

test("POST /api/smtp_check should reject invalid SMTP host", async (t) => {
  const mailTransport =
    "smtp://user:pass@invalid-host-that-does-not-exist.com:587"

  const response = await t.context.app.inject({
    method: "POST",
    url: "/api/smtp_check",
    payload: { mailTransport },
  })

  t.is(response.statusCode, 400)
  const result = response.json()
  t.false(result.valid)
  t.truthy(result.error)
  t.true(result.error.includes("SMTP verification failed"))
})
