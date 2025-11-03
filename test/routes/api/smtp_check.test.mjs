import test from "ava"
import nodemailer from "nodemailer"
import sinon from "sinon"
import "../../setup.mjs"
import { validateSMTPTransport } from "../../../server/routes/api/smtp_check.mjs"

/**
 * Test suite for SMTP Check API
 *
 * Tests the SMTP configuration validation functionality including:
 * - Input validation
 * - SMTP connection verification
 * - Error handling
 *
 * Uses sandbox.to stub nodemailer methods and avoid real network connections
 */

let sandbox
test.beforeEach((_t) => {
  // Clean up any existing stubs before each test
  sandbox = sinon.createSandbox()
})

test.afterEach((_t) => {
  // Restore all stubs after each test
  sandbox.restore()
})

// ==================== validateSMTPTransport Unit Tests ====================

// 这些测试不修改 nodemailer，可以保持并发 (test)
test("validateSMTPTransport: should reject undefined mailTransport", async (t) => {
  const result = await validateSMTPTransport(undefined)

  t.false(result.valid)
  t.is(result.error, "Mail transport configuration is required")
})

test("validateSMTPTransport: should reject null mailTransport", async (t) => {
  const result = await validateSMTPTransport(null)

  t.false(result.valid)
  t.is(result.error, "Mail transport configuration is required")
})

test("validateSMTPTransport: should reject non-string mailTransport", async (t) => {
  const result = await validateSMTPTransport(123)

  t.false(result.valid)
  t.is(result.error, "Mail transport configuration is required")
})

test("validateSMTPTransport: should reject empty string mailTransport", async (t) => {
  const result = await validateSMTPTransport("")

  t.false(result.valid)
  t.is(result.error, "Mail transport configuration is required")
})

test("validateSMTPTransport: should reject whitespace-only mailTransport", async (t) => {
  const result = await validateSMTPTransport("   ")

  t.false(result.valid)
  t.is(result.error, "Mail transport configuration cannot be empty")
})

// === 从这里开始，测试使用了 sandbox.stub，必须改为 test.serial ===

test.serial(
  "validateSMTPTransport: should reject invalid transport configuration (createTransport throws)",
  async (t) => {
    // Stub createTransport to throw an error
    const createTransportStub = sandbox.stub(nodemailer, "createTransport")
    createTransportStub.throws(new Error("Invalid configuration format"))

    const result = await validateSMTPTransport("invalid-config")

    t.false(result.valid)
    t.truthy(result.error)
    t.true(result.error.includes("Invalid transport configuration"))
    t.true(result.error.includes("Invalid configuration format"))
  },
)

test.serial(
  "validateSMTPTransport: should accept valid SMTP configuration",
  async (t) => {
    // Mock transporter with successful verify
    const mockTransporter = {
      verify: sandbox.stub().resolves(),
    }

    const createTransportStub = sandbox.stub(nodemailer, "createTransport")
    createTransportStub.returns(mockTransporter)

    const result = await validateSMTPTransport(
      "smtp://user:pass@smtp.example.com:587",
    )

    t.true(result.valid)
    t.is(result.message, "SMTP configuration is valid")
    t.true(mockTransporter.verify.calledOnce)
  },
)

test.serial(
  "validateSMTPTransport: should reject when SMTP verification fails",
  async (t) => {
    // Mock transporter with failed verify
    const mockTransporter = {
      verify: sandbox.stub().rejects(new Error("Connection refused")),
    }

    const createTransportStub = sandbox.stub(nodemailer, "createTransport")
    createTransportStub.returns(mockTransporter)

    const result = await validateSMTPTransport(
      "smtp://user:pass@invalid.example.com:587",
    )

    t.false(result.valid)
    t.truthy(result.error)
    t.true(result.error.includes("SMTP verification failed"))
    t.true(result.error.includes("Connection refused"))
    t.true(mockTransporter.verify.calledOnce)
  },
)

test.serial(
  "validateSMTPTransport: should handle authentication errors",
  async (t) => {
    // Mock transporter with authentication error
    const mockTransporter = {
      verify: sandbox.stub().rejects(new Error("Invalid login")),
    }

    const createTransportStub = sandbox.stub(nodemailer, "createTransport")
    createTransportStub.returns(mockTransporter)

    const result = await validateSMTPTransport(
      "smtp://invalid:invalid@smtp.example.com:587",
    )

    t.false(result.valid)
    t.truthy(result.error)
    t.true(result.error.includes("SMTP verification failed"))
    t.true(result.error.includes("Invalid login"))
  },
)

// ==================== API Endpoint Tests ====================
// 所有 API 测试都 stub 了 nodemailer，全部改为 test.serial

test.serial(
  "POST /api/smtp_check should reject empty mailTransport",
  async (t) => {
    // Mock transporter (won't be called due to validation)
    const mockTransporter = {
      verify: sandbox.stub().resolves(),
    }
    sandbox.stub(nodemailer, "createTransport").returns(mockTransporter)

    const response = await t.context.app.inject({
      method: "POST",
      url: "/api/smtp_check",
      payload: { mailTransport: "" },
    })

    t.is(response.statusCode, 400)
    const result = response.json()
    t.false(result.valid)
    t.is(result.error, "Mail transport configuration is required")
    t.false(mockTransporter.verify.called)
  },
)

test.serial(
  "POST /api/smtp_check should reject null mailTransport",
  async (t) => {
    // Mock transporter (won't be called due to validation)
    const mockTransporter = {
      verify: sandbox.stub().resolves(),
    }
    sandbox.stub(nodemailer, "createTransport").returns(mockTransporter)

    const response = await t.context.app.inject({
      method: "POST",
      url: "/api/smtp_check",
      payload: { mailTransport: null },
    })

    t.is(response.statusCode, 400)
    const result = response.json()
    t.false(result.valid)
    t.is(result.error, "Mail transport configuration is required")
    t.false(mockTransporter.verify.called)
  },
)

test.serial(
  "POST /api/smtp_check should reject non-string mailTransport",
  async (t) => {
    // Mock transporter (won't be called due to validation)
    const mockTransporter = {
      verify: sandbox.stub().resolves(),
    }
    sandbox.stub(nodemailer, "createTransport").returns(mockTransporter)

    const response = await t.context.app.inject({
      method: "POST",
      url: "/api/smtp_check",
      payload: { mailTransport: 123 },
    })

    t.is(response.statusCode, 400)
    const result = response.json()
    t.false(result.valid)
    t.is(result.error, "Mail transport configuration is required")
    t.false(mockTransporter.verify.called)
  },
)

test.serial(
  "POST /api/smtp_check should reject whitespace-only mailTransport",
  async (t) => {
    // Mock transporter (won't be called due to validation)
    const mockTransporter = {
      verify: sandbox.stub().resolves(),
    }
    sandbox.stub(nodemailer, "createTransport").returns(mockTransporter)

    const response = await t.context.app.inject({
      method: "POST",
      url: "/api/smtp_check",
      payload: { mailTransport: "   " },
    })

    t.is(response.statusCode, 400)
    const result = response.json()
    t.false(result.valid)
    t.is(result.error, "Mail transport configuration cannot be empty")
    t.false(mockTransporter.verify.called)
  },
)

test.serial(
  "POST /api/smtp_check should reject invalid transport configuration",
  async (t) => {
    // Stub createTransport to throw an error
    const createTransportStub = sandbox.stub(nodemailer, "createTransport")
    createTransportStub.throws(new Error("Invalid URL"))

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
  },
)

test.serial(
  "POST /api/smtp_check should accept valid SMTP configuration",
  async (t) => {
    // Mock transporter with successful verify
    const mockTransporter = {
      verify: sandbox.stub().resolves(),
    }

    const createTransportStub = sandbox.stub(nodemailer, "createTransport")
    createTransportStub.returns(mockTransporter)

    const response = await t.context.app.inject({
      method: "POST",
      url: "/api/smtp_check",
      payload: { mailTransport: "smtp://user:pass@smtp.example.com:587" },
    })

    t.is(response.statusCode, 200)
    const result = response.json()
    t.true(result.valid)
    t.is(result.message, "SMTP configuration is valid")
    t.true(mockTransporter.verify.calledOnce)
  },
)

test.serial(
  "POST /api/smtp_check should reject invalid SMTP credentials",
  async (t) => {
    // Mock transporter with authentication failure
    const mockTransporter = {
      verify: sinon
        .stub()
        .rejects(
          new Error(
            "Invalid login: 535-5.7.8 Username and Password not accepted",
          ),
        ),
    }

    const createTransportStub = sandbox.stub(nodemailer, "createTransport")
    createTransportStub.returns(mockTransporter)

    const response = await t.context.app.inject({
      method: "POST",
      url: "/api/smtp_check",
      payload: { mailTransport: "smtp://invalid:invalid@smtp.example.com:587" },
    })

    t.is(response.statusCode, 400)
    const result = response.json()
    t.false(result.valid)
    t.truthy(result.error)
    t.true(result.error.includes("SMTP verification failed"))
    t.true(mockTransporter.verify.calledOnce)
  },
)

test.serial(
  "POST /api/smtp_check should reject invalid SMTP host",
  async (t) => {
    // Mock transporter with connection failure
    const mockTransporter = {
      verify: sinon
        .stub()
        .rejects(
          new Error(
            "getaddrinfo ENOTFOUND invalid-host-that-does-not-exist.com",
          ),
        ),
    }

    const createTransportStub = sandbox.stub(nodemailer, "createTransport")
    createTransportStub.returns(mockTransporter)

    const response = await t.context.app.inject({
      method: "POST",
      url: "/api/smtp_check",
      payload: {
        mailTransport:
          "smtp://user:pass@invalid-host-that-does-not-exist.com:587",
      },
    })

    t.is(response.statusCode, 400)
    const result = response.json()
    t.false(result.valid)
    t.truthy(result.error)
    t.true(result.error.includes("SMTP verification failed"))
    t.true(mockTransporter.verify.calledOnce)
  },
)

test.serial(
  "POST /api/smtp_check should handle connection timeout",
  async (t) => {
    // Mock transporter with timeout error
    const mockTransporter = {
      verify: sandbox.stub().rejects(new Error("Connection timeout")),
    }

    const createTransportStub = sandbox.stub(nodemailer, "createTransport")
    createTransportStub.returns(mockTransporter)

    const response = await t.context.app.inject({
      method: "POST",
      url: "/api/smtp_check",
      payload: { mailTransport: "smtp://user:pass@smtp.example.com:587" },
    })

    t.is(response.statusCode, 400)
    const result = response.json()
    t.false(result.valid)
    t.truthy(result.error)
    t.true(result.error.includes("SMTP verification failed"))
    t.true(result.error.includes("Connection timeout"))
  },
)

test.serial("POST /api/smtp_check should handle TLS/SSL errors", async (t) => {
  // Mock transporter with TLS error
  const mockTransporter = {
    verify: sandbox.stub().rejects(new Error("self signed certificate")),
  }

  const createTransportStub = sandbox.stub(nodemailer, "createTransport")
  createTransportStub.returns(mockTransporter)

  const response = await t.context.app.inject({
    method: "POST",
    url: "/api/smtp_check",
    payload: { mailTransport: "smtp://user:pass@smtp.example.com:465" },
  })

  t.is(response.statusCode, 400)
  const result = response.json()
  t.false(result.valid)
  t.truthy(result.error)
  t.true(result.error.includes("SMTP verification failed"))
  t.true(result.error.includes("self signed certificate"))
})

test.serial(
  "POST /api/smtp_check should handle port-related errors",
  async (t) => {
    // Mock transporter with port error
    const mockTransporter = {
      verify: sandbox.stub().rejects(new Error("connect ECONNREFUSED")),
    }

    const createTransportStub = sandbox.stub(nodemailer, "createTransport")
    createTransportStub.returns(mockTransporter)

    const response = await t.context.app.inject({
      method: "POST",
      url: "/api/smtp_check",
      payload: { mailTransport: "smtp://user:pass@smtp.example.com:9999" },
    })

    t.is(response.statusCode, 400)
    const result = response.json()
    t.false(result.valid)
    t.truthy(result.error)
    t.true(result.error.includes("SMTP verification failed"))
    t.true(result.error.includes("ECONNREFUSED"))
  },
)

test.serial(
  "POST /api/smtp_check should trim whitespace from mailTransport",
  async (t) => {
    // Mock transporter with successful verify
    const mockTransporter = {
      verify: sandbox.stub().resolves(),
    }

    const createTransportStub = sandbox.stub(nodemailer, "createTransport")
    createTransportStub.returns(mockTransporter)

    const response = await t.context.app.inject({
      method: "POST",
      url: "/api/smtp_check",
      payload: { mailTransport: "  smtp://user:pass@smtp.example.com:587  " },
    })

    t.is(response.statusCode, 200)
    const result = response.json()
    t.true(result.valid)
    t.is(result.message, "SMTP configuration is valid")

    // Verify createTransport was called with trimmed string
    t.true(createTransportStub.calledOnce)
    t.is(
      createTransportStub.firstCall.args[0],
      "smtp://user:pass@smtp.example.com:587",
    )
  },
)

test.serial(
  "POST /api/smtp_check should handle unexpected server errors gracefully",
  async (t) => {
    // Stub createTransport to throw an unexpected error
    const createTransportStub = sandbox.stub(nodemailer, "createTransport")
    createTransportStub.throws(new Error("Unexpected internal error"))

    const response = await t.context.app.inject({
      method: "POST",
      url: "/api/smtp_check",
      payload: { mailTransport: "smtp://user:pass@smtp.example.com:587" },
    })

    t.is(response.statusCode, 400)
    const result = response.json()
    t.false(result.valid)
    t.truthy(result.error)
    t.true(result.error.includes("Invalid transport configuration"))
  },
)
