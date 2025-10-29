"use client"

import { Badge, HStack, Text } from "@chakra-ui/react"
import { UnifiedCard } from "@/components/ui"

/**
 * ConnectionList - 列表容器组件
 *
 * 统一的列表容器,包含标题、总数和内容区域
 *
 * @param {Object} props
 * @param {string} props.title - 列表标题
 * @param {number} [props.total] - 总数
 * @param {React.ReactNode} props.children - 列表内容
 * @param {Object} [props.headerProps] - Header 额外属性
 * @param {Object} [props.bodyProps] - Body 额外属性
 *
 * @example
 * <ConnectionList title="关注者" total={42}>
 *   <FollowersList />
 * </ConnectionList>
 */
export function ConnectionList({
  title,
  total,
  children,
  headerProps = {},
  bodyProps = {},
  ...props
}) {
  return (
    <UnifiedCard.Root {...props}>
      <UnifiedCard.Header
        {...headerProps}
        borderBottom="1px solid"
        borderColor="gray.100"
        _dark={{ borderColor: "gray.800" }}
      >
        <HStack gap={2} justify="space-between">
          <HStack gap={2}>
            <Text fontSize="xl" fontWeight="semibold">
              {title}
            </Text>
          </HStack>
          <Badge colorPalette="green" variant="solid">
            {total}
          </Badge>
        </HStack>
      </UnifiedCard.Header>
      <UnifiedCard.Body pt={0} {...bodyProps}>
        {children}
      </UnifiedCard.Body>
    </UnifiedCard.Root>
  )
}
