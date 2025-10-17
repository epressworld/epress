import test from "ava"
import { Model } from "swiftify"
import { Node, Setting } from "../../../server/models/index.mjs"
import { generateTestAccount } from "../../setup.mjs"

// Helper function to drop all tables for clean installation test
const dropAllTables = async () => {
  const knex = Model.knex()

  // Get all table names
  const tables = await knex.raw(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
  `)

  // Drop all tables
  for (const table of tables) {
    await knex.schema.dropTableIfExists(table.name)
  }
}

// Helper function to generate a valid data URL for avatar
const generateValidAvatarDataUrl = () => {
  // 1x1 transparent PNG
  return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
}

// Helper function to generate a valid data URL for JPEG
const generateValidJpegDataUrl = () => {
  return "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k="
}

// --- Test Suite: POST /install - Successful Installation ---

test.serial(
  "POST /install should successfully install with complete valid data",
  async (t) => {
    const { app } = t.context

    // Drop all tables for clean installation
    await dropAllTables()

    const testAccount = generateTestAccount()
    const avatarDataUrl = generateValidAvatarDataUrl()

    const payload = {
      node: {
        address: testAccount.address,
        url: "https://test-node.example.com",
        title: "Test Node",
        description: "A test node for installation",
        avatar: avatarDataUrl,
      },
      settings: {
        mailTransport: "smtp://user:pass@smtp.example.com",
        mailFrom: "noreply@example.com",
        defaultLanguage: "en",
        defaultTheme: "light",
        walletConnectProjectId: "test-project-id-12345",
      },
    }

    const response = await app.inject({
      method: "POST",
      url: "/api/install",
      payload,
    })

    t.is(response.statusCode, 200, "should return 200 OK")
    const body = response.json()
    t.truthy(body.success, "should return success: true")
    t.is(body.message, "Installation completed successfully")
    t.truthy(body.node, "should return node information")
    t.is(body.node.address, testAccount.address)
    t.is(body.node.url, "https://test-node.example.com")
    t.is(body.node.title, "Test Node")

    // Verify database records
    const selfNode = await Node.query().findOne({ is_self: true })
    t.truthy(selfNode, "self node should be created")
    t.is(selfNode.address, testAccount.address)
    t.is(selfNode.url, "https://test-node.example.com")
    t.is(selfNode.title, "Test Node")
    t.is(selfNode.description, "A test node for installation")
    t.is(selfNode.is_self, 1) // SQLite stores boolean as 0/1
    t.is(selfNode.profile_version, 0)

    // Verify settings
    const jwtSecret = await Setting.get("jwt_secret")
    t.truthy(jwtSecret, "jwt_secret should be created")
    t.is(jwtSecret.length, 64, "jwt_secret should be 64 characters")

    const jwtExpiresIn = await Setting.get("jwt_expires_in")
    t.is(jwtExpiresIn, "24h", "jwt_expires_in should be 24h")

    const mailTransport = await Setting.get("mail_transport")
    t.is(mailTransport, "smtp://user:pass@smtp.example.com")

    const mailFrom = await Setting.get("mail_from")
    t.is(mailFrom, "noreply@example.com")

    const defaultLanguage = await Setting.get("default_language")
    t.is(defaultLanguage, "en")

    const defaultTheme = await Setting.get("default_theme")
    t.is(defaultTheme, "light")

    const walletConnectProjectId = await Setting.get("walletconnect_projectid")
    t.is(walletConnectProjectId, "test-project-id-12345")

    const avatar = await Setting.get("avatar")
    t.is(avatar, avatarDataUrl, "avatar should be saved in settings")

    const allowComment = await Setting.get("allow_comment")
    t.is(allowComment, "true")

    const enableRss = await Setting.get("enable_rss")
    t.is(enableRss, "true")

    const allowFollow = await Setting.get("allow_follow")
    t.is(allowFollow, "true")
  },
)

test.serial(
  "POST /install should successfully install with minimal required data",
  async (t) => {
    const { app } = t.context

    // Drop all tables for clean installation
    await dropAllTables()

    const testAccount = generateTestAccount()

    const payload = {
      node: {
        address: testAccount.address,
        url: "https://minimal-node.example.com",
        title: "Minimal Node",
      },
      settings: {},
    }

    const response = await app.inject({
      method: "POST",
      url: "/api/install",
      payload,
    })

    t.is(response.statusCode, 200, "should return 200 OK")
    const body = response.json()
    t.truthy(body.success, "should return success: true")

    // Verify node record
    const selfNode = await Node.query().findOne({ is_self: true })
    t.truthy(selfNode, "self node should be created")
    t.is(selfNode.address, testAccount.address)
    t.is(selfNode.description, "Personal publishing node") // Default value

    // Verify default settings
    const defaultLanguage = await Setting.get("default_language")
    t.is(defaultLanguage, "en", "should use default language")

    const defaultTheme = await Setting.get("default_theme")
    t.is(defaultTheme, "light", "should use default theme")
  },
)

test.serial(
  "POST /install should accept different image formats for avatar",
  async (t) => {
    const { app } = t.context

    // Drop all tables for clean installation
    await dropAllTables()

    const testAccount = generateTestAccount()
    const jpegDataUrl = generateValidJpegDataUrl()

    const payload = {
      node: {
        address: testAccount.address,
        url: "https://jpeg-node.example.com",
        title: "JPEG Node",
        avatar: jpegDataUrl,
      },
      settings: {},
    }

    const response = await app.inject({
      method: "POST",
      url: "/api/install",
      payload,
    })

    t.is(response.statusCode, 200, "should return 200 OK")

    const avatar = await Setting.get("avatar")
    t.is(avatar, jpegDataUrl, "JPEG avatar should be saved")
  },
)

// --- Test Suite: POST /install - Request Structure Validation ---

test.serial(
  "POST /install should return 400 when node object is missing",
  async (t) => {
    const { app } = t.context

    // Clean up to test validation before installation check
    await Node.query().delete().where({ is_self: true })

    const payload = {
      settings: {},
    }

    const response = await app.inject({
      method: "POST",
      url: "/api/install",
      payload,
    })

    t.is(response.statusCode, 400, "should return 400 Bad Request")
    t.deepEqual(response.json(), {
      error: "VALIDATION_ERROR",
      message: "Request must contain 'node' and 'settings' objects",
    })
  },
)

test.serial(
  "POST /install should return 400 when settings object is missing",
  async (t) => {
    const { app } = t.context

    // Clean up to test validation before installation check
    await Node.query().delete().where({ is_self: true })

    const testAccount = generateTestAccount()

    const payload = {
      node: {
        address: testAccount.address,
        url: "https://test.com",
        title: "Test",
      },
    }

    const response = await app.inject({
      method: "POST",
      url: "/api/install",
      payload,
    })

    t.is(response.statusCode, 400, "should return 400 Bad Request")
    t.deepEqual(response.json(), {
      error: "VALIDATION_ERROR",
      message: "Request must contain 'node' and 'settings' objects",
    })
  },
)

// --- Test Suite: POST /install - Node Address Validation ---

test.serial(
  "POST /install should return 400 when node address is missing",
  async (t) => {
    const { app } = t.context

    // Clean up to test validation before installation check
    await Node.query().delete().where({ is_self: true })

    const payload = {
      node: {
        url: "https://test.com",
        title: "Test",
      },
      settings: {},
    }

    const response = await app.inject({
      method: "POST",
      url: "/api/install",
      payload,
    })

    t.is(response.statusCode, 400, "should return 400 Bad Request")
    t.deepEqual(response.json(), {
      error: "VALIDATION_ERROR",
      message: "Node address, URL, and title are required",
    })
  },
)

test.serial(
  "POST /install should return 400 when node address format is invalid",
  async (t) => {
    const { app } = t.context

    // Clean up to test validation before installation check
    await Node.query().delete().where({ is_self: true })

    const payload = {
      node: {
        address: "invalid-address",
        url: "https://test.com",
        title: "Test",
      },
      settings: {},
    }

    const response = await app.inject({
      method: "POST",
      url: "/api/install",
      payload,
    })

    t.is(response.statusCode, 400, "should return 400 Bad Request")
    t.deepEqual(response.json(), {
      error: "VALIDATION_ERROR",
      message: "Invalid node address format",
    })
  },
)

test.serial(
  "POST /install should return 400 when node address is too short",
  async (t) => {
    const { app } = t.context

    // Clean up to test validation before installation check
    await Node.query().delete().where({ is_self: true })

    const payload = {
      node: {
        address: "0x123",
        url: "https://test.com",
        title: "Test",
      },
      settings: {},
    }

    const response = await app.inject({
      method: "POST",
      url: "/api/install",
      payload,
    })

    t.is(response.statusCode, 400, "should return 400 Bad Request")
    t.deepEqual(response.json(), {
      error: "VALIDATION_ERROR",
      message: "Invalid node address format",
    })
  },
)

test.serial(
  "POST /install should return 400 when node address has invalid characters",
  async (t) => {
    const { app } = t.context

    // Clean up to test validation before installation check
    await Node.query().delete().where({ is_self: true })

    const payload = {
      node: {
        address: "0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG",
        url: "https://test.com",
        title: "Test",
      },
      settings: {},
    }

    const response = await app.inject({
      method: "POST",
      url: "/api/install",
      payload,
    })

    t.is(response.statusCode, 400, "should return 400 Bad Request")
    t.deepEqual(response.json(), {
      error: "VALIDATION_ERROR",
      message: "Invalid node address format",
    })
  },
)

// --- Test Suite: POST /install - Node URL Validation ---

test.serial(
  "POST /install should return 400 when node URL is missing",
  async (t) => {
    const { app } = t.context

    // Clean up to test validation before installation check
    await Node.query().delete().where({ is_self: true })

    const testAccount = generateTestAccount()

    const payload = {
      node: {
        address: testAccount.address,
        title: "Test",
      },
      settings: {},
    }

    const response = await app.inject({
      method: "POST",
      url: "/api/install",
      payload,
    })

    t.is(response.statusCode, 400, "should return 400 Bad Request")
    t.deepEqual(response.json(), {
      error: "VALIDATION_ERROR",
      message: "Node address, URL, and title are required",
    })
  },
)

test.serial(
  "POST /install should return 400 when node URL format is invalid",
  async (t) => {
    const { app } = t.context

    // Clean up to test validation before installation check
    await Node.query().delete().where({ is_self: true })

    const testAccount = generateTestAccount()

    const payload = {
      node: {
        address: testAccount.address,
        url: "not-a-valid-url",
        title: "Test",
      },
      settings: {},
    }

    const response = await app.inject({
      method: "POST",
      url: "/api/install",
      payload,
    })

    t.is(response.statusCode, 400, "should return 400 Bad Request")
    t.deepEqual(response.json(), {
      error: "VALIDATION_ERROR",
      message: "Invalid node URL format",
    })
  },
)

test.serial(
  "POST /install should accept http URL for development",
  async (t) => {
    const { app } = t.context

    // Drop all tables for clean installation
    await dropAllTables()

    const testAccount = generateTestAccount()

    const payload = {
      node: {
        address: testAccount.address,
        url: "http://localhost:3000",
        title: "Dev Node",
      },
      settings: {},
    }

    const response = await app.inject({
      method: "POST",
      url: "/api/install",
      payload,
    })

    t.is(response.statusCode, 200, "should return 200 OK")
  },
)

// --- Test Suite: POST /install - Node Title Validation ---

test.serial(
  "POST /install should return 400 when node title is missing",
  async (t) => {
    const { app } = t.context

    // Clean up to test validation before installation check
    await Node.query().delete().where({ is_self: true })

    const testAccount = generateTestAccount()

    const payload = {
      node: {
        address: testAccount.address,
        url: "https://test.com",
      },
      settings: {},
    }

    const response = await app.inject({
      method: "POST",
      url: "/api/install",
      payload,
    })

    t.is(response.statusCode, 400, "should return 400 Bad Request")
    t.deepEqual(response.json(), {
      error: "VALIDATION_ERROR",
      message: "Node address, URL, and title are required",
    })
  },
)

// --- Test Suite: POST /install - Avatar Validation ---

test.serial(
  "POST /install should return 400 when avatar format is invalid (not data URL)",
  async (t) => {
    const { app } = t.context

    // Clean up to test validation before installation check
    await Node.query().delete().where({ is_self: true })

    const testAccount = generateTestAccount()

    const payload = {
      node: {
        address: testAccount.address,
        url: "https://test.com",
        title: "Test",
        avatar: "https://example.com/avatar.png", // Invalid: not a data URL
      },
      settings: {},
    }

    const response = await app.inject({
      method: "POST",
      url: "/api/install",
      payload,
    })

    t.is(response.statusCode, 400, "should return 400 Bad Request")
    t.deepEqual(response.json(), {
      error: "VALIDATION_ERROR",
      message: "Invalid avatar format. Must be a data URL with image type.",
    })
  },
)

test.serial(
  "POST /install should return 400 when avatar is not an image type",
  async (t) => {
    const { app } = t.context

    // Clean up to test validation before installation check
    await Node.query().delete().where({ is_self: true })

    const testAccount = generateTestAccount()

    const payload = {
      node: {
        address: testAccount.address,
        url: "https://test.com",
        title: "Test",
        avatar: "data:text/plain;base64,SGVsbG8gV29ybGQ=", // Invalid: not an image
      },
      settings: {},
    }

    const response = await app.inject({
      method: "POST",
      url: "/api/install",
      payload,
    })

    t.is(response.statusCode, 400, "should return 400 Bad Request")
    t.deepEqual(response.json(), {
      error: "VALIDATION_ERROR",
      message: "Invalid avatar format. Must be a data URL with image type.",
    })
  },
)

test.serial("POST /install should accept webp avatar format", async (t) => {
  const { app } = t.context

  // Drop all tables for clean installation
  await dropAllTables()

  const testAccount = generateTestAccount()

  const payload = {
    node: {
      address: testAccount.address,
      url: "https://test.com",
      title: "Test",
      avatar:
        "data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=",
    },
    settings: {},
  }

  const response = await app.inject({
    method: "POST",
    url: "/api/install",
    payload,
  })

  t.is(response.statusCode, 200, "should return 200 OK")
})

test.serial("POST /install should accept gif avatar format", async (t) => {
  const { app } = t.context

  // Drop all tables for clean installation
  await dropAllTables()

  const testAccount = generateTestAccount()

  const payload = {
    node: {
      address: testAccount.address,
      url: "https://test.com",
      title: "Test",
      avatar:
        "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    },
    settings: {},
  }

  const response = await app.inject({
    method: "POST",
    url: "/api/install",
    payload,
  })

  t.is(response.statusCode, 200, "should return 200 OK")
})

test.serial(
  "POST /install should successfully install without avatar",
  async (t) => {
    const { app } = t.context

    // Drop all tables for clean installation
    await dropAllTables()

    const testAccount = generateTestAccount()

    const payload = {
      node: {
        address: testAccount.address,
        url: "https://test.com",
        title: "Test",
      },
      settings: {},
    }

    const response = await app.inject({
      method: "POST",
      url: "/api/install",
      payload,
    })

    t.is(response.statusCode, 200, "should return 200 OK")

    const avatar = await Setting.get("avatar")
    t.falsy(avatar, "avatar should not be saved when not provided")
  },
)

// --- Test Suite: POST /install - Already Installed ---

test.serial(
  "POST /install should return 403 when already installed",
  async (t) => {
    const { app } = t.context

    const testAccount = generateTestAccount()

    const payload = {
      node: {
        address: testAccount.address,
        url: "https://test.com",
        title: "Test",
      },
      settings: {},
    }

    const response = await app.inject({
      method: "POST",
      url: "/api/install",
      payload,
    })

    t.is(response.statusCode, 403, "should return 403 Forbidden")
    t.deepEqual(response.json(), {
      error: "ALREADY_INSTALLED",
      message: "System is already installed. Installation endpoint is locked.",
    })
  },
)

// --- Test Suite: POST /install - Optional Settings ---

test.serial(
  "POST /install should save mail settings when provided",
  async (t) => {
    const { app } = t.context

    // Drop all tables for clean installation
    await dropAllTables()

    const testAccount = generateTestAccount()

    const payload = {
      node: {
        address: testAccount.address,
        url: "https://test.com",
        title: "Test",
      },
      settings: {
        mailTransport: "smtp://mail.example.com",
        mailFrom: "admin@example.com",
      },
    }

    const response = await app.inject({
      method: "POST",
      url: "/api/install",
      payload,
    })

    t.is(response.statusCode, 200, "should return 200 OK")

    const mailTransport = await Setting.get("mail_transport")
    t.is(mailTransport, "smtp://mail.example.com")

    const mailFrom = await Setting.get("mail_from")
    t.is(mailFrom, "admin@example.com")
  },
)

test.serial(
  "POST /install should not save mail settings when not provided",
  async (t) => {
    const { app } = t.context

    // Drop all tables for clean installation
    await dropAllTables()

    const testAccount = generateTestAccount()

    const payload = {
      node: {
        address: testAccount.address,
        url: "https://test.com",
        title: "Test",
      },
      settings: {},
    }

    const response = await app.inject({
      method: "POST",
      url: "/api/install",
      payload,
    })

    t.is(response.statusCode, 200, "should return 200 OK")

    const mailTransport = await Setting.get("mail_transport")
    t.falsy(mailTransport, "mailTransport should not be saved")

    const mailFrom = await Setting.get("mail_from")
    t.falsy(mailFrom, "mailFrom should not be saved")
  },
)

test.serial(
  "POST /install should save WalletConnect project ID when provided",
  async (t) => {
    const { app } = t.context

    // Drop all tables for clean installation
    await dropAllTables()

    const testAccount = generateTestAccount()

    const payload = {
      node: {
        address: testAccount.address,
        url: "https://test.com",
        title: "Test",
      },
      settings: {
        walletConnectProjectId: "my-project-id",
      },
    }

    const response = await app.inject({
      method: "POST",
      url: "/api/install",
      payload,
    })

    t.is(response.statusCode, 200, "should return 200 OK")

    const projectId = await Setting.get("walletconnect_projectid")
    t.is(projectId, "my-project-id")
  },
)

test.serial(
  "POST /install should use custom language and theme when provided",
  async (t) => {
    const { app } = t.context

    // Drop all tables for clean installation
    await dropAllTables()

    const testAccount = generateTestAccount()

    const payload = {
      node: {
        address: testAccount.address,
        url: "https://test.com",
        title: "Test",
      },
      settings: {
        defaultLanguage: "zh",
        defaultTheme: "dark",
      },
    }

    const response = await app.inject({
      method: "POST",
      url: "/api/install",
      payload,
    })

    t.is(response.statusCode, 200, "should return 200 OK")

    const defaultLanguage = await Setting.get("default_language")
    t.is(defaultLanguage, "zh")

    const defaultTheme = await Setting.get("default_theme")
    t.is(defaultTheme, "dark")
  },
)

// --- Test Suite: POST /install - Edge Cases ---

test.serial(
  "POST /install should handle empty description with default value",
  async (t) => {
    const { app } = t.context

    // Drop all tables for clean installation
    await dropAllTables()

    const testAccount = generateTestAccount()

    const payload = {
      node: {
        address: testAccount.address,
        url: "https://test.com",
        title: "Test",
        description: "",
      },
      settings: {},
    }

    const response = await app.inject({
      method: "POST",
      url: "/api/install",
      payload,
    })

    t.is(response.statusCode, 200, "should return 200 OK")

    const selfNode = await Node.query().findOne({ is_self: true })
    t.is(selfNode.description, "Personal publishing node")
  },
)

test.serial(
  "POST /install should trim and validate node address case-insensitively",
  async (t) => {
    const { app } = t.context

    // Drop all tables for clean installation
    await dropAllTables()

    const payload = {
      node: {
        address: "0xABCDEF1234567890ABCDEF1234567890ABCDEF12",
        url: "https://test.com",
        title: "Test",
      },
      settings: {},
    }

    const response = await app.inject({
      method: "POST",
      url: "/api/install",
      payload,
    })

    t.is(response.statusCode, 200, "should return 200 OK")

    const selfNode = await Node.query().findOne({ is_self: true })
    t.truthy(selfNode, "node should be created with uppercase address")
  },
)

test.serial(
  "POST /install should set profile_version to 0 for new node",
  async (t) => {
    const { app } = t.context

    // Drop all tables for clean installation
    await dropAllTables()

    const testAccount = generateTestAccount()

    const payload = {
      node: {
        address: testAccount.address,
        url: "https://test.com",
        title: "Test",
      },
      settings: {},
    }

    const response = await app.inject({
      method: "POST",
      url: "/api/install",
      payload,
    })

    t.is(response.statusCode, 200, "should return 200 OK")

    const selfNode = await Node.query().findOne({ is_self: true })
    t.is(selfNode.profile_version, 0, "profile_version should be 0")
  },
)

test.serial(
  "POST /install should generate unique JWT secret on each installation",
  async (t) => {
    const { app } = t.context

    // Drop all tables for clean installation
    await dropAllTables()

    const testAccount1 = generateTestAccount()

    const payload1 = {
      node: {
        address: testAccount1.address,
        url: "https://test1.com",
        title: "Test 1",
      },
      settings: {},
    }

    await app.inject({
      method: "POST",
      url: "/api/install",
      payload: payload1,
    })

    const jwtSecret1 = await Setting.get("jwt_secret")

    // Clean up and install again
    await dropAllTables()

    const testAccount2 = generateTestAccount()

    const payload2 = {
      node: {
        address: testAccount2.address,
        url: "https://test2.com",
        title: "Test 2",
      },
      settings: {},
    }

    await app.inject({
      method: "POST",
      url: "/api/install",
      payload: payload2,
    })

    const jwtSecret2 = await Setting.get("jwt_secret")

    t.not(
      jwtSecret1,
      jwtSecret2,
      "JWT secrets should be different for each installation",
    )
  },
)

// --- Test Suite: POST /install - Complex Scenarios ---

test.serial(
  "POST /install should handle all optional fields together",
  async (t) => {
    const { app } = t.context

    // Drop all tables for clean installation
    await dropAllTables()

    const testAccount = generateTestAccount()
    const avatarDataUrl = generateValidAvatarDataUrl()

    const payload = {
      node: {
        address: testAccount.address,
        url: "https://full-featured-node.example.com",
        title: "Full Featured Node",
        description: "A node with all features enabled",
        avatar: avatarDataUrl,
      },
      settings: {
        mailTransport: "smtp://mail.example.com:587",
        mailFrom: "noreply@example.com",
        defaultLanguage: "zh",
        defaultTheme: "dark",
        walletConnectProjectId: "full-project-id-67890",
      },
    }

    const response = await app.inject({
      method: "POST",
      url: "/api/install",
      payload,
    })

    t.is(response.statusCode, 200, "should return 200 OK")

    // Verify all settings are saved correctly
    const allSettings = await Setting.query()
    const settingsMap = {}
    allSettings.forEach((s) => {
      settingsMap[s.key] = s.value
    })

    t.truthy(settingsMap.jwt_secret)
    t.is(settingsMap.jwt_expires_in, "24h")
    t.is(settingsMap.mail_transport, "smtp://mail.example.com:587")
    t.is(settingsMap.mail_from, "noreply@example.com")
    t.is(settingsMap.default_language, "zh")
    t.is(settingsMap.default_theme, "dark")
    t.is(settingsMap.walletconnect_projectid, "full-project-id-67890")
    t.is(settingsMap.avatar, avatarDataUrl)
    t.is(settingsMap.allow_comment, "true")
    t.is(settingsMap.enable_rss, "true")
    t.is(settingsMap.allow_follow, "true")
  },
)

test.serial("POST /install should handle long node descriptions", async (t) => {
  const { app } = t.context

  // Drop all tables for clean installation
  await dropAllTables()

  const testAccount = generateTestAccount()
  const longDescription = "A".repeat(1000)

  const payload = {
    node: {
      address: testAccount.address,
      url: "https://test.com",
      title: "Test",
      description: longDescription,
    },
    settings: {},
  }

  const response = await app.inject({
    method: "POST",
    url: "/api/install",
    payload,
  })

  t.is(response.statusCode, 200, "should return 200 OK")

  const selfNode = await Node.query().findOne({ is_self: true })
  t.is(selfNode.description, longDescription)
})

test.serial(
  "POST /install should handle special characters in node title",
  async (t) => {
    const { app } = t.context

    // Drop all tables for clean installation
    await dropAllTables()

    const testAccount = generateTestAccount()

    const payload = {
      node: {
        address: testAccount.address,
        url: "https://test.com",
        title: "Test Node with 特殊字符 & <symbols> 'quotes' \"double\"",
      },
      settings: {},
    }

    const response = await app.inject({
      method: "POST",
      url: "/api/install",
      payload,
    })

    t.is(response.statusCode, 200, "should return 200 OK")

    const selfNode = await Node.query().findOne({ is_self: true })
    t.is(
      selfNode.title,
      "Test Node with 特殊字符 & <symbols> 'quotes' \"double\"",
    )
  },
)

test.serial("POST /install should handle URLs with ports", async (t) => {
  const { app } = t.context

  // Drop all tables for clean installation
  await dropAllTables()

  const testAccount = generateTestAccount()

  const payload = {
    node: {
      address: testAccount.address,
      url: "https://example.com:8080",
      title: "Test",
    },
    settings: {},
  }

  const response = await app.inject({
    method: "POST",
    url: "/api/install",
    payload,
  })

  t.is(response.statusCode, 200, "should return 200 OK")

  const selfNode = await Node.query().findOne({ is_self: true })
  t.is(selfNode.url, "https://example.com:8080")
})

test.serial("POST /install should handle URLs with paths", async (t) => {
  const { app } = t.context

  // Drop all tables for clean installation
  await dropAllTables()

  const testAccount = generateTestAccount()

  const payload = {
    node: {
      address: testAccount.address,
      url: "https://example.com/my-node",
      title: "Test",
    },
    settings: {},
  }

  const response = await app.inject({
    method: "POST",
    url: "/api/install",
    payload,
  })

  t.is(response.statusCode, 200, "should return 200 OK")

  const selfNode = await Node.query().findOne({ is_self: true })
  t.is(selfNode.url, "https://example.com/my-node")
})

// --- Test Suite: POST /install - Malformed Payload ---

test.serial(
  "POST /install should return 400 for completely empty payload",
  async (t) => {
    const { app } = t.context

    // Clean up to test validation before installation check
    await Node.query().delete().where({ is_self: true })

    const response = await app.inject({
      method: "POST",
      url: "/api/install",
      payload: {},
    })

    t.is(response.statusCode, 400, "should return 400 Bad Request")
    t.deepEqual(response.json(), {
      error: "VALIDATION_ERROR",
      message: "Request must contain 'node' and 'settings' objects",
    })
  },
)

test.serial(
  "POST /install should return 400 for null node object",
  async (t) => {
    const { app } = t.context

    // Clean up to test validation before installation check
    await Node.query().delete().where({ is_self: true })

    const payload = {
      node: null,
      settings: {},
    }

    const response = await app.inject({
      method: "POST",
      url: "/api/install",
      payload,
    })

    t.is(response.statusCode, 400, "should return 400 Bad Request")
    t.deepEqual(response.json(), {
      error: "VALIDATION_ERROR",
      message: "Request must contain 'node' and 'settings' objects",
    })
  },
)

test.serial(
  "POST /install should return 400 for null settings object",
  async (t) => {
    const { app } = t.context

    // Clean up to test validation before installation check
    await Node.query().delete().where({ is_self: true })

    const testAccount = generateTestAccount()

    const payload = {
      node: {
        address: testAccount.address,
        url: "https://test.com",
        title: "Test",
      },
      settings: null,
    }

    const response = await app.inject({
      method: "POST",
      url: "/api/install",
      payload,
    })

    t.is(response.statusCode, 400, "should return 400 Bad Request")
    t.deepEqual(response.json(), {
      error: "VALIDATION_ERROR",
      message: "Request must contain 'node' and 'settings' objects",
    })
  },
)

// --- Test Suite: POST /install - Security Considerations ---

test.serial(
  "POST /install should not expose JWT secret in response",
  async (t) => {
    const { app } = t.context

    // Drop all tables for clean installation
    await dropAllTables()

    const testAccount = generateTestAccount()

    const payload = {
      node: {
        address: testAccount.address,
        url: "https://test.com",
        title: "Test",
      },
      settings: {},
    }

    const response = await app.inject({
      method: "POST",
      url: "/api/install",
      payload,
    })

    const body = response.json()
    t.falsy(body.jwt_secret, "JWT secret should not be in response")
    t.falsy(body.settings, "Settings should not be exposed in response")
  },
)

test.serial(
  "POST /install should store JWT secret with correct length",
  async (t) => {
    const { app } = t.context

    // Drop all tables for clean installation
    await dropAllTables()

    const testAccount = generateTestAccount()

    const payload = {
      node: {
        address: testAccount.address,
        url: "https://test.com",
        title: "Test",
      },
      settings: {},
    }

    await app.inject({
      method: "POST",
      url: "/api/install",
      payload,
    })

    const jwtSecret = await Setting.get("jwt_secret")
    t.is(
      jwtSecret.length,
      64,
      "JWT secret should be 64 characters (32 bytes hex)",
    )
    t.regex(jwtSecret, /^[0-9a-f]{64}$/, "JWT secret should be hex string")
  },
)

// --- Test Suite: POST /install - Content Type and Encoding ---

test.serial(
  "POST /install should accept application/json content type",
  async (t) => {
    const { app } = t.context

    // Drop all tables for clean installation
    await dropAllTables()

    const testAccount = generateTestAccount()

    const payload = {
      node: {
        address: testAccount.address,
        url: "https://test.com",
        title: "Test",
      },
      settings: {},
    }

    const response = await app.inject({
      method: "POST",
      url: "/api/install",
      headers: {
        "content-type": "application/json",
      },
      payload,
    })

    t.is(response.statusCode, 200, "should return 200 OK")
  },
)

test.serial(
  "POST /install should handle unicode characters in all fields",
  async (t) => {
    const { app } = t.context

    // Drop all tables for clean installation
    await dropAllTables()

    const testAccount = generateTestAccount()

    const payload = {
      node: {
        address: testAccount.address,
        url: "https://测试.example.com",
        title: "测试节点 🚀",
        description: "这是一个测试节点 with émojis 🎉",
      },
      settings: {
        mailFrom: "测试@example.com",
      },
    }

    const response = await app.inject({
      method: "POST",
      url: "/api/install",
      payload,
    })

    t.is(response.statusCode, 200, "should return 200 OK")

    const selfNode = await Node.query().findOne({ is_self: true })
    t.is(selfNode.title, "测试节点 🚀")
    t.is(selfNode.description, "这是一个测试节点 with émojis 🎉")
  },
)

// --- Test Suite: POST /install - Response Format Validation ---

test.serial(
  "POST /install should return correct response structure on success",
  async (t) => {
    const { app } = t.context

    // Drop all tables for clean installation
    await dropAllTables()

    const testAccount = generateTestAccount()

    const payload = {
      node: {
        address: testAccount.address,
        url: "https://test.com",
        title: "Test Node",
        description: "Test Description",
      },
      settings: {},
    }

    const response = await app.inject({
      method: "POST",
      url: "/api/install",
      payload,
    })

    const body = response.json()

    t.is(typeof body.success, "boolean")
    t.is(body.success, true)
    t.is(typeof body.message, "string")
    t.truthy(body.node)
    t.is(typeof body.node.address, "string")
    t.is(typeof body.node.url, "string")
    t.is(typeof body.node.title, "string")
    t.is(typeof body.node.description, "string")
  },
)

// --- Test Suite: POST /install - Default Settings Verification ---

test.serial("POST /install should set correct default settings", async (t) => {
  const { app } = t.context

  // Drop all tables for clean installation
  await dropAllTables()

  const testAccount = generateTestAccount()

  const payload = {
    node: {
      address: testAccount.address,
      url: "https://test.com",
      title: "Test",
    },
    settings: {},
  }

  await app.inject({
    method: "POST",
    url: "/api/install",
    payload,
  })

  const allowComment = await Setting.get("allow_comment")
  t.is(allowComment, "true", "allow_comment should default to true")

  const enableRss = await Setting.get("enable_rss")
  t.is(enableRss, "true", "enable_rss should default to true")

  const allowFollow = await Setting.get("allow_follow")
  t.is(allowFollow, "true", "allow_follow should default to true")

  const jwtExpiresIn = await Setting.get("jwt_expires_in")
  t.is(jwtExpiresIn, "24h", "jwt_expires_in should default to 24h")
})

// --- Test Suite: Data Persistence and Integrity ---

test.serial(
  "POST /install should persist all data correctly after installation",
  async (t) => {
    const { app } = t.context

    // Drop all tables for clean installation
    await dropAllTables()

    const testAccount = generateTestAccount()
    const avatarDataUrl = generateValidAvatarDataUrl()

    const payload = {
      node: {
        address: testAccount.address,
        url: "https://persistence-test.com",
        title: "Persistence Test",
        description: "Testing data persistence",
        avatar: avatarDataUrl,
      },
      settings: {
        mailTransport: "smtp://mail.test.com",
        mailFrom: "test@test.com",
        defaultLanguage: "zh",
        defaultTheme: "dark",
        walletConnectProjectId: "persist-id",
      },
    }

    await app.inject({
      method: "POST",
      url: "/api/install",
      payload,
    })

    // Verify node persisted correctly
    const nodes = await Node.query().where({ is_self: true })
    t.is(nodes.length, 1, "should have exactly one self node")

    const selfNode = nodes[0]
    t.is(selfNode.address, testAccount.address)
    t.is(selfNode.url, "https://persistence-test.com")
    t.is(selfNode.title, "Persistence Test")
    t.is(selfNode.description, "Testing data persistence")
    t.is(selfNode.is_self, 1) // SQLite stores boolean as 0/1

    // Verify settings persisted correctly
    const allSettings = await Setting.query()
    t.true(allSettings.length >= 10, "should have at least 10 settings")

    // Verify each setting individually
    const avatar = await Setting.get("avatar")
    t.is(avatar, avatarDataUrl)

    const mailTransport = await Setting.get("mail_transport")
    t.is(mailTransport, "smtp://mail.test.com")
  },
)
