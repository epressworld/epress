export function extractFileNameFromContentDisposition(headerValue) {
  if (!headerValue) return null

  // 优先匹配 filename*（UTF-8 编码）
  let match = headerValue.match(/filename\*\s*=\s*UTF-8''([^;]+)/i)
  if (match) {
    try {
      return decodeURIComponent(match[1])
    } catch {
      return match[1]
    }
  }

  // 其次匹配 filename="..." 或 filename=...
  match = headerValue.match(/filename\s*=\s*("?)([^";]+)\1/i)
  if (match) {
    return match[2]
  }

  return null
}
