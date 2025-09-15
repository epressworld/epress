"use client"

import { Box, Button, Heading, HStack, Text, VStack } from "@chakra-ui/react"
import { useRouter } from "next/navigation"
import { LuArrowLeft, LuHouse } from "react-icons/lu"

export default function NotFound() {
  const router = useRouter()

  // 在 404 页面中忽略钱包相关的错误
  if (typeof window !== "undefined") {
    const originalConsoleError = console.error
    console.error = (...args) => {
      const message = args[0]
      if (
        typeof message === "string" &&
        message.includes("Cross-Origin-Opener-Policy") &&
        message.includes("HTTP error! status: 404")
      ) {
        return // 忽略这个特定的错误
      }
      originalConsoleError(...args)
    }
  }

  return (
    <Box minH="60vh" display="flex" alignItems="center" justifyContent="center">
      <VStack gap={8} textAlign="center" maxW="md" mx="auto" px={4}>
        {/* 404 图标 */}
        <Box position="relative">
          <Text
            fontSize="8xl"
            fontWeight="bold"
            color="orange.200"
            lineHeight="1"
          >
            404
          </Text>
          <Box
            position="absolute"
            top="50%"
            left="50%"
            transform="translate(-50%, -50%)"
            bg="orange.100"
            borderRadius="full"
            w="120px"
            h="120px"
            zIndex="-1"
          />
        </Box>

        {/* 标题和描述 */}
        <VStack gap={4}>
          <Heading size="xl" color="gray.700">
            页面未找到
          </Heading>
          <Text color="gray.500" fontSize="lg">
            抱歉，您访问的页面不存在或已被移动。
          </Text>
          <Text color="gray.400" fontSize="sm">
            请检查 URL 是否正确，或返回首页继续浏览。
          </Text>
        </VStack>

        {/* 操作按钮 */}
        <HStack gap={4} pt={4}>
          <Button
            leftIcon={<LuArrowLeft />}
            variant="outline"
            onClick={() => router.back()}
            colorPalette="orange"
          >
            返回上页
          </Button>
          <Button
            leftIcon={<LuHouse />}
            onClick={() => router.push("/publications")}
            colorPalette="orange"
          >
            回到首页
          </Button>
        </HStack>

        {/* 装饰性元素 */}
        <Box
          position="absolute"
          top="20%"
          left="10%"
          w="60px"
          h="60px"
          bg="orange.50"
          borderRadius="full"
          opacity="0.6"
          zIndex="-1"
        />
        <Box
          position="absolute"
          bottom="20%"
          right="10%"
          w="40px"
          h="40px"
          bg="orange.100"
          borderRadius="full"
          opacity="0.4"
          zIndex="-1"
        />
      </VStack>
    </Box>
  )
}
