"use client"

import { Avatar, Circle, Float, Link } from "@chakra-ui/react"

/**
 * NodeAvatar - 节点头像组件
 *
 * 用于展示 ePress 节点的头像,支持从节点 URL 获取头像图片
 *
 * @param {Object} props
 * @param {Object} props.node - 节点对象,包含 url, title, address 等信息
 * @param {string} [props.size="md"] - 头像大小: "xs" | "sm" | "md" | "lg" | "xl" | "2xl"
 * @param {boolean} [props.showFallback=true] - 是否显示 fallback (节点名称首字母)
 * @param {Function} [props.onClick] - 点击事件处理函数
 * @param {string} [props.className] - 额外的 CSS 类名
 *
 * @example
 * // 基本使用
 * <NodeAvatar node={node} />
 *
 * @example
 * // 自定义大小和点击事件
 * <NodeAvatar
 *   node={node}
 *   size="lg"
 *   onClick={() => navigate(node.url)}
 * />
 */
export function NodeAvatar({
  node,
  size = "md",
  showFallback = true,
  onClick,
  className,
  isOnline,
  ...props
}) {
  // 安全地获取节点信息
  const nodeUrl = node?.url
  const nodeTitle = node?.title || node?.address || "Node"
  const avatarUrl = nodeUrl ? `${nodeUrl}/ewp/avatar` : undefined
  const renderAvatar = () => (
    <>
      <Avatar.Image src={avatarUrl} alt={nodeTitle} />
      {showFallback && (
        <Avatar.Fallback>{nodeTitle.charAt(0).toUpperCase()}</Avatar.Fallback>
      )}
      {/* 在线状态指示器 */}
      {isOnline && (
        <Float placement="bottom-end" offsetX="1" offsetY="1">
          <Circle
            bg="green.500"
            size="8px"
            outline="0.15em solid"
            outlineColor="bg"
          />
        </Float>
      )}
    </>
  )

  return (
    <Avatar.Root
      size={size}
      onClick={onClick}
      className={className}
      cursor={onClick ? "pointer" : "default"}
      {...props}
    >
      {nodeUrl ? (
        <Link href={nodeUrl} target="_blank">
          {renderAvatar()}
        </Link>
      ) : (
        renderAvatar()
      )}
    </Avatar.Root>
  )
}
