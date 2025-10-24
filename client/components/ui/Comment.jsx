"use client"

import { Box } from "@chakra-ui/react"
import ReactMarkdown from "react-markdown"
import rehypeHighlight from "rehype-highlight"
import rehypeKatex from "rehype-katex"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import "katex/dist/katex.min.css"

/**
 * CommentRenderer - 评论内容渲染组件
 *
 * 用于渲染评论中的 Markdown 内容，支持：
 * - 基础 Markdown 语法（加粗、斜体、列表、链接等）
 * - 代码语法高亮
 * - LaTeX 数学公式（使用 $...$ 或 $$...$$）
 *
 * 注意：不包含 Mermaid、Markmap 等复杂图表功能
 *
 * @param {Object} props
 * @param {string} props.content - 评论内容文本
 * @param {string} [props.keyword] - 搜索关键词（用于高亮）
 *
 * @example
 * <CommentRenderer content={comment.body} />
 * <CommentRenderer content={comment.body} keyword="search" />
 */
export function CommentRenderer({ children, keyword, ...props }) {
  if (!children) return null

  // 准备插件列表
  const remarkPlugins = [remarkGfm, remarkMath]
  const rehypePlugins = [rehypeHighlight, rehypeKatex]

  // Markdown 渲染
  return (
    <Box className="markdown-content markdown-body" {...props}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={{
          // 自定义链接组件，确保外部链接在新标签页打开
          a: ({ node, children, href, ...props }) => (
            <a
              href={href}
              target={href?.startsWith("http") ? "_blank" : undefined}
              rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
              {...props}
            >
              {children}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </Box>
  )
}
