"use client"

import { Heading, HStack, Text } from "@chakra-ui/react"
import { UnifiedCard } from "@/components/ui"

/**
 * ConnectionList - 列表容器组件
 *
 * 统一的列表容器,包含标题、总数和内容区域
 *
 * @param {Object} props
 * @param {string} props.title - 列表标题
 * @param {number} [props.total] - 总数
 * @param {React.ReactNode} [props.icon] - 标题图标
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
  icon,
  children,
  headerProps = {},
  bodyProps = {},
  ...props
}) {
  return (
    <UnifiedCard.Root {...props}>
      <UnifiedCard.Header pb={2} {...headerProps}>
        <HStack justify="space-between" align="center">
          <HStack gap={2}>
            {icon}
            <Heading size="lg" color="gray.700" _dark={{ color: "gray.300" }}>
              {title}
            </Heading>
          </HStack>
          {total !== undefined && (
            <Text
              fontSize="lg"
              fontWeight="bold"
              fontStyle="italic"
              color="gray.400"
              _dark={{ color: "gray.600" }}
            >
              {total}
            </Text>
          )}
        </HStack>
      </UnifiedCard.Header>
      <UnifiedCard.Body pt={0} {...bodyProps}>
        {children}
      </UnifiedCard.Body>
    </UnifiedCard.Root>
  )
}
