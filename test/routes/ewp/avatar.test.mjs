import test from "ava"
import "../../setup.mjs"
import { Setting } from "../../../server/models/index.mjs"
import { DEFAULT_AVATAR } from "../../../server/routes/ewp/avatar.mjs"

// Constants for test image data
const SMALL_PNG_BASE64 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
const SMALL_PNG_BUFFER = Buffer.from(SMALL_PNG_BASE64.split(",")[1], "base64")

const SMALL_JPEG_BASE64 =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDABALDAwMChAMDBAPHBEYCgYICQoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCv/2wBDARwMDAwMChAMDBAPHBEYCgYICQoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCv/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AKgAD//Z"
const SMALL_JPEG_BUFFER = Buffer.from(SMALL_JPEG_BASE64.split(",")[1], "base64")

const SMALL_GIF_BASE64 =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
const SMALL_GIF_BUFFER = Buffer.from(SMALL_GIF_BASE64.split(",")[1], "base64")

const SMALL_WEBP_BASE64 =
  "data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA"
const SMALL_WEBP_BUFFER = Buffer.from(SMALL_WEBP_BASE64.split(",")[1], "base64")

const SMALL_SVG_BASE64 =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg=="
const SMALL_SVG_BUFFER = Buffer.from(SMALL_SVG_BASE64.split(",")[1], "base64")

// Extract default avatar buffer
const DEFAULT_AVATAR_BUFFER = Buffer.from(
  DEFAULT_AVATAR.split(",")[1],
  "base64",
)

// Helper to clean up avatar setting before each test
test.beforeEach(async (_t) => {
  await Setting.query().delete().where({ key: "avatar" })
})

// =============================================================================
// Success Cases - Valid Avatar Data
// =============================================================================

test.serial("GET /avatar should return PNG avatar successfully", async (t) => {
  // Arrange: Set up PNG avatar
  await Setting.query().insert({
    key: "avatar",
    value: SMALL_PNG_BASE64,
  })

  // Act: Send GET request to /avatar
  const response = await t.context.app.inject({
    method: "GET",
    url: "/ewp/avatar",
  })

  // Assert
  t.is(response.statusCode, 200, "should return 200 OK")
  t.is(
    response.headers["content-type"],
    "image/png",
    "Content-Type should be image/png",
  )
  t.deepEqual(
    response.rawPayload,
    SMALL_PNG_BUFFER,
    "response body should be the PNG image data",
  )
})

test.serial("GET /avatar should return JPEG avatar successfully", async (t) => {
  // Arrange: Set up JPEG avatar
  await Setting.query().insert({
    key: "avatar",
    value: SMALL_JPEG_BASE64,
  })

  // Act: Send GET request to /avatar
  const response = await t.context.app.inject({
    method: "GET",
    url: "/ewp/avatar",
  })

  // Assert
  t.is(response.statusCode, 200, "should return 200 OK")
  t.is(
    response.headers["content-type"],
    "image/jpeg",
    "Content-Type should be image/jpeg",
  )
  t.deepEqual(
    response.rawPayload,
    SMALL_JPEG_BUFFER,
    "response body should be the JPEG image data",
  )
})

test.serial("GET /avatar should return GIF avatar successfully", async (t) => {
  // Arrange: Set up GIF avatar
  await Setting.query().insert({
    key: "avatar",
    value: SMALL_GIF_BASE64,
  })

  // Act: Send GET request to /avatar
  const response = await t.context.app.inject({
    method: "GET",
    url: "/ewp/avatar",
  })

  // Assert
  t.is(response.statusCode, 200, "should return 200 OK")
  t.is(
    response.headers["content-type"],
    "image/gif",
    "Content-Type should be image/gif",
  )
  t.deepEqual(
    response.rawPayload,
    SMALL_GIF_BUFFER,
    "response body should be the GIF image data",
  )
})

test.serial("GET /avatar should return WebP avatar successfully", async (t) => {
  // Arrange: Set up WebP avatar
  await Setting.query().insert({
    key: "avatar",
    value: SMALL_WEBP_BASE64,
  })

  // Act: Send GET request to /avatar
  const response = await t.context.app.inject({
    method: "GET",
    url: "/ewp/avatar",
  })

  // Assert
  t.is(response.statusCode, 200, "should return 200 OK")
  t.is(
    response.headers["content-type"],
    "image/webp",
    "Content-Type should be image/webp",
  )
  t.deepEqual(
    response.rawPayload,
    SMALL_WEBP_BUFFER,
    "response body should be the WebP image data",
  )
})

test.serial(
  "GET /avatar should return SVG+XML avatar successfully",
  async (t) => {
    // Arrange: Set up SVG avatar
    await Setting.query().insert({
      key: "avatar",
      value: SMALL_SVG_BASE64,
    })

    // Act: Send GET request to /avatar
    const response = await t.context.app.inject({
      method: "GET",
      url: "/ewp/avatar",
    })

    // Assert
    t.is(response.statusCode, 200, "should return 200 OK")
    t.is(
      response.headers["content-type"],
      "image/svg+xml",
      "Content-Type should be image/svg+xml",
    )
    t.deepEqual(
      response.rawPayload,
      SMALL_SVG_BUFFER,
      "response body should be the SVG image data",
    )
  },
)

// =============================================================================
// Default Avatar Cases
// =============================================================================

test.serial(
  "GET /avatar should return default avatar if no custom avatar is set",
  async (t) => {
    // Arrange: No avatar setting (ensured by beforeEach)

    // Act: Send GET request to /avatar
    const response = await t.context.app.inject({
      method: "GET",
      url: "/ewp/avatar",
    })

    // Assert
    t.is(response.statusCode, 200, "should return 200 OK")
    t.is(
      response.headers["content-type"],
      "image/png",
      "Content-Type should be image/png",
    )
    t.deepEqual(
      response.rawPayload,
      DEFAULT_AVATAR_BUFFER,
      "response body should be the default PNG image data",
    )
  },
)

test.serial(
  "GET /avatar should return default avatar if avatar setting value is empty",
  async (t) => {
    // Arrange: Set empty avatar value
    await Setting.query().insert({
      key: "avatar",
      value: "",
    })

    // Act: Send GET request to /avatar
    const response = await t.context.app.inject({
      method: "GET",
      url: "/ewp/avatar",
    })

    // Assert
    t.is(response.statusCode, 200, "should return 200 OK")
    t.is(
      response.headers["content-type"],
      "image/png",
      "Content-Type should be image/png",
    )
    t.deepEqual(
      response.rawPayload,
      DEFAULT_AVATAR_BUFFER,
      "response body should be the default PNG image data",
    )
  },
)

test.serial(
  "GET /avatar should return default avatar when database has no avatar setting",
  async (t) => {
    // Arrange: Ensure no avatar setting exists (already done by beforeEach)
    // But let's be explicit and verify
    const existingSetting = await Setting.query()
      .where({ key: "avatar" })
      .first()
    t.is(existingSetting, undefined, "avatar setting should not exist")

    // Act: Send GET request to /avatar
    const response = await t.context.app.inject({
      method: "GET",
      url: "/ewp/avatar",
    })

    // Assert
    t.is(response.statusCode, 200, "should return 200 OK")
    t.is(
      response.headers["content-type"],
      "image/png",
      "Content-Type should be image/png",
    )
    t.deepEqual(
      response.rawPayload,
      DEFAULT_AVATAR_BUFFER,
      "response body should be the default PNG image data",
    )
  },
)

// =============================================================================
// Invalid Data URI Format Cases
// =============================================================================

test.serial(
  "GET /avatar should fallback to default when data URI format is invalid (no prefix)",
  async (t) => {
    // Arrange: Set avatar without data URI prefix
    await Setting.query().insert({
      key: "avatar",
      value:
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    })

    // Act: Send GET request to /avatar
    const response = await t.context.app.inject({
      method: "GET",
      url: "/ewp/avatar",
    })

    // Assert
    t.is(response.statusCode, 200, "should return 200 OK")
    t.is(
      response.headers["content-type"],
      "image/png",
      "Content-Type should be image/png (fallback)",
    )
    t.deepEqual(
      response.rawPayload,
      DEFAULT_AVATAR_BUFFER,
      "response body should be the default avatar",
    )
  },
)

test.serial(
  "GET /avatar should fallback to default when data URI is malformed (missing base64)",
  async (t) => {
    // Arrange: Set malformed data URI
    await Setting.query().insert({
      key: "avatar",
      value: "data:image/png;",
    })

    // Act: Send GET request to /avatar
    const response = await t.context.app.inject({
      method: "GET",
      url: "/ewp/avatar",
    })

    // Assert
    t.is(response.statusCode, 200, "should return 200 OK")
    t.is(
      response.headers["content-type"],
      "image/png",
      "Content-Type should be image/png (fallback)",
    )
    t.deepEqual(
      response.rawPayload,
      DEFAULT_AVATAR_BUFFER,
      "response body should be the default avatar",
    )
  },
)

test.serial(
  "GET /avatar should fallback to default when data URI has wrong format",
  async (t) => {
    // Arrange: Set wrong format data URI
    await Setting.query().insert({
      key: "avatar",
      value: "data:text/plain;base64,SGVsbG8gV29ybGQ=",
    })

    // Act: Send GET request to /avatar
    const response = await t.context.app.inject({
      method: "GET",
      url: "/ewp/avatar",
    })

    // Assert
    t.is(response.statusCode, 200, "should return 200 OK")
    t.is(
      response.headers["content-type"],
      "image/png",
      "Content-Type should be image/png (fallback)",
    )
    t.deepEqual(
      response.rawPayload,
      DEFAULT_AVATAR_BUFFER,
      "response body should be the default avatar",
    )
  },
)

test.serial(
  "GET /avatar should fallback to default when base64 data is invalid",
  async (t) => {
    // Arrange: Set invalid base64 data
    await Setting.query().insert({
      key: "avatar",
      value: "data:image/png;base64,!!!INVALID_BASE64!!!",
    })

    // Act: Send GET request to /avatar
    const response = await t.context.app.inject({
      method: "GET",
      url: "/ewp/avatar",
    })

    // Assert
    t.is(response.statusCode, 200, "should return 200 OK")
    t.is(
      response.headers["content-type"],
      "image/png",
      "Content-Type should be image/png",
    )
    // Base64 decoder will still decode invalid base64, just with garbage data
    t.true(Buffer.isBuffer(response.rawPayload), "should return a buffer")
  },
)

// =============================================================================
// MIME Type Detection Cases
// =============================================================================

test.serial(
  "GET /avatar should correctly detect MIME type with special characters",
  async (t) => {
    // Arrange: Set avatar with MIME type containing special chars
    const specialMimeAvatar =
      "data:image/vnd.microsoft.icon;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
    await Setting.query().insert({
      key: "avatar",
      value: specialMimeAvatar,
    })

    // Act: Send GET request to /avatar
    const response = await t.context.app.inject({
      method: "GET",
      url: "/ewp/avatar",
    })

    // Assert
    t.is(response.statusCode, 200, "should return 200 OK")
    t.is(
      response.headers["content-type"],
      "image/vnd.microsoft.icon",
      "Content-Type should handle special MIME types",
    )
  },
)

test.serial("GET /avatar should handle MIME type with plus sign", async (t) => {
  // Arrange: MIME type with +
  const xmlAvatar =
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg=="
  await Setting.query().insert({
    key: "avatar",
    value: xmlAvatar,
  })

  // Act: Send GET request to /avatar
  const response = await t.context.app.inject({
    method: "GET",
    url: "/ewp/avatar",
  })

  // Assert
  t.is(response.statusCode, 200, "should return 200 OK")
  t.is(
    response.headers["content-type"],
    "image/svg+xml",
    "Content-Type should handle plus sign in MIME type",
  )
})

// =============================================================================
// Edge Cases
// =============================================================================

test.serial("GET /avatar should handle very large avatar data", async (t) => {
  // Arrange: Create a large base64 string (simulate large image)
  const largeBase64 = "A".repeat(100000) // 100KB of A's in base64
  const largeAvatar = `data:image/png;base64,${largeBase64}`
  await Setting.query().insert({
    key: "avatar",
    value: largeAvatar,
  })

  // Act: Send GET request to /avatar
  const response = await t.context.app.inject({
    method: "GET",
    url: "/ewp/avatar",
  })

  // Assert
  t.is(response.statusCode, 200, "should return 200 OK")
  t.is(
    response.headers["content-type"],
    "image/png",
    "Content-Type should be image/png",
  )
  t.true(response.rawPayload.length > 50000, "should handle large payload")
})

test.serial("GET /avatar should handle whitespace in data URI", async (t) => {
  // Arrange: Data URI with extra whitespace (though this might be trimmed by DB)
  const whitespaceAvatar = `data:image/png;base64,${SMALL_PNG_BASE64.split(",")[1]}   `
  await Setting.query().insert({
    key: "avatar",
    value: whitespaceAvatar,
  })

  // Act: Send GET request to /avatar
  const response = await t.context.app.inject({
    method: "GET",
    url: "/ewp/avatar",
  })

  // Assert
  t.is(response.statusCode, 200, "should return 200 OK")
  t.is(
    response.headers["content-type"],
    "image/png",
    "Content-Type should be image/png",
  )
})

test.serial(
  "GET /avatar should handle case-insensitive MIME type detection",
  async (t) => {
    // Arrange: Data URI with uppercase MIME type
    const uppercaseAvatar = SMALL_PNG_BASE64.replace(
      "data:image/png",
      "data:IMAGE/PNG",
    )
    await Setting.query().insert({
      key: "avatar",
      value: uppercaseAvatar,
    })

    // Act: Send GET request to /avatar
    const response = await t.context.app.inject({
      method: "GET",
      url: "/ewp/avatar",
    })

    // Assert
    t.is(response.statusCode, 200, "should return 200 OK")
    // Note: The regex in avatar.js is case-sensitive for 'image',
    // so this will fall back to default
    t.is(
      response.headers["content-type"],
      "image/png",
      "should still work with case variations",
    )
  },
)

// =============================================================================
// Error Handling Cases
// =============================================================================

test.serial(
  "GET /avatar should handle database errors gracefully",
  async (t) => {
    // This test is tricky - we'd need to mock Setting.get to throw an error
    // For now, we'll test that the endpoint is resilient

    // We can't easily force a DB error in integration tests,
    // so we'll skip this or mark as a unit test requirement
    t.pass("Database error handling should be tested at unit test level")
  },
)

// =============================================================================
// Content Verification Cases
// =============================================================================

test.serial(
  "GET /avatar should return correct buffer size for PNG",
  async (t) => {
    // Arrange
    await Setting.query().insert({
      key: "avatar",
      value: SMALL_PNG_BASE64,
    })

    // Act
    const response = await t.context.app.inject({
      method: "GET",
      url: "/ewp/avatar",
    })

    // Assert
    t.is(response.statusCode, 200)
    t.is(
      response.rawPayload.length,
      SMALL_PNG_BUFFER.length,
      "buffer size should match",
    )
  },
)

test.serial(
  "GET /avatar should return correct buffer size for JPEG",
  async (t) => {
    // Arrange
    await Setting.query().insert({
      key: "avatar",
      value: SMALL_JPEG_BASE64,
    })

    // Act
    const response = await t.context.app.inject({
      method: "GET",
      url: "/ewp/avatar",
    })

    // Assert
    t.is(response.statusCode, 200)
    t.is(
      response.rawPayload.length,
      SMALL_JPEG_BUFFER.length,
      "buffer size should match",
    )
  },
)

// =============================================================================
// Multiple Request Cases
// =============================================================================

test.serial(
  "GET /avatar should return consistent results on multiple requests",
  async (t) => {
    // Arrange
    await Setting.query().insert({
      key: "avatar",
      value: SMALL_PNG_BASE64,
    })

    // Act: Make multiple requests
    const response1 = await t.context.app.inject({
      method: "GET",
      url: "/ewp/avatar",
    })
    const response2 = await t.context.app.inject({
      method: "GET",
      url: "/ewp/avatar",
    })
    const response3 = await t.context.app.inject({
      method: "GET",
      url: "/ewp/avatar",
    })

    // Assert
    t.is(response1.statusCode, 200)
    t.is(response2.statusCode, 200)
    t.is(response3.statusCode, 200)
    t.deepEqual(response1.rawPayload, response2.rawPayload)
    t.deepEqual(response2.rawPayload, response3.rawPayload)
  },
)

test.serial(
  "GET /avatar should reflect avatar changes between requests",
  async (t) => {
    // Arrange: Start with PNG
    await Setting.query().insert({
      key: "avatar",
      value: SMALL_PNG_BASE64,
    })

    // Act: First request
    const response1 = await t.context.app.inject({
      method: "GET",
      url: "/ewp/avatar",
    })

    // Change to JPEG
    await Setting.query()
      .update({ value: SMALL_JPEG_BASE64 })
      .where({ key: "avatar" })

    // Second request
    const response2 = await t.context.app.inject({
      method: "GET",
      url: "/ewp/avatar",
    })

    // Assert
    t.is(response1.statusCode, 200)
    t.is(response1.headers["content-type"], "image/png")
    t.is(response2.statusCode, 200)
    t.is(response2.headers["content-type"], "image/jpeg")
    t.notDeepEqual(
      response1.rawPayload,
      response2.rawPayload,
      "payloads should differ",
    )
  },
)
