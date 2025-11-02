import { constants } from "node:fs"
import { access, unlink } from "node:fs/promises"
import path from "node:path"
import test from "ava"
import { Model, Node, Setting } from "../../../server/models/index.mjs"
import { generateSignature, generateTestAccount } from "../../setup.mjs"

const INSTALL_LOCK_FILE = path.resolve(process.cwd(), "./data/.INSTALL_LOCK")

// Helper function to drop all tables for clean installation test
const dropAllTables = async () => {
  await Model.knex().migrate.rollback(null, true)
}

// Helper function to remove install lock file
const removeInstallLock = async () => {
  try {
    await unlink(INSTALL_LOCK_FILE)
  } catch (error) {
    // Ignore if file doesn't exist
    if (error.code !== "ENOENT") {
      console.error("Error removing install lock:", error)
    }
  }
}

// Helper function to check if install lock exists
const checkInstallLockExists = async () => {
  try {
    await access(INSTALL_LOCK_FILE, constants.F_OK)
    return true
  } catch {
    return false
  }
}

// Helper function to generate a valid data URL for avatar
const generateValidAvatarDataUrl = () => {
  return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
}

// Helper function to get current Unix timestamp
const getValidTimestamp = () => Math.floor(Date.now() / 1000)
const getExpiredTimestamp = () => Math.floor(Date.now() / 1000) - 3601
const getFutureTimestamp = () => Math.floor(Date.now() / 1000) + 3601

// Define EIP-712 Domain and Types for Installation
const INSTALL_DOMAIN = {
  name: "epress world",
  version: "1",
  chainId: 1,
}

const INSTALL_TYPES = {
  EIP712Domain: [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "chainId", type: "uint256" },
  ],
  DATA: [
    { name: "node", type: "Node" },
    { name: "settings", type: "Settings" },
    { name: "timestamp", type: "uint256" },
  ],
  Node: [
    { name: "avatar", type: "string" },
    { name: "address", type: "string" },
    { name: "url", type: "string" },
    { name: "title", type: "string" },
    { name: "description", type: "string" },
  ],
  Settings: [
    { name: "defaultLanguage", type: "string" },
    { name: "defaultTheme", type: "string" },
    { name: "walletConnectProjectId", type: "string" },
    { name: "mailTransport", type: "string" },
    { name: "mailFrom", type: "string" },
  ],
}

// Helper function to create typed data for installation
const createInstallTypedData = (node, settings, timestamp) => {
  return {
    domain: INSTALL_DOMAIN,
    types: INSTALL_TYPES,
    primaryType: "DATA",
    message: { node, settings, timestamp },
  }
}

// --- Test Suite: GET /api/install - Status Check ---

test.serial(
  "GET /api/install should return not installed when system is fresh",
  async (t) => {
    const { app } = t.context
    await dropAllTables()
    await removeInstallLock()

    const response = await app.inject({
      method: "GET",
      url: "/api/install",
    })

    t.is(response.statusCode, 200)
    const body = response.json()
    t.false(body.installed)
    t.is(body.installedAt, null)
  },
)

test.serial(
  "GET /api/install should return installed status after successful installation",
  async (t) => {
    const { app } = t.context
    await dropAllTables()
    await removeInstallLock()

    // First install the system
    const testAccount = generateTestAccount()
    const node = {
      avatar: "",
      address: testAccount.address,
      url: "https://test.com",
      title: "Test",
      description: "",
    }
    const settings = {
      defaultLanguage: "",
      defaultTheme: "",
      walletConnectProjectId: "",
      mailTransport: "",
      mailFrom: "",
    }
    const typedData = createInstallTypedData(
      node,
      settings,
      getValidTimestamp(),
    )
    const signature = await generateSignature(
      testAccount,
      typedData,
      "typedData",
    )

    await app.inject({
      method: "POST",
      url: "/api/install",
      payload: { typedData, signature },
    })

    // Now check install status
    const response = await app.inject({
      method: "GET",
      url: "/api/install",
    })

    t.is(response.statusCode, 200)
    const body = response.json()
    t.true(body.installed)
    t.truthy(body.installedAt)
  },
)

// --- Test Suite: POST /install - Success Cases ---

test.serial(
  "POST /install should successfully install with complete valid data",
  async (t) => {
    const { app } = t.context
    await dropAllTables()
    await removeInstallLock()

    const testAccount = generateTestAccount()
    const avatarDataUrl = generateValidAvatarDataUrl()
    const timestamp = getValidTimestamp()

    const node = {
      avatar: avatarDataUrl,
      address: testAccount.address,
      url: "https://test-node.example.com",
      title: "Test Node",
      description: "A test node for installation",
    }

    const settings = {
      mailTransport: "smtp://user:pass@smtp.example.com",
      mailFrom: "noreply@example.com",
      defaultLanguage: "en",
      defaultTheme: "light",
      walletConnectProjectId: "test-project-id-12345",
    }

    const typedData = createInstallTypedData(node, settings, timestamp)
    const signature = await generateSignature(
      testAccount,
      typedData,
      "typedData",
    )

    const response = await app.inject({
      method: "POST",
      url: "/api/install",
      payload: { typedData, signature },
    })

    t.is(response.statusCode, 200)
    const body = response.json()

    // Verify response structure
    t.truthy(body.result)
    t.truthy(body.node)
    t.is(body.node.address, testAccount.address)

    // Verify all steps succeeded
    const preCheckStep = body.result.find((r) => r.step === "preCheck")
    t.truthy(preCheckStep?.success)
    const schemaStep = body.result.find((r) => r.step === "initialSchema")
    t.truthy(schemaStep?.success)
    const dataStep = body.result.find((r) => r.step === "initialData")
    t.truthy(dataStep?.success)

    // Verify database records
    const selfNode = await Node.query().findOne({ is_self: true })
    t.truthy(selfNode)
    t.is(selfNode.address, testAccount.address)
    t.is(selfNode.url, "https://test-node.example.com")
    t.is(selfNode.title, "Test Node")
    t.truthy(selfNode.is_self)

    // Verify settings (including all optional ones)
    const jwtSecret = await Setting.get("jwt_secret")
    t.truthy(jwtSecret)
    t.is(jwtSecret.length, 64)

    const mailTransport = await Setting.get("mail_transport")
    t.is(mailTransport, "smtp://user:pass@smtp.example.com")

    const mailFrom = await Setting.get("mail_from")
    t.is(mailFrom, "noreply@example.com")

    const walletConnectProjectId = await Setting.get("walletconnect_projectid")
    t.is(walletConnectProjectId, "test-project-id-12345")

    const avatar = await Setting.get("avatar")
    t.is(avatar, avatarDataUrl)

    const allowComment = await Setting.get("allow_comment")
    t.is(allowComment, "true")

    // Verify install lock file was created
    const lockExists = await checkInstallLockExists()
    t.true(lockExists)
  },
)

test.serial(
  "POST /install should successfully install with minimal data (empty settings)",
  async (t) => {
    const { app } = t.context
    await dropAllTables()
    await removeInstallLock()

    const testAccount = generateTestAccount()
    const timestamp = getValidTimestamp()

    const node = {
      avatar: "",
      address: testAccount.address,
      url: "https://minimal-node.example.com",
      title: "Minimal Node",
      description: "",
    }

    const settings = {
      defaultLanguage: "",
      defaultTheme: "",
      walletConnectProjectId: "",
      mailTransport: "",
      mailFrom: "",
    }

    const typedData = createInstallTypedData(node, settings, timestamp)
    const signature = await generateSignature(
      testAccount,
      typedData,
      "typedData",
    )

    const response = await app.inject({
      method: "POST",
      url: "/api/install",
      payload: { typedData, signature },
    })

    t.is(response.statusCode, 200)

    // Verify empty settings are not saved
    const mailTransport = await Setting.get("mail_transport")
    t.falsy(mailTransport)

    // Verify defaults are applied
    const defaultLanguage = await Setting.get("default_language")
    t.is(defaultLanguage, "en")

    const defaultTheme = await Setting.get("default_theme")
    t.is(defaultTheme, "light")

    // Verify empty avatar is not saved
    const avatar = await Setting.get("avatar")
    t.falsy(avatar)

    // Verify install lock file was created
    const lockExists = await checkInstallLockExists()
    t.true(lockExists)
  },
)

// --- Test Suite: Install Lock File Tests ---

test.serial(
  "POST /install should return 500 when already installed (via lock file)",
  async (t) => {
    const { app } = t.context
    await dropAllTables()
    await removeInstallLock()

    const testAccount = generateTestAccount()
    const timestamp = getValidTimestamp()

    const node = {
      avatar: "",
      address: testAccount.address,
      url: "https://test.com",
      title: "Test",
      description: "",
    }

    const settings = {
      defaultLanguage: "",
      defaultTheme: "",
      walletConnectProjectId: "",
      mailTransport: "",
      mailFrom: "",
    }

    const typedData = createInstallTypedData(node, settings, timestamp)
    const signature = await generateSignature(
      testAccount,
      typedData,
      "typedData",
    )

    // First installation should succeed
    const firstResponse = await app.inject({
      method: "POST",
      url: "/api/install",
      payload: { typedData, signature },
    })
    t.is(firstResponse.statusCode, 200)

    // Second installation attempt should fail
    const testAccount2 = generateTestAccount()
    const node2 = {
      avatar: "",
      address: testAccount2.address,
      url: "https://test2.com",
      title: "Test 2",
      description: "",
    }
    const typedData2 = createInstallTypedData(
      node2,
      settings,
      getValidTimestamp(),
    )
    const signature2 = await generateSignature(
      testAccount2,
      typedData2,
      "typedData",
    )

    const secondResponse = await app.inject({
      method: "POST",
      url: "/api/install",
      payload: { typedData: typedData2, signature: signature2 },
    })

    t.is(secondResponse.statusCode, 500)
    const body = secondResponse.json()
    const preCheck = body.result.find((r) => r.step === "preCheck")
    t.false(preCheck.success)
    t.regex(preCheck.error, /already installed/i)
  },
)

test.serial(
  "POST /install should create lock file even if lock write fails (db should succeed)",
  async (t) => {
    const { app } = t.context
    await dropAllTables()
    await removeInstallLock()

    const testAccount = generateTestAccount()
    const node = {
      avatar: "",
      address: testAccount.address,
      url: "https://test.com",
      title: "Test",
      description: "",
    }
    const settings = {
      defaultLanguage: "",
      defaultTheme: "",
      walletConnectProjectId: "",
      mailTransport: "",
      mailFrom: "",
    }
    const typedData = createInstallTypedData(
      node,
      settings,
      getValidTimestamp(),
    )
    const signature = await generateSignature(
      testAccount,
      typedData,
      "typedData",
    )

    const response = await app.inject({
      method: "POST",
      url: "/api/install",
      payload: { typedData, signature },
    })

    // Installation should succeed even if lock file fails
    t.is(response.statusCode, 200)

    // Database should be initialized
    const selfNode = await Node.query().findOne({ is_self: true })
    t.truthy(selfNode)
    t.is(selfNode.address, testAccount.address)
  },
)

// --- Test Suite: Validation Errors ---

test.serial(
  "POST /install should return 500 when typedData is missing",
  async (t) => {
    const { app } = t.context
    await dropAllTables()
    await removeInstallLock()

    const response = await app.inject({
      method: "POST",
      url: "/api/install",
      payload: { signature: "0xvalidSignature" },
    })

    t.is(response.statusCode, 500)
    const body = response.json()
    const preCheck = body.result.find((r) => r.step === "preCheck")
    t.false(preCheck.success)
    t.truthy(preCheck.error)
  },
)

test.serial(
  "POST /install should return 500 when signature is missing",
  async (t) => {
    const { app } = t.context
    await dropAllTables()
    await removeInstallLock()

    const testAccount = generateTestAccount()
    const node = {
      avatar: "",
      address: testAccount.address,
      url: "https://test.com",
      title: "Test",
      description: "",
    }
    const settings = {
      defaultLanguage: "",
      defaultTheme: "",
      walletConnectProjectId: "",
      mailTransport: "",
      mailFrom: "",
    }
    const typedData = createInstallTypedData(
      node,
      settings,
      getValidTimestamp(),
    )

    const response = await app.inject({
      method: "POST",
      url: "/api/install",
      payload: { typedData },
    })

    t.is(response.statusCode, 500)
    const body = response.json()
    const preCheck = body.result.find((r) => r.step === "preCheck")
    t.false(preCheck.success)
  },
)

test.serial(
  "POST /install should return 500 when node address is missing",
  async (t) => {
    const { app } = t.context
    await dropAllTables()
    await removeInstallLock()

    const node = {
      avatar: "",
      address: "",
      url: "https://test.com",
      title: "Test",
      description: "",
    }
    const settings = {
      defaultLanguage: "",
      defaultTheme: "",
      walletConnectProjectId: "",
      mailTransport: "",
      mailFrom: "",
    }
    const typedData = createInstallTypedData(
      node,
      settings,
      getValidTimestamp(),
    )
    const signature = "0x..."
    const response = await app.inject({
      method: "POST",
      url: "/api/install",
      payload: { typedData, signature },
    })

    t.is(response.statusCode, 500)
    const body = response.json()
    const preCheck = body.result.find((r) => r.step === "preCheck")
    t.false(preCheck.success)
    t.regex(preCheck.error, /required/i)
  },
)

test.serial(
  "POST /install should return 500 when node URL is missing",
  async (t) => {
    const { app } = t.context
    await dropAllTables()
    await removeInstallLock()

    const testAccount = generateTestAccount()
    const node = {
      avatar: "",
      address: testAccount.address,
      url: "",
      title: "Test",
      description: "",
    }
    const settings = {
      defaultLanguage: "",
      defaultTheme: "",
      walletConnectProjectId: "",
      mailTransport: "",
      mailFrom: "",
    }
    const typedData = createInstallTypedData(
      node,
      settings,
      getValidTimestamp(),
    )
    const signature = await generateSignature(
      testAccount,
      typedData,
      "typedData",
    )

    const response = await app.inject({
      method: "POST",
      url: "/api/install",
      payload: { typedData, signature },
    })

    t.is(response.statusCode, 500)
    const body = response.json()
    const preCheck = body.result.find((r) => r.step === "preCheck")
    t.false(preCheck.success)
    t.regex(preCheck.error, /required/i)
  },
)

test.serial(
  "POST /install should return 500 when node title is missing",
  async (t) => {
    const { app } = t.context
    await dropAllTables()
    await removeInstallLock()

    const testAccount = generateTestAccount()
    const node = {
      avatar: "",
      address: testAccount.address,
      url: "https://test.com",
      title: "",
      description: "",
    }
    const settings = {
      defaultLanguage: "",
      defaultTheme: "",
      walletConnectProjectId: "",
      mailTransport: "",
      mailFrom: "",
    }
    const typedData = createInstallTypedData(
      node,
      settings,
      getValidTimestamp(),
    )
    const signature = await generateSignature(
      testAccount,
      typedData,
      "typedData",
    )

    const response = await app.inject({
      method: "POST",
      url: "/api/install",
      payload: { typedData, signature },
    })

    t.is(response.statusCode, 500)
    const body = response.json()
    const preCheck = body.result.find((r) => r.step === "preCheck")
    t.false(preCheck.success)
    t.regex(preCheck.error, /required/i)
  },
)

test.serial(
  "POST /install should return 500 when node URL format is invalid",
  async (t) => {
    const { app } = t.context
    await dropAllTables()
    await removeInstallLock()

    const testAccount = generateTestAccount()
    const node = {
      avatar: "",
      address: testAccount.address,
      url: "not-a-valid-url",
      title: "Test",
      description: "",
    }
    const settings = {
      defaultLanguage: "",
      defaultTheme: "",
      walletConnectProjectId: "",
      mailTransport: "",
      mailFrom: "",
    }
    const typedData = createInstallTypedData(
      node,
      settings,
      getValidTimestamp(),
    )
    const signature = await generateSignature(
      testAccount,
      typedData,
      "typedData",
    )

    const response = await app.inject({
      method: "POST",
      url: "/api/install",
      payload: { typedData, signature },
    })

    t.is(response.statusCode, 500)
    const body = response.json()
    const preCheck = body.result.find((r) => r.step === "preCheck")
    t.false(preCheck.success)
    t.regex(preCheck.error, /URL format/i)
  },
)

test.serial(
  "POST /install should return 500 when avatar format is invalid (not data URL)",
  async (t) => {
    const { app } = t.context
    await dropAllTables()
    await removeInstallLock()

    const testAccount = generateTestAccount()
    const node = {
      avatar: "https://example.com/avatar.png",
      address: testAccount.address,
      url: "https://test.com",
      title: "Test",
      description: "",
    }
    const settings = {
      defaultLanguage: "",
      defaultTheme: "",
      walletConnectProjectId: "",
      mailTransport: "",
      mailFrom: "",
    }
    const typedData = createInstallTypedData(
      node,
      settings,
      getValidTimestamp(),
    )
    const signature = await generateSignature(
      testAccount,
      typedData,
      "typedData",
    )

    const response = await app.inject({
      method: "POST",
      url: "/api/install",
      payload: { typedData, signature },
    })

    t.is(response.statusCode, 500)
    const body = response.json()
    const preCheck = body.result.find((r) => r.step === "preCheck")
    t.false(preCheck.success)
    t.regex(preCheck.error, /avatar format/i)
  },
)

test.serial(
  "POST /install should return 500 when avatar is not an image type",
  async (t) => {
    const { app } = t.context
    await dropAllTables()
    await removeInstallLock()

    const testAccount = generateTestAccount()
    const node = {
      avatar: "data:text/plain;base64,SGVsbG8gV29ybGQ=",
      address: testAccount.address,
      url: "https://test.com",
      title: "Test",
      description: "",
    }
    const settings = {
      defaultLanguage: "",
      defaultTheme: "",
      walletConnectProjectId: "",
      mailTransport: "",
      mailFrom: "",
    }
    const typedData = createInstallTypedData(
      node,
      settings,
      getValidTimestamp(),
    )
    const signature = await generateSignature(
      testAccount,
      typedData,
      "typedData",
    )

    const response = await app.inject({
      method: "POST",
      url: "/api/install",
      payload: { typedData, signature },
    })

    t.is(response.statusCode, 500)
    const body = response.json()
    const preCheck = body.result.find((r) => r.step === "preCheck")
    t.false(preCheck.success)
    t.regex(preCheck.error, /avatar format/i)
  },
)

// --- Test Suite: Signature Verification ---

test.serial(
  "POST /install should return 500 for invalid signature (wrong signer)",
  async (t) => {
    const { app } = t.context
    await dropAllTables()
    await removeInstallLock()

    const testAccount = generateTestAccount()
    const anotherAccount = generateTestAccount()

    const node = {
      avatar: "",
      address: testAccount.address,
      url: "https://test.com",
      title: "Test",
      description: "",
    }
    const settings = {
      defaultLanguage: "",
      defaultTheme: "",
      walletConnectProjectId: "",
      mailTransport: "",
      mailFrom: "",
    }
    const typedData = createInstallTypedData(
      node,
      settings,
      getValidTimestamp(),
    )
    const signature = await generateSignature(
      anotherAccount,
      typedData,
      "typedData",
    )

    const response = await app.inject({
      method: "POST",
      url: "/api/install",
      payload: { typedData, signature },
    })

    t.is(response.statusCode, 500)
    const body = response.json()
    const preCheck = body.result.find((r) => r.step === "preCheck")
    t.false(preCheck.success)
    t.regex(preCheck.error, /signature/i)
  },
)

test.serial(
  "POST /install should return 500 for corrupted signature",
  async (t) => {
    const { app } = t.context
    await dropAllTables()
    await removeInstallLock()

    const testAccount = generateTestAccount()
    const node = {
      avatar: "",
      address: testAccount.address,
      url: "https://test.com",
      title: "Test",
      description: "",
    }
    const settings = {
      defaultLanguage: "",
      defaultTheme: "",
      walletConnectProjectId: "",
      mailTransport: "",
      mailFrom: "",
    }
    const typedData = createInstallTypedData(
      node,
      settings,
      getValidTimestamp(),
    )

    const response = await app.inject({
      method: "POST",
      url: "/api/install",
      payload: { typedData, signature: "0xinvalidsignature" },
    })

    t.is(response.statusCode, 500)
    const body = response.json()
    const preCheck = body.result.find((r) => r.step === "preCheck")
    t.false(preCheck.success)
  },
)

// --- Test Suite: Timestamp Validation ---

test.serial(
  "POST /install should return 500 for expired timestamp",
  async (t) => {
    const { app } = t.context
    await dropAllTables()
    await removeInstallLock()

    const testAccount = generateTestAccount()
    const node = {
      avatar: "",
      address: testAccount.address,
      url: "https://test.com",
      title: "Test",
      description: "",
    }
    const settings = {
      defaultLanguage: "",
      defaultTheme: "",
      walletConnectProjectId: "",
      mailTransport: "",
      mailFrom: "",
    }
    const typedData = createInstallTypedData(
      node,
      settings,
      getExpiredTimestamp(),
    )
    const signature = await generateSignature(
      testAccount,
      typedData,
      "typedData",
    )

    const response = await app.inject({
      method: "POST",
      url: "/api/install",
      payload: { typedData, signature },
    })

    t.is(response.statusCode, 500)
    const body = response.json()
    const preCheck = body.result.find((r) => r.step === "preCheck")
    t.false(preCheck.success)
    t.regex(preCheck.error, /timestamp/i)
  },
)

test.serial(
  "POST /install should return 500 for future timestamp",
  async (t) => {
    const { app } = t.context
    await dropAllTables()
    await removeInstallLock()

    const testAccount = generateTestAccount()
    const node = {
      avatar: "",
      address: testAccount.address,
      url: "https://test.com",
      title: "Test",
      description: "",
    }
    const settings = {
      defaultLanguage: "",
      defaultTheme: "",
      walletConnectProjectId: "",
      mailTransport: "",
      mailFrom: "",
    }
    const typedData = createInstallTypedData(
      node,
      settings,
      getFutureTimestamp(),
    )
    const signature = await generateSignature(
      testAccount,
      typedData,
      "typedData",
    )

    const response = await app.inject({
      method: "POST",
      url: "/api/install",
      payload: { typedData, signature },
    })

    t.is(response.statusCode, 500)
    const body = response.json()
    const preCheck = body.result.find((r) => r.step === "preCheck")
    t.false(preCheck.success)
    t.regex(preCheck.error, /timestamp/i)
  },
)

// --- Test Suite: Edge Cases ---

test.serial(
  "POST /install should accept http URL for development",
  async (t) => {
    const { app } = t.context
    await dropAllTables()
    await removeInstallLock()

    const testAccount = generateTestAccount()
    const node = {
      avatar: "",
      address: testAccount.address,
      url: "http://localhost:3000",
      title: "Dev Node",
      description: "",
    }
    const settings = {
      defaultLanguage: "",
      defaultTheme: "",
      walletConnectProjectId: "",
      mailTransport: "",
      mailFrom: "",
    }
    const typedData = createInstallTypedData(
      node,
      settings,
      getValidTimestamp(),
    )
    const signature = await generateSignature(
      testAccount,
      typedData,
      "typedData",
    )

    const response = await app.inject({
      method: "POST",
      url: "/api/install",
      payload: { typedData, signature },
    })

    t.is(response.statusCode, 200)
  },
)

test.serial(
  "POST /install should generate unique JWT secret on each installation",
  async (t) => {
    const { app } = t.context
    await dropAllTables()
    await removeInstallLock()

    const testAccount1 = generateTestAccount()
    const node1 = {
      avatar: "",
      address: testAccount1.address,
      url: "https://test1.com",
      title: "Test 1",
      description: "",
    }
    const settings1 = {
      defaultLanguage: "",
      defaultTheme: "",
      walletConnectProjectId: "",
      mailTransport: "",
      mailFrom: "",
    }
    const typedData1 = createInstallTypedData(
      node1,
      settings1,
      getValidTimestamp(),
    )
    const signature1 = await generateSignature(
      testAccount1,
      typedData1,
      "typedData",
    )

    await app.inject({
      method: "POST",
      url: "/api/install",
      payload: { typedData: typedData1, signature: signature1 },
    })

    const jwtSecret1 = await Setting.get("jwt_secret")

    // Clean up and install again
    await dropAllTables()
    await removeInstallLock()

    const testAccount2 = generateTestAccount()
    const node2 = {
      avatar: "",
      address: testAccount2.address,
      url: "https://test2.com",
      title: "Test 2",
      description: "",
    }
    const settings2 = {
      defaultLanguage: "",
      defaultTheme: "",
      walletConnectProjectId: "",
      mailTransport: "",
      mailFrom: "",
    }
    const typedData2 = createInstallTypedData(
      node2,
      settings2,
      getValidTimestamp(),
    )
    const signature2 = await generateSignature(
      testAccount2,
      typedData2,
      "typedData",
    )

    await app.inject({
      method: "POST",
      url: "/api/install",
      payload: { typedData: typedData2, signature: signature2 },
    })

    const jwtSecret2 = await Setting.get("jwt_secret")

    t.not(jwtSecret1, jwtSecret2)
  },
)

test.serial(
  "POST /install should not expose JWT secret in response",
  async (t) => {
    const { app } = t.context
    await dropAllTables()
    await removeInstallLock()

    const testAccount = generateTestAccount()
    const node = {
      avatar: "",
      address: testAccount.address,
      url: "https://test.com",
      title: "Test",
      description: "",
    }
    const settings = {
      defaultLanguage: "",
      defaultTheme: "",
      walletConnectProjectId: "",
      mailTransport: "",
      mailFrom: "",
    }
    const typedData = createInstallTypedData(
      node,
      settings,
      getValidTimestamp(),
    )
    const signature = await generateSignature(
      testAccount,
      typedData,
      "typedData",
    )

    const response = await app.inject({
      method: "POST",
      url: "/api/install",
      payload: { typedData, signature },
    })

    const body = response.json()
    t.falsy(body.jwt_secret)
    t.falsy(body.settings)
  },
)

test.serial("POST /install should report error steps correctly", async (t) => {
  const { app } = t.context
  await dropAllTables()
  await removeInstallLock()

  const response = await app.inject({
    method: "POST",
    url: "/api/install",
    payload: { typedData: null, signature: "0xvalid" },
  })

  t.is(response.statusCode, 500)
  const body = response.json()

  t.truthy(body.result)
  t.true(Array.isArray(body.result))

  const preCheck = body.result.find((r) => r.step === "preCheck")
  t.truthy(preCheck)
  t.false(preCheck.success)
  t.truthy(preCheck.error)

  const schemaStep = body.result.find((r) => r.step === "initialSchema")
  t.truthy(schemaStep)
  t.false(schemaStep.success)

  const dataStep = body.result.find((r) => r.step === "initialData")
  t.truthy(dataStep)
  t.false(dataStep.success)
})

// --- Test Suite: VAPID Keys Generation ---

test.serial(
  "POST /install should generate VAPID keys during installation",
  async (t) => {
    const { app } = t.context
    await dropAllTables()
    await removeInstallLock()

    const testAccount = generateTestAccount()
    const node = {
      avatar: "",
      address: testAccount.address,
      url: "https://test.com",
      title: "Test Node",
      description: "",
    }
    const settings = {
      defaultLanguage: "",
      defaultTheme: "",
      walletConnectProjectId: "",
      mailTransport: "",
      mailFrom: "",
    }
    const typedData = createInstallTypedData(
      node,
      settings,
      getValidTimestamp(),
    )
    const signature = await generateSignature(
      testAccount,
      typedData,
      "typedData",
    )

    const response = await app.inject({
      method: "POST",
      url: "/api/install",
      payload: { typedData, signature },
    })

    t.is(response.statusCode, 200)

    // Verify VAPID keys were generated and saved
    const vapidKeys = await Setting.get("notification_vapid_keys")

    t.true(
      vapidKeys.publicKey?.length > 0,
      "VAPID public key should be generated",
    )
    t.true(
      vapidKeys.privateKey?.length > 0,
      "VAPID private key should be generated",
    )
    t.not(
      vapidKeys.publicKey,
      vapidKeys.privateKey,
      "Public and private keys should be different",
    )
  },
)

test.serial(
  "POST /install should generate unique VAPID keys for each installation",
  async (t) => {
    const { app } = t.context
    await dropAllTables()
    await removeInstallLock()

    // First installation
    const testAccount1 = generateTestAccount()
    const node1 = {
      avatar: "",
      address: testAccount1.address,
      url: "https://test1.com",
      title: "Test 1",
      description: "",
    }
    const settings1 = {
      defaultLanguage: "",
      defaultTheme: "",
      walletConnectProjectId: "",
      mailTransport: "",
      mailFrom: "",
    }
    const typedData1 = createInstallTypedData(
      node1,
      settings1,
      getValidTimestamp(),
    )
    const signature1 = await generateSignature(
      testAccount1,
      typedData1,
      "typedData",
    )

    await app.inject({
      method: "POST",
      url: "/api/install",
      payload: { typedData: typedData1, signature: signature1 },
    })

    const vapidKeys1 = await Setting.get("notification_vapid_keys")

    // Clean up and install again
    await dropAllTables()
    await removeInstallLock()

    // Second installation
    const testAccount2 = generateTestAccount()
    const node2 = {
      avatar: "",
      address: testAccount2.address,
      url: "https://test2.com",
      title: "Test 2",
      description: "",
    }
    const settings2 = {
      defaultLanguage: "",
      defaultTheme: "",
      walletConnectProjectId: "",
      mailTransport: "",
      mailFrom: "",
    }
    const typedData2 = createInstallTypedData(
      node2,
      settings2,
      getValidTimestamp(),
    )
    const signature2 = await generateSignature(
      testAccount2,
      typedData2,
      "typedData",
    )

    await app.inject({
      method: "POST",
      url: "/api/install",
      payload: { typedData: typedData2, signature: signature2 },
    })

    const vapidKeys2 = await Setting.get("notification_vapid_keys")

    // Verify keys are different between installations
    t.not(
      vapidKeys1.publicKey,
      vapidKeys2.publicKey,
      "VAPID public keys should be unique",
    )
    t.not(
      vapidKeys1.privateKey,
      vapidKeys2.privateKey,
      "VAPID private keys should be unique",
    )
  },
)
