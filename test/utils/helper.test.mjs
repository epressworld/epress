import test from "ava"
import { extractFileNameFromContentDisposition } from "../../server/utils/helper.mjs"

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
