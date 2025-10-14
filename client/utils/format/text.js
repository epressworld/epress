/**
 * 去除markdown格式化字符，获取纯文本
 * @param {string} markdown - markdown文本
 * @returns {string} 纯文本
 */
export function stripMarkdown(markdown) {
  if (!markdown) return ""

  return (
    markdown
      // 去除标题标记
      .replace(/^#{1,6}\s+/gm, "")
      // 去除粗体和斜体标记
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1")
      .replace(/_([^_]+)_/g, "$1")
      // 去除代码块标记
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`([^`]+)`/g, "$1")
      // 去除链接标记
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // 去除图片标记
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
      // 去除列表标记
      .replace(/^[\s]*[-*+]\s+/gm, "")
      .replace(/^[\s]*\d+\.\s+/gm, "")
      // 去除引用标记
      .replace(/^>\s+/gm, "")
      // 去除水平线
      .replace(/^[-*_]{3,}$/gm, "")
      // 去除多余的空格和换行
      .replace(/\s+/g, " ")
      .trim()
  )
}

/**
 * 获取文本的前N个字符
 * @param {string} text - 文本
 * @param {number} length - 长度
 * @returns {string} 截取后的文本
 */
export function truncateText(text, length = 30) {
  if (!text) return ""
  if (text.length <= length) return text
  return `${text.substring(0, length)}...`
}
