"use client"

import { Box } from "@chakra-ui/react"
import { useEffect, useRef } from "react"
import ReactMarkdown from "react-markdown"
import rehypeHighlight from "rehype-highlight"
import rehypeKatex from "rehype-katex"
import rehypeRaw from "rehype-raw"
import rehypeSanitize, { defaultSchema } from "rehype-sanitize"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import "katex/dist/katex.min.css"

/**
 * BodyRenderer - 内容展示组件
 *
 * 用于展示不同类型的内容,支持 Markdown 渲染和关键词高亮
 * 支持的 Markdown 扩展功能:
 * - LaTeX 数学公式 (使用 $...$ 或 $$...$$)
 * - YouTube 视频嵌入 (使用 ::youtube[标题]{#video_id})
 * - Markmap 思维导图 (使用 ```markmap 代码块)
 * - Mermaid 图表 (使用 ```mermaid 代码块)
 *
 * @param {Object} props
 * @param {string} props.content - 内容文本
 * @param {string} [props.keyword] - 搜索关键词(用于高亮)
 * @param {boolean} [props.truncate=false] - 是否截断显示
 * @param {number} [props.maxLines=10] - 最大显示行数
 * @param {Function} [props.onExpand] - 展开回调
 *
 * @example
 * <BodyRenderer content={markdownText} />
 * <BodyRenderer content={text} type="text" keyword="search" />
 */
export function BodyRenderer({
  content,
  keyword,
  truncate = false,
  maxLines = 10,
  onExpand,
  ...props
}) {
  const containerRef = useRef(null)
  content = replaceHashtagsWithLinks(content)

  // 初始化 Mermaid 和 Markmap(客户端渲染)
  useEffect(() => {
    if (!containerRef.current) return

    // 使用 setTimeout 确保 DOM 已经渲染
    const timer = setTimeout(() => {
      // 动态加载并初始化 Mermaid
      import("mermaid")
        .then(async (mod) => {
          const mermaid = mod.default
          mermaid.initialize({
            startOnLoad: false,
            theme: "default",
            securityLevel: "loose",
          })

          // 查找当前容器内的所有 mermaid 代码块
          const mermaidBlocks = containerRef.current?.querySelectorAll(
            "pre > code.language-mermaid",
          )
          if (mermaidBlocks && mermaidBlocks.length > 0) {
            const containers = []
            mermaidBlocks.forEach((block) => {
              const code = block.textContent || ""

              // 创建容器
              const container = document.createElement("div")
              container.className = "mermaid"
              container.textContent = code

              // 替换 pre 元素
              const pre = block.parentElement
              if (pre?.tagName === "PRE") {
                pre.replaceWith(container)
                containers.push(container)
              }
            })

            // 渲染所有 mermaid 图表
            if (containers.length > 0) {
              await mermaid.run({
                nodes: containers,
              })
            }
          }
        })
        .catch((err) => {
          console.error("Failed to load mermaid:", err)
        })

      // 动态加载并初始化 Markmap
      import("markmap-view")
        .then(async (viewMod) => {
          const { Markmap } = viewMod
          const { Transformer } = await import("markmap-lib")

          // 查找当前容器内的所有 markmap 代码块
          const markmapBlocks = containerRef.current?.querySelectorAll(
            "pre > code.language-markmap",
          )
          if (markmapBlocks && markmapBlocks.length > 0) {
            markmapBlocks.forEach((block, index) => {
              const code = block.textContent || ""
              const transformer = new Transformer()
              const { root } = transformer.transform(code)

              // 创建 SVG 容器
              const svg = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "svg",
              )
              svg.id = `markmap-${Date.now()}-${index}`
              svg.style.width = "100%"
              svg.style.height = "400px"

              // 替换 pre 元素
              const pre = block.parentElement
              if (pre?.tagName === "PRE") {
                pre.replaceWith(svg)
              }

              // 渲染 markmap
              Markmap.create(svg, {}, root)
            })
          }
        })
        .catch((err) => {
          console.error("Failed to load markmap:", err)
        })
    }, 100)

    return () => clearTimeout(timer)
  }, [content])

  if (!content) return null

  // 如果有关键词,先用 <mark> 标签标记
  if (keyword) {
    content = highlightKeyword(content, keyword)
  }
  // 准备插件列表
  // 添加 rehypeRaw 以允许渲染 HTML 标签(包括 <mark>)
  const remarkPlugins = [remarkGfm, remarkMath]
  const rehypePlugins = [
    rehypeRaw,
    [
      rehypeSanitize,
      {
        tagNames: [...defaultSchema.tagNames, "mark"],
        attributes: { ...defaultSchema.attributes, mark: [] },
      },
    ],
    rehypeHighlight,
    rehypeKatex,
  ]

  // Markdown 渲染
  return (
    <Box
      ref={containerRef}
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
        // KaTeX 样式
        "& .katex": {
          fontSize: "1.1em",
        },
        "& .katex-display": {
          margin: "1em 0",
          overflow: "auto",
        },
        // Mermaid 样式
        "& .mermaid": {
          display: "flex",
          justifyContent: "center",
          margin: "1em 0",
        },
        // Mark 标签样式
        "& mark": {
          backgroundColor: "yellow.200",
          padding: "0 2px",
          borderRadius: "2px",
        },
      }}
      {...props}
    >
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
      >
        {content}
      </ReactMarkdown>
    </Box>
  )
}

/**
 * 用 <mark> 标签高亮关键词
 * @param {string} content - 原始内容
 * @param {string} keyword - 要高亮的关键词
 * @returns {string} 处理后的内容
 */
function highlightKeyword(content, keyword) {
  if (!keyword || !content) return content

  // 转义特殊正则字符
  const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

  // 使用全局不区分大小写的正则匹配
  const regex = new RegExp(`(${escapedKeyword})`, "gi")

  // 替换匹配的关键词为 <mark> 标签
  return content.replace(regex, "<mark>$1</mark>")
}

function replaceHashtagsWithLinks(content) {
  // 支持Unicode字符的hashtag(中文、日文、韩文等)
  const hashtagRegex = /#([\p{L}\p{N}_-]+)/gu

  return content.replace(hashtagRegex, (_match, hashtag) => {
    const encodedHashtag = encodeURIComponent(hashtag)
    return `[#${hashtag}](/publications?hashtag=${encodedHashtag})`
  })
}
