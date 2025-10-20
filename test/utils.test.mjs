import { Readable } from "node:stream"
import test from "ava"
import { aes, base64, hash } from "../server/utils/crypto.mjs"
import { extractFileNameFromContentDisposition } from "../server/utils/helper.mjs"

// ==================== crypto.js - AES 加密/解密测试 ====================

test("aes.encrypt should encrypt text successfully", (t) => {
  const testKey = "my-secret-key"
  const testText = "Hello, World!"

  const encrypted = aes.encrypt(testKey, testText)

  t.truthy(encrypted)
  t.true(encrypted.includes(":"))

  const parts = encrypted.split(":")
  t.is(parts.length, 2)
  t.is(parts[0].length, 32) // IV is 16 bytes = 32 hex chars
})

test("aes.encrypt should generate different IV for each encryption", (t) => {
  const testKey = "my-secret-key"
  const testText = "Hello, World!"

  const encrypted1 = aes.encrypt(testKey, testText)
  const encrypted2 = aes.encrypt(testKey, testText)

  t.not(encrypted1, encrypted2)
  t.not(encrypted1.split(":")[0], encrypted2.split(":")[0])
})

test("aes.encrypt should encrypt empty string", (t) => {
  const encrypted = aes.encrypt("key", "")

  t.truthy(encrypted)
  t.true(encrypted.includes(":"))
})

test("aes.encrypt should encrypt unicode text", (t) => {
  const unicodeText = "你好世界 🌍"
  const encrypted = aes.encrypt("key", unicodeText)

  t.truthy(encrypted)
  t.true(encrypted.includes(":"))
})

test("aes.decrypt should decrypt encrypted text correctly", (t) => {
  const testKey = "my-secret-key"
  const testText = "Hello, World!"

  const encrypted = aes.encrypt(testKey, testText)
  const decrypted = aes.decrypt(testKey, encrypted)

  t.is(decrypted, testText)
})

test("aes.decrypt should decrypt empty string", (t) => {
  const testKey = "my-secret-key"

  const encrypted = aes.encrypt(testKey, "")
  const decrypted = aes.decrypt(testKey, encrypted)

  t.is(decrypted, "")
})

test("aes.decrypt should decrypt unicode text", (t) => {
  const unicodeText = "你好世界 🌍"
  const testKey = "my-secret-key"

  const encrypted = aes.encrypt(testKey, unicodeText)
  const decrypted = aes.decrypt(testKey, encrypted)

  t.is(decrypted, unicodeText)
})

test("aes.decrypt should handle encrypted text with multiple colons in original", (t) => {
  const testKey = "my-secret-key"
  const textWithColons = "test:with:colons"

  const encrypted = aes.encrypt(testKey, textWithColons)
  const decrypted = aes.decrypt(testKey, encrypted)

  t.is(decrypted, textWithColons)
})

test("aes.decrypt should throw error with wrong key", (t) => {
  const testText = "Hello, World!"
  const encrypted = aes.encrypt("correct-key", testText)

  t.throws(() => {
    aes.decrypt("wrong-key", encrypted)
  })
})

test("aes.decrypt should throw error with invalid encrypted text", (t) => {
  t.throws(() => {
    aes.decrypt("key", "invalid:data")
  })
})

// ==================== crypto.js - Hash 函数测试 ====================

test("hash.md5 should generate MD5 hash", (t) => {
  const result = hash.md5("Hello, World!")

  t.is(result, "65a8e27d8879283831b664bd8b7f0ad4")
  t.is(result.length, 32)
})

test("hash.md5 should generate MD5 hash for empty string", (t) => {
  const result = hash.md5("")

  t.is(result, "d41d8cd98f00b204e9800998ecf8427e")
})

test("hash.md5 should generate consistent MD5 hash", (t) => {
  const text = "Test content"
  const result1 = hash.md5(text)
  const result2 = hash.md5(text)

  t.is(result1, result2)
})

test("hash.sha1 should generate SHA1 hash", (t) => {
  const result = hash.sha1("Hello, World!")

  t.is(result, "0a0a9f2a6772942557ab5355d76af442f8f65e01")
  t.is(result.length, 40)
})

test("hash.sha1 should generate SHA1 hash for empty string", (t) => {
  const result = hash.sha1("")

  t.is(result, "da39a3ee5e6b4b0d3255bfef95601890afd80709")
})

test("hash.sha1 should generate consistent SHA1 hash", (t) => {
  const text = "Test content"
  const result1 = hash.sha1(text)
  const result2 = hash.sha1(text)

  t.is(result1, result2)
})

test("hash.sha3 should generate SHA3-256 hash with default prefix", (t) => {
  const result = hash.sha3("Hello, World!")

  t.regex(result, /^0x[a-f0-9]{64}$/)
})

test("hash.sha3 should generate SHA3-256 hash without prefix", (t) => {
  const result = hash.sha3("Hello, World!", false)

  t.regex(result, /^[a-f0-9]{64}$/)
  t.false(result.startsWith("0x"))
})

test("hash.sha3 should generate SHA3-512 hash", (t) => {
  const result = hash.sha3("Hello, World!", true, 512)

  t.regex(result, /^0x[a-f0-9]{128}$/)
})

test("hash.sha3 should generate SHA3-224 hash", (t) => {
  const result = hash.sha3("Hello, World!", true, 224)

  t.regex(result, /^0x[a-f0-9]{56}$/)
})

test("hash.sha3 should generate SHA3-384 hash", (t) => {
  const result = hash.sha3("Hello, World!", true, 384)

  t.regex(result, /^0x[a-f0-9]{96}$/)
})

test("hash.sha3 should generate consistent SHA3 hash", (t) => {
  const text = "Test content"
  const result1 = hash.sha3(text)
  const result2 = hash.sha3(text)

  t.is(result1, result2)
})

test("hash.keccak256 should generate Keccak256 hash with 0x prefix", (t) => {
  const result = hash.keccak256("Hello, World!")

  t.regex(result, /^0x[a-f0-9]{64}$/)
})

test("hash.keccak256 should generate Keccak256 hash for empty string", (t) => {
  const result = hash.keccak256("")

  t.regex(result, /^0x[a-f0-9]{64}$/)
})

test("hash.keccak256 should generate consistent Keccak256 hash", (t) => {
  const text = "Test content"
  const result1 = hash.keccak256(text)
  const result2 = hash.keccak256(text)

  t.is(result1, result2)
})

test("hash.sha256 should generate SHA256 hash for string", (t) => {
  const result = hash.sha256("Hello, World!")

  t.is(
    result,
    "dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f",
  )
  t.is(result.length, 64)
})

test("hash.sha256 should generate SHA256 hash for Buffer", (t) => {
  const buffer = Buffer.from("Hello, World!")
  const result = hash.sha256(buffer)

  t.is(
    result,
    "dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f",
  )
})

test("hash.sha256 should generate SHA256 hash for Readable stream", async (t) => {
  const stream = Readable.from(["Hello, World!"])
  const result = await hash.sha256(stream)

  t.is(
    result,
    "dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f",
  )
})

test("hash.sha256 should generate SHA256 hash for chunked stream", async (t) => {
  const stream = Readable.from(["Hello", ", ", "World!"])
  const result = await hash.sha256(stream)

  t.is(
    result,
    "dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f",
  )
})

test("hash.sha256 should throw error for null input", (t) => {
  const error = t.throws(() => {
    hash.sha256(null)
  })

  t.is(error.message, "Input cannot be null or undefined")
})

test("hash.sha256 should throw error for undefined input", (t) => {
  const error = t.throws(() => {
    hash.sha256(undefined)
  })

  t.is(error.message, "Input cannot be null or undefined")
})

test("hash.sha256 should throw error for number input", (t) => {
  const error = t.throws(() => {
    hash.sha256(123)
  })

  t.is(error.message, "Input must be a string, Buffer, or Readable stream")
})

test("hash.sha256 should throw error for object input", (t) => {
  const error = t.throws(() => {
    hash.sha256({})
  })

  t.is(error.message, "Input must be a string, Buffer, or Readable stream")
})

test("hash.sha256 should reject promise on stream error", async (t) => {
  const stream = new Readable({
    read() {
      this.emit("error", new Error("Stream error"))
    },
  })

  await t.throwsAsync(async () => await hash.sha256(stream), {
    message: "Stream error",
  })
})

test("hash.sha256 should handle empty string", (t) => {
  const result = hash.sha256("")

  t.is(
    result,
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  )
})

test("hash.rmd160 should generate RIPEMD-160 hash", (t) => {
  const result = hash.rmd160("Hello, World!")

  t.true(result instanceof Buffer)
  t.is(result.length, 20)
})

test("hash.rmd160 should generate RIPEMD-160 hash for empty string", (t) => {
  const result = hash.rmd160("")

  t.true(result instanceof Buffer)
  t.is(result.length, 20)
})

test("hash.rmd160 should generate consistent RIPEMD-160 hash", (t) => {
  const text = "Test content"
  const result1 = hash.rmd160(text)
  const result2 = hash.rmd160(text)

  t.true(result1.equals(result2))
})

test("hash.hmac should generate HMAC with default parameters (SHA256, base64)", (t) => {
  const result = hash.hmac("Hello, World!", "my-secret")

  t.is(typeof result, "string")
  t.truthy(result)
  t.regex(result, /^[A-Za-z0-9+/]+=*$/)
})

test("hash.hmac should generate HMAC with SHA256 and hex digest", (t) => {
  const result = hash.hmac("Hello, World!", "my-secret", "SHA256", "hex")

  t.regex(result, /^[a-f0-9]+$/)
})

test("hash.hmac should generate HMAC with SHA1", (t) => {
  const result = hash.hmac("Hello, World!", "my-secret", "SHA1", "hex")

  t.regex(result, /^[a-f0-9]+$/)
})

test("hash.hmac should generate HMAC with SHA512", (t) => {
  const result = hash.hmac("Hello, World!", "my-secret", "SHA512", "hex")

  t.regex(result, /^[a-f0-9]+$/)
  t.is(result.length, 128)
})

test("hash.hmac should generate HMAC with base64 digest", (t) => {
  const result = hash.hmac("Hello, World!", "my-secret", "SHA256", "base64")

  t.regex(result, /^[A-Za-z0-9+/]+=*$/)
})

test("hash.hmac should generate consistent HMAC", (t) => {
  const result1 = hash.hmac("Hello, World!", "my-secret")
  const result2 = hash.hmac("Hello, World!", "my-secret")

  t.is(result1, result2)
})

test("hash.hmac should generate different HMAC with different secrets", (t) => {
  const result1 = hash.hmac("Hello, World!", "secret1")
  const result2 = hash.hmac("Hello, World!", "secret2")

  t.not(result1, result2)
})

test("base64 module should be exported", (t) => {
  t.truthy(base64)
  t.is(typeof base64, "object")
})

// ==================== helper.js - extractFileNameFromContentDisposition 测试 ====================

test("extractFileNameFromContentDisposition should extract UTF-8 encoded filename with uppercase UTF-8", (t) => {
  const header = "attachment; filename*=UTF-8''test%20file.pdf"
  const result = extractFileNameFromContentDisposition(header)

  t.is(result, "test file.pdf")
})

test("extractFileNameFromContentDisposition should extract UTF-8 encoded filename with lowercase utf-8", (t) => {
  const header = "attachment; filename*=utf-8''test%20file.pdf"
  const result = extractFileNameFromContentDisposition(header)

  t.is(result, "test file.pdf")
})

test("extractFileNameFromContentDisposition should extract UTF-8 encoded filename with Chinese characters", (t) => {
  const header =
    "attachment; filename*=UTF-8''%E6%B5%8B%E8%AF%95%E6%96%87%E4%BB%B6.pdf"
  const result = extractFileNameFromContentDisposition(header)

  t.is(result, "测试文件.pdf")
})

test("extractFileNameFromContentDisposition should extract UTF-8 encoded filename with special characters", (t) => {
  const header = "attachment; filename*=UTF-8''file%20%28copy%29.txt"
  const result = extractFileNameFromContentDisposition(header)

  t.is(result, "file (copy).txt")
})

test("extractFileNameFromContentDisposition should handle malformed UTF-8 encoded filename", (t) => {
  const header = "attachment; filename*=UTF-8''%ZZ%invalid"
  const result = extractFileNameFromContentDisposition(header)

  t.is(result, "%ZZ%invalid")
})

test("extractFileNameFromContentDisposition should extract UTF-8 encoded filename with semicolon after", (t) => {
  const header = "attachment; filename*=UTF-8''test.pdf; size=1024"
  const result = extractFileNameFromContentDisposition(header)

  t.is(result, "test.pdf")
})

test("extractFileNameFromContentDisposition should extract quoted filename", (t) => {
  const header = 'attachment; filename="document.pdf"'
  const result = extractFileNameFromContentDisposition(header)

  t.is(result, "document.pdf")
})

test("extractFileNameFromContentDisposition should extract unquoted filename", (t) => {
  const header = "attachment; filename=document.pdf"
  const result = extractFileNameFromContentDisposition(header)

  t.is(result, "document.pdf")
})

test("extractFileNameFromContentDisposition should extract filename with spaces in quotes", (t) => {
  const header = 'attachment; filename="my document.pdf"'
  const result = extractFileNameFromContentDisposition(header)

  t.is(result, "my document.pdf")
})

test("extractFileNameFromContentDisposition should extract filename with special characters in quotes", (t) => {
  const header = 'attachment; filename="file (copy).txt"'
  const result = extractFileNameFromContentDisposition(header)

  t.is(result, "file (copy).txt")
})

test("extractFileNameFromContentDisposition should extract unquoted filename with semicolon after", (t) => {
  const header = "attachment; filename=test.pdf; size=1024"
  const result = extractFileNameFromContentDisposition(header)

  t.is(result, "test.pdf")
})

test("extractFileNameFromContentDisposition should prioritize filename* over filename", (t) => {
  const header =
    "attachment; filename=\"fallback.pdf\"; filename*=UTF-8''priority.pdf"
  const result = extractFileNameFromContentDisposition(header)

  t.is(result, "priority.pdf")
})

test("extractFileNameFromContentDisposition should return null for null input", (t) => {
  const result = extractFileNameFromContentDisposition(null)

  t.is(result, null)
})

test("extractFileNameFromContentDisposition should return null for undefined input", (t) => {
  const result = extractFileNameFromContentDisposition(undefined)

  t.is(result, null)
})

test("extractFileNameFromContentDisposition should return null for empty string", (t) => {
  const result = extractFileNameFromContentDisposition("")

  t.is(result, null)
})

test("extractFileNameFromContentDisposition should return null when no filename found", (t) => {
  const header = "attachment; size=1024"
  const result = extractFileNameFromContentDisposition(header)

  t.is(result, null)
})

test("extractFileNameFromContentDisposition should handle filename with equals sign in value", (t) => {
  const header = 'attachment; filename="file=name.pdf"'
  const result = extractFileNameFromContentDisposition(header)

  t.is(result, "file=name.pdf")
})

test("extractFileNameFromContentDisposition should handle filename with mixed case", (t) => {
  const header = 'attachment; FileName="document.pdf"'
  const result = extractFileNameFromContentDisposition(header)

  t.is(result, "document.pdf")
})

test("extractFileNameFromContentDisposition should handle filename* with mixed case", (t) => {
  const header = "attachment; FILENAME*=UTF-8''test.pdf"
  const result = extractFileNameFromContentDisposition(header)

  t.is(result, "test.pdf")
})

test("extractFileNameFromContentDisposition should handle whitespace around filename", (t) => {
  const header = 'attachment; filename = "document.pdf"'
  const result = extractFileNameFromContentDisposition(header)

  t.is(result, "document.pdf")
})

test("extractFileNameFromContentDisposition should handle complex real-world header", (t) => {
  const header =
    'attachment; filename="report-2024.xlsx"; modification-date="Mon, 20 Oct 2025 12:00:00 GMT"'
  const result = extractFileNameFromContentDisposition(header)

  t.is(result, "report-2024.xlsx")
})
