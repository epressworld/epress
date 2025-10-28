// ShareButton.jsx
"use client"

import { IconButton } from "@chakra-ui/react"
import { useCopyToClipboard } from "@uidotdev/usehooks"
import { LuShare } from "react-icons/lu"

/**
 * 通用的分享按钮组件。
 * 优先使用 Web Share API，降级为复制 URL 到剪贴板。
 *
 * @param {object} props
 * @param {string} props.shareUrl - 要分享的 URL。
 * @param {string} [props.shareTitle] - (可选) 分享内容的标题，默认为当前页面标题。
 * @param {string} [props.tooltipText] - (可选) 按钮的提示文本，默认为 'Share'。
 * @param {string} [props.size] - (可选) IconButton 的大小，默认为 'xs'。
 */
export function ShareButton({
  url,
  title,
  size = "xs",
  onCopied = () => {},
  iconSize = 12,
  ...rest
}) {
  const [_, copyToClipboard] = useCopyToClipboard()

  const handleShare = async () => {
    url = url || window.location.href
    title = title || document.title

    // 1. 优先使用 Web Share API
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          url,
        })
        // 成功分享或用户取消，不需要提示
        return
      } catch (err) {
        // 如果是 AbortError (用户取消)，不进行复制操作
        if (err.name === "AbortError") {
          return
        }
        // 如果是其他错误，则降级到复制
        console.error("Web Share API failed, falling back to copy:", err)
      }
    }

    // 2. 降级到复制 URL 到剪贴板
    try {
      await copyToClipboard(url)
      onCopied()
    } catch (_err) {
      console.error("Failed to copy URL:", _err)
    }
  }

  return (
    <IconButton
      size={size}
      variant="ghost"
      onClick={handleShare}
      aria-label={"share"}
      {...rest}
    >
      <LuShare size={iconSize} />
    </IconButton>
  )
}
