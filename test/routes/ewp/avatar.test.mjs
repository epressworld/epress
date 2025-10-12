import test from "ava"
import "../../setup.mjs"
import { Setting } from "../../../server/models/index.mjs"

// Constants for image data
const SMALL_PNG_BASE64 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
const SMALL_PNG_BUFFER = Buffer.from(SMALL_PNG_BASE64.split(",")[1], "base64")

const SMALL_JPEG_BASE64 =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDABALDAwMChAMDBAPHBEYCgYICQoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCv/2wBDARwMDAwMChAMDBAPHBEYCgYICQoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCv/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AKgAD//Z"
const SMALL_JPEG_BUFFER = Buffer.from(SMALL_JPEG_BASE64.split(",")[1], "base64")

const DEFAULT_AVATAR_BASE64 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
const DEFAULT_AVATAR_BUFFER = Buffer.from(
  DEFAULT_AVATAR_BASE64.split(",")[1],
  "base64",
)

// Test cases
test.serial("GET /avatar should return PNG avatar successfully", async (t) => {
  await Setting.query().delete().where({ key: "avatar" })
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
  await Setting.query().delete().where({ key: "avatar" })
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

test("GET /avatar should return default avatar if no custom avatar is set", async (t) => {
  // Arrange: No avatar setting (ensured by beforeEach)
  await Setting.query().delete().where({ key: "avatar" })

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
})

test("GET /avatar should return default avatar if avatar setting value is empty", async (t) => {
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
})
