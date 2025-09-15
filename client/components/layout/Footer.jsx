"use client"

import {
  Badge,
  Box,
  Button,
  Center,
  Container,
  HStack,
  Image,
  Link,
  Popover,
  Separator,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useEffect, useState } from "react"
import { FaCodeBranch } from "react-icons/fa6"
import { LuCalendar, LuClock } from "react-icons/lu"
import { SiEthereum } from "react-icons/si"
import { useLanguage } from "../../contexts/LanguageContext"
import { usePage } from "../../contexts/PageContext"
import { useTranslation } from "../../hooks/useTranslation"
import { formatDate, formatRelativeTime } from "../../utils/dateFormat"
import { Toaster } from "../ui/toaster"

export const Footer = () => {
  const { profile, nodeStatus } = usePage()
  const { common } = useTranslation()
  const { currentLanguage: language } = useLanguage()

  const [runningDays, setRunningDays] = useState(0)
  const [uptimeText, setUptimeText] = useState("")

  useEffect(() => {
    if (nodeStatus.startedAt) {
      const calculateUptime = () => {
        const now = new Date()
        const start = new Date(nodeStatus.startedAt)

        // 计算时间差（毫秒）
        const diffMs = now - start

        // 计算天数，使用 Math.floor 向下取整
        // 只有运行超过 24 小时才显示 1 天或更多
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))

        // 确保天数不为负数（防止时间设置错误）
        const validDays = Math.max(0, days)

        setRunningDays(validDays)
        setUptimeText(formatRelativeTime(nodeStatus.startedAt, language))
      }

      calculateUptime()
      const interval = setInterval(calculateUptime, 60000) // Update every minute
      return () => clearInterval(interval)
    }
  }, [nodeStatus.startedAt, language])

  const formattedInstallDate = profile.created_at
    ? formatDate(profile.created_at, language)
    : common.unknown()

  return (
    <>
      <Center
        bgColor={"gray.100"}
        color={"gray.600"}
        _dark={{
          bgColor: "rgba(26, 32, 44, 0.8)",
          color: "gray.300",
          borderColor: "gray.600",
        }}
        p={2}
        borderTop="1px solid"
        borderColor="gray.200"
      >
        <Container maxW="6xl">
          <HStack justify="space-between" w="full">
            {/* 左侧：Logo */}
            <Link
              href="https://github.com/epressworld/epress"
              target="_blank"
              rel="noopener noreferrer"
              _hover={{ opacity: 0.8 }}
            >
              <Image
                src="/assets/logo-light.svg"
                alt="epress logo"
                width={16}
              />
            </Link>

            {/* 右侧：运行状态 */}
            <Popover.Root placement="top">
              <Popover.Trigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  _hover={{
                    bgColor: "gray.200",
                    _dark: { bgColor: "gray.600" },
                  }}
                >
                  <HStack gap={2}>
                    <Text
                      fontSize="sm"
                      color="gray.500"
                      _dark={{ color: "gray.400" }}
                    >
                      {common.onlineDays(runningDays)}
                    </Text>
                    <Box
                      w={3}
                      h={3}
                      borderRadius="full"
                      bgColor="green.500"
                      flexShrink={0}
                    />
                  </HStack>
                </Button>
              </Popover.Trigger>
              <Popover.Positioner>
                <Popover.Content maxW="md">
                  <Popover.Arrow />
                  <Popover.Body>
                    <VStack gap={4} align="stretch">
                      {/* 版本信息 */}
                      <VStack gap={2} align="start">
                        <HStack gap={2}>
                          <FaCodeBranch size={16} />
                          <Text fontWeight="semibold">{common.version()}</Text>
                        </HStack>
                        <Text
                          fontSize="sm"
                          color="gray.600"
                          _dark={{ color: "gray.300" }}
                        >
                          v{nodeStatus.version || "..."}
                          <Badge ml={1} colorPalette={"orange"}>
                            Beta
                          </Badge>
                        </Text>
                      </VStack>

                      <Separator />

                      {/* 以太坊地址 */}
                      <VStack gap={2} align="start">
                        <HStack gap={2}>
                          <SiEthereum size={16} />
                          <Text fontWeight="semibold">
                            {common.ethereumAddress()}
                          </Text>
                        </HStack>
                        <Text
                          fontFamily="mono"
                          fontSize="sm"
                          color="gray.600"
                          _dark={{ color: "gray.300" }}
                          wordBreak="break-all"
                        >
                          {profile.address || "..."}
                        </Text>
                      </VStack>

                      <Separator />

                      {/* 安装时间 */}
                      <VStack gap={2} align="start">
                        <HStack gap={2}>
                          <LuCalendar size={16} />
                          <Text fontWeight="semibold">
                            {common.installTime()}
                          </Text>
                        </HStack>
                        <Text
                          fontSize="sm"
                          color="gray.600"
                          _dark={{ color: "gray.300" }}
                        >
                          {formattedInstallDate}
                        </Text>
                      </VStack>

                      <Separator />

                      {/* 运行天数 */}
                      <VStack gap={2} align="start">
                        <HStack gap={2}>
                          <LuClock size={16} />
                          <Text fontWeight="semibold">
                            {common.runningDays()}
                          </Text>
                        </HStack>
                        <HStack gap={2}>
                          <Badge colorPalette="green" variant="solid">
                            {common.daysWithCount(runningDays)}
                          </Badge>
                          <Text
                            fontSize="sm"
                            color="gray.600"
                            _dark={{ color: "gray.300" }}
                          >
                            ({common.sinceWithTime(uptimeText)})
                          </Text>
                        </HStack>
                      </VStack>
                    </VStack>
                  </Popover.Body>
                </Popover.Content>
              </Popover.Positioner>
            </Popover.Root>
          </HStack>
        </Container>
      </Center>

      <Toaster />
    </>
  )
}
