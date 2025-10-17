"use client"

import { Avatar, Box, Circle, Float, HStack, Text } from "@chakra-ui/react"
import { useOnlineVisitors } from "@/hooks/data"
import { useIntl } from "@/hooks/utils"

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
  const { t } = useIntl()
  const { isAddressOnline } = useOnlineVisitors()

  if (!node) return null

  const title = node.title || node.address || t("node.unnamedNode")
  const description = node.description || t("node.noDescription")
  const address = node.address
  const url = node.url
  const avatar = url ? `${url}/ewp/avatar` : undefined
  const isOnline = address && isAddressOnline(address)

  return (
    <HStack
      gap={4}
      align="start"
      p={3}
      borderRadius="md"
      _hover={{ bg: "gray.50", _dark: { bg: "gray.800" } }}
      transition="all 0.2s"
      justify="space-between"
      {...props}
    >
      <HStack gap={4} align="start" flex={1} minW={0}>
        <Box position="relative">
          <Avatar.Root size={size}>
            <Avatar.Fallback>{title.charAt(0)}</Avatar.Fallback>
            <Avatar.Image src={avatar} />
          </Avatar.Root>
          {/* 在线状态指示器 */}
          {isOnline && (
            <Float placement="bottom-end" offsetX="1" offsetY="1">
              <Circle
                bg="green.500"
                size="10px"
                outline="0.2em solid"
                outlineColor="bg"
              />
            </Float>
          )}
        </Box>

        <Box flex={1} minW={0}>
          {url ? (
            <Text
              as="a"
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              fontWeight="medium"
              fontSize="sm"
              noOfLines={1}
              color="orange.500"
              _hover={{ color: "orange.600", textDecoration: "underline" }}
            >
              {title}
            </Text>
          ) : (
            <Text fontWeight="medium" fontSize="sm" noOfLines={1}>
              {title}
            </Text>
          )}

          {showAddress && address && (
            <Text
              fontSize="xs"
              color="gray.400"
              _dark={{ color: "gray.500" }}
              fontFamily="mono"
              mt={1}
              noOfLines={1}
            >
              {address}
            </Text>
          )}

          {showDescription && description && (
            <Text
              fontSize="xs"
              color="gray.500"
              _dark={{ color: "gray.400" }}
              noOfLines={2}
              mt={1}
            >
              {description}
            </Text>
          )}
        </Box>
      </HStack>

      {actions && <Box flexShrink={0}>{actions}</Box>}
    </HStack>
  )
}
