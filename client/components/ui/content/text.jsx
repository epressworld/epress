"use client"

import { Box, Highlight, Text } from "@chakra-ui/react"
import ReactMarkdown from "react-markdown"
import rehypeHighlight from "rehype-highlight"
import remarkGfm from "remark-gfm"

/**
 * TextRenderer - 内容展示组件
 *
 * 用于展示不同类型的内容,支持 Markdown 渲染和关键词高亮
 *
 * @param {Object} props
 * @param {string} props.content - 内容文本
 * @param {string} [props.type="markdown"] - 内容类型: "markdown" | "text"
 * @param {string} [props.keyword] - 搜索关键词(用于高亮)
 * @param {boolean} [props.truncate=false] - 是否截断显示
 * @param {number} [props.maxLines=10] - 最大显示行数
 * @param {Function} [props.onExpand] - 展开回调
 *
 * @example
 * <TextRenderer content={markdownText} />
 * <TextRenderer content={text} type="text" keyword="search" />
 */
export function TextRenderer({
  content,
  type = "markdown",
  keyword,
  truncate = false,
  maxLines = 10,
  onExpand,
  ...props
}) {
  if (!content) return null

  // 文本类型
  if (type === "text") {
    return (
      <Text
        whiteSpace="pre-wrap"
        noOfLines={truncate ? maxLines : undefined}
        color="gray.800"
        _dark={{ color: "gray.200" }}
        fontSize="sm"
        {...props}
      >
        {keyword ? (
          <Highlight query={keyword} styles={{ bg: "yellow.200" }}>
            {content}
          </Highlight>
        ) : (
          content
        )}
      </Text>
    )
  }

  // Markdown 渲染
  return (
    <Box
      className="markdown-content markdown-body"
      sx={{
        "& img": {
          maxWidth: "100%",
          height: "auto",
        },
        "& pre": {
          borderRadius: "md",
          overflow: "auto",
        },
        "& code": {
          fontSize: "sm",
        },
      }}
      {...props}
    >
      {keyword ? (
        <Highlight query={keyword} styles={{ bg: "yellow.200" }}>
          {content}
        </Highlight>
      ) : (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
        >
          {content}
        </ReactMarkdown>
      )}
    </Box>
  )
}
