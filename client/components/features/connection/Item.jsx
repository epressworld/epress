"use client"

import { AuthorInfo } from "@/components/ui"
import { useOnlineVisitors } from "@/hooks/data"

/**
 * ConnectionItem - 节点列表项组件
 *
 * 用于显示节点/用户信息的列表项,包含头像、名称、地址、描述
 *
 * @param {Object} props
 * @param {Object} props.node - 节点数据
 * @param {string} [props.node.title] - 节点名称
 * @param {string} [props.node.address] - 节点地址
 * @param {string} [props.node.description] - 节点描述
 * @param {string} [props.node.url] - 节点 URL
 * @param {boolean} [props.showDescription=true] - 是否显示描述
 * @param {boolean} [props.showAddress=true] - 是否显示地址
 * @param {React.ReactNode} [props.actions] - 操作按钮区域
 * @param {string} [props.size="md"] - 头像大小
 *
 * @example
 * <ConnectionItem
 *   node={follower}
 *   actions={<Button>关注</Button>}
 * />
 */
export function ConnectionItem({
  node,
  showDescription = true,
  showAddress = true,
  actions,
  size = "md",
  ...props
}) {
  const { isAddressOnline } = useOnlineVisitors()

  if (!node) return null

  const address = node.address
  const isOnline = address && isAddressOnline(address)

  return (
    <AuthorInfo
      node={node}
      showAddress
      showDescription
      isOnline={isOnline}
      actions={actions}
      {...props}
    />
  )
}
