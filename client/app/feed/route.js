import { marked } from "marked"
import { NextResponse } from "next/server"

// Constants
const RSS_CACHE_MAX_AGE = 300 // 5 minutes
const RSS_ERROR_CACHE_MAX_AGE = 60 // 1 minute
const MAX_PUBLICATIONS = 20
const TITLE_MAX_LENGTH = 100
const DESCRIPTION_MAX_LENGTH = 300
const FILE_DESCRIPTION_MAX_LENGTH = 200

// Function to format file size
function formatFileSize(bytes) {
  if (!bytes) return ""
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${Math.round((bytes / 1024 ** i) * 100) / 100} ${sizes[i]}`
}

// Function to clean markdown formatting for title extraction (lightweight)
function cleanMarkdownForTitle(text) {
  if (!text) return ""

  // Get first line only for title extraction
  const firstLine = text.split("\n")[0]

  // Use a single regex with multiple patterns for better performance
  return firstLine
    .replace(/^(#{1,6}\s+|[-*+]\s+|\d+\.\s+|>\s*)/, "") // Remove headers, lists, blockquotes
    .replace(/\*\*(.*?)\*\*|\*(.*?)\*|`(.*?)`/g, "$1$2$3") // Remove bold, italic, code
    .replace(/\[([^\]]+)\]\([^)]+\)|!\[([^\]]*)\]\([^)]+\)/g, "$1$2") // Remove links and images
    .replace(/\s+/g, " ") // Replace multiple spaces with single space
    .trim()
}

// Configure marked for RSS output
marked.setOptions({
  breaks: true, // Convert \n to <br>
  gfm: true, // GitHub Flavored Markdown
  sanitize: false, // We trust our content
  smartLists: true,
  smartypants: false, // Don't convert quotes to smart quotes
})

// Markdown to HTML converter for RSS using marked
function markdownToHtml(markdown) {
  if (!markdown) return ""

  try {
    return marked(markdown)
  } catch (error) {
    console.error("Markdown conversion error:", error)
    // Fallback to plain text if conversion fails
    return markdown.replace(/</g, "&lt;").replace(/>/g, "&gt;")
  }
}

// Function to generate RSS XML
function generateRSS(publications, nodeInfo, fullContent = false) {
  // EPRESS_NODE_URL should be the frontend URL directly
  const baseUrl = process.env.EPRESS_NODE_URL
  if (!baseUrl) {
    throw new Error("EPRESS_NODE_URL environment variable is not set")
  }

  const nodeTitle = nodeInfo?.title || "ePress Node"
  const nodeDescription = nodeInfo?.description || "Personal publishing node"
  const nodeUrl = nodeInfo?.url || baseUrl
  const currentDate = new Date().toUTCString()

  const rssItems = publications
    .map((pub) => {
      const pubUrl = `${baseUrl}/publications/${pub.id}`
      const pubDate = new Date(pub.created_at).toUTCString()
      const authorName = pub.author?.title || "Unknown Author"

      // Generate title and description based on content type
      let title = "Untitled"
      let description = ""

      if (pub.content?.type === "FILE") {
        // File type: extract title from body (like text content)
        if (pub.description) {
          const cleanedBody = cleanMarkdownForTitle(pub.description)
          const firstLine = cleanedBody.split("\n")[0]
          title =
            firstLine.length > TITLE_MAX_LENGTH
              ? `${firstLine.substring(0, TITLE_MAX_LENGTH)}...`
              : firstLine
        } else {
          // Fallback to filename if no body
          const filename = pub.content.filename || "Unknown File"
          const size = pub.content.size ? formatFileSize(pub.content.size) : ""
          const fileInfo = size ? ` (${size})` : ""
          title = `📁 ${filename}${fileInfo}`
        }

        // Description includes file info and body
        const filename = pub.content.filename || "Unknown File"
        const fileType = pub.content.mimetype || "Unknown Type"
        const fileSize = pub.content.size
          ? formatFileSize(pub.content.size)
          : "Unknown Size"

        if (fullContent) {
          // Full content: show file info + HTML body
          const fileInfoHtml = `<p><strong>📎 ${filename}</strong><br/>Type: ${fileType}<br/>Size: ${fileSize}</p>`
          const bodyHtml = markdownToHtml(pub.description || "")
          description = fileInfoHtml + bodyHtml
        } else {
          // Summary: show file info + cleaned body
          const fileInfo = `📎 ${filename}\nType: ${fileType}\nSize: ${fileSize}`
          const bodyText = cleanMarkdownForTitle(pub.description || "")
          const bodySummary =
            bodyText.length > FILE_DESCRIPTION_MAX_LENGTH
              ? `${bodyText.substring(0, FILE_DESCRIPTION_MAX_LENGTH)}...`
              : bodyText
          description = [fileInfo, "", bodySummary].join("\n")
        }
      } else {
        // Text type: extract title from body (clean markdown first)
        if (pub.content?.body) {
          const cleanedBody = cleanMarkdownForTitle(pub.content.body)
          const firstLine = cleanedBody.split("\n")[0]
          title =
            firstLine.length > TITLE_MAX_LENGTH
              ? `${firstLine.substring(0, TITLE_MAX_LENGTH)}...`
              : firstLine
        }

        // Generate description based on fullContent parameter
        if (fullContent) {
          // Full content: convert markdown to HTML
          description = markdownToHtml(pub.content?.body || "")
        } else {
          // Summary: clean markdown and truncate
          description = cleanMarkdownForTitle(pub.content?.body || "")
          if (description.length > DESCRIPTION_MAX_LENGTH) {
            description = `${description.substring(0, DESCRIPTION_MAX_LENGTH)}...`
          }
        }
      }

      // Generate enclosure for file types
      let enclosure = ""
      if (pub.content?.type === "FILE" && pub.content?.mimetype) {
        const fileUrl = `${pub.author.url}/ewp/contents/${pub.content.content_hash}?timestamp=${Math.floor(new Date(pub.created_at).getTime() / 1000)}`
        enclosure = `<enclosure url="${fileUrl}" type="${pub.content.mimetype}" length="${pub.content.size || 0}" />`
      }

      return `
      <item>
        <title><![CDATA[${title}]]></title>
        <description><![CDATA[${description}]]></description>
        <link>${pubUrl}</link>
        <guid isPermaLink="true">${pubUrl}</guid>
        <pubDate>${pubDate}</pubDate>
        <author>${authorName}</author>
        ${enclosure}
      </item>`
    })
    .join("")

  const feedTitle = fullContent ? `${nodeTitle} (Full Content)` : nodeTitle
  const feedDescription = fullContent
    ? `${nodeDescription} - Full content RSS feed`
    : `${nodeDescription} - Summary RSS feed`

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title><![CDATA[${feedTitle}]]></title>
    <description><![CDATA[${feedDescription}]]></description>
    <link>${nodeUrl}</link>
    <language>en</language>
    <lastBuildDate>${currentDate}</lastBuildDate>
    <atom:link href="${baseUrl}/feed${fullContent ? "?full=true" : ""}" rel="self" type="application/rss+xml"/>
    ${rssItems}
  </channel>
</rss>`
}

// Function to fetch all data in a single GraphQL query
async function fetchAllData(token) {
  try {
    const apiUrl = process.env.EPRESS_API_URL
    if (!apiUrl) {
      throw new Error("EPRESS_API_URL environment variable is not set")
    }

    const headers = { "Content-Type": "application/json" }
    if (token) {
      headers.authorization = `Bearer ${token}`
    }

    const response = await fetch(`${apiUrl}/api/graphql`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        query: `
          query GetRSSData {
            profile {
              title
              url
              description
            }
            settings {
              enableRSS
              allowFollow
              allowComment
            }
            search(
              type: PUBLICATION
              filterBy: {}
              orderBy: "created_at desc"
              first: ${MAX_PUBLICATIONS}
            ) {
              total
              edges {
                node {
                  ... on Publication {
                    id
                    author {
                      address
                      title
                      url
                      description
                    }
                    content {
                      content_hash
                      type
                      body
                      filename
                      mimetype
                      size
                    }
                    description
                    signature
                    comment_count
                    created_at
                    updated_at
                  }
                }
              }
            }
          }
        `,
      }),
    })

    const data = await response.json()

    if (data.errors) {
      console.error("GraphQL errors:", data.errors)
      throw new Error(
        `GraphQL errors: ${data.errors.map((e) => e.message).join(", ")}`,
      )
    }

    return {
      nodeInfo: data.data?.profile || {},
      settings: data.data?.settings || {},
      publications: data.data?.search?.edges?.map((edge) => edge.node) || [],
    }
  } catch (error) {
    console.error("Failed to fetch RSS data:", error)
    throw error // Re-throw to be handled by the main error handler
  }
}

export async function GET(request) {
  try {
    // Extract and validate parameters
    const { searchParams } = new URL(request.url)
    const queryToken = searchParams.get("token")
    const fullContent = searchParams.get("full") === "true"

    // Validate token format if provided
    if (queryToken && !/^[A-Za-z0-9._-]+$/.test(queryToken)) {
      return new NextResponse("Invalid token format", { status: 400 })
    }

    const authHeader = request.headers.get("authorization")
    const bearerToken = authHeader?.toLowerCase().startsWith("bearer ")
      ? authHeader.substring(7)
      : null

    // Validate bearer token format if provided
    if (bearerToken && !/^[A-Za-z0-9._-]+$/.test(bearerToken)) {
      return new NextResponse("Invalid bearer token format", { status: 400 })
    }

    // Use query token first, then bearer token
    const token = queryToken || bearerToken

    // Fetch all data in a single GraphQL query
    const data = await fetchAllData(token)

    // Check if RSS is enabled
    if (!data.settings?.enableRSS) {
      return new NextResponse("RSS feed is disabled", {
        status: 403,
        headers: { "Content-Type": "text/plain" },
      })
    }

    // Generate RSS XML
    const rssXml = generateRSS(data.publications, data.nodeInfo, fullContent)

    return new NextResponse(rssXml, {
      status: 200,
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": `public, max-age=${RSS_CACHE_MAX_AGE}, s-maxage=${RSS_CACHE_MAX_AGE}`, // Cache for 5 minutes
      },
    })
  } catch (error) {
    console.error("RSS generation error:", error)

    // Check if it's a configuration error (should return 500)
    if (error.message.includes("environment variable is not set")) {
      return new NextResponse(`Configuration error: ${error.message}`, {
        status: 500,
        headers: { "Content-Type": "text/plain" },
      })
    }

    // For other errors, return an empty RSS feed (RSS spec compliant)
    const baseUrl = process.env.EPRESS_NODE_URL || "http://localhost:8543"
    const emptyRss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>ePress Feed</title>
    <description>No publications available</description>
    <link>${baseUrl}</link>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  </channel>
</rss>`

    return new NextResponse(emptyRss, {
      status: 200,
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": `public, max-age=${RSS_ERROR_CACHE_MAX_AGE}, s-maxage=${RSS_ERROR_CACHE_MAX_AGE}`, // Shorter cache for errors
      },
    })
  }
}
