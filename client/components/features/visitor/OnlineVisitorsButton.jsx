"use client"

import {
  Badge,
  Box,
  Button,
  Circle,
  HStack,
  Popover,
  Portal,
  Separator,
  Text,
  VStack,
} from "@chakra-ui/react"
import { LuUsers } from "react-icons/lu"
import { useOnlineVisitors } from "@/hooks/data"
import { useIntl } from "@/hooks/utils"

/**
 * 在线访客按钮组件
 *
 * 显示在线访客数量，点击后弹出 Popover 显示所有在线访客列表
 *
 * 功能:
 * - 显示在线访客数量
 * - Popover 显示访客列表（地址 + 最后活跃时间）
 * - 列表可滚动
 * - 自动刷新
 */
export function OnlineVisitorsButton() {
  const { onlineVisitors, onlineCount, isLoading } = useOnlineVisitors()
  const { t, formatRelativeTime } = useIntl()
  const now = new Date()

  return (
    <Popover.Root placement="top">
      <Popover.Trigger asChild>
        <Button variant="plain" color="fg.muted" size="sm" px={0}>
          <HStack gap={1}>
            <LuUsers size={16} />
            <Text fontSize="sm">
              {t("visitor.onlineCount", { count: onlineCount })}
            </Text>
            <Circle
              size="8px"
              bg={onlineCount > 0 ? "green.500" : "gray.400"}
              flexShrink={0}
            />
          </HStack>
        </Button>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content maxW="md">
            <Popover.Arrow />
            <Popover.Body>
              <VStack gap={4} align="stretch">
                {/* 标题 */}
                <HStack gap={2} justify="space-between">
                  <HStack gap={2}>
                    <LuUsers size={20} />
                    <Text fontWeight="semibold">
                      {t("visitor.onlineVisitors")}
                    </Text>
                  </HStack>
                  <Badge colorPalette="green" variant="solid">
                    {onlineCount}
                  </Badge>
                </HStack>

                <Separator />

                {/* 访客列表 */}
                {isLoading ? (
                  <Text
                    fontSize="sm"
                    color="gray.500"
                    textAlign="center"
                    py={2}
                  >
                    {t("common.loading")}
                  </Text>
                ) : onlineVisitors.length === 0 ? (
                  <Text
                    fontSize="sm"
                    color="gray.500"
                    textAlign="center"
                    py={2}
                  >
                    {t("visitor.noOnlineVisitors")}
                  </Text>
                ) : (
                  <Box
                    maxH="300px"
                    overflowY="auto"
                    css={{
                      "&::-webkit-scrollbar": {
                        width: "8px",
                      },
                      "&::-webkit-scrollbar-track": {
                        background: "transparent",
                      },
                      "&::-webkit-scrollbar-thumb": {
                        background: "var(--chakra-colors-gray-300)",
                        borderRadius: "4px",
                      },
                      "&::-webkit-scrollbar-thumb:hover": {
                        background: "var(--chakra-colors-gray-400)",
                      },
                    }}
                  >
                    <VStack gap={3} align="stretch">
                      {onlineVisitors.map((visitor, index) => (
                        <Box key={visitor.address}>
                          <HStack gap={2} w="full" justify="space-between">
                            <Badge
                              colorPalette="orange"
                              variant="subtle"
                              fontFamily="mono"
                              fontSize="xs"
                              textOverflow="ellipsis"
                            >
                              {`${visitor.address.slice(0, 8)}...${visitor.address.slice(-8)}`}
                            </Badge>
                            <Text
                              fontSize="xs"
                              color="gray.500"
                              _dark={{ color: "gray.400" }}
                              flexShrink={0}
                            >
                              {formatRelativeTime(visitor.lastActive, now)}
                            </Text>
                          </HStack>
                          {index < onlineVisitors.length - 1 && (
                            <Separator mt={3} />
                          )}
                        </Box>
                      ))}
                    </VStack>
                  </Box>
                )}
              </VStack>
            </Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  )
}
