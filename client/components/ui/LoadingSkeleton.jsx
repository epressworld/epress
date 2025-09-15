import { Box, Stack } from "@chakra-ui/react"
import { UnifiedCard } from "./UnifiedCard"

/**
 * 加载骨架屏组件
 * @param {number} count - 骨架屏数量
 * @returns {JSX.Element} 骨架屏组件
 */
export const LoadingSkeleton = ({ count = 5 }) => {
  return (
    <Stack gap={6}>
      {Array.from({ length: count }).map((_, index) => (
        <UnifiedCard.Root key={index}>
          <UnifiedCard.Header>
            <Box
              bg="gray.200"
              _dark={{ bg: "gray.700" }}
              h="24px"
              w="200px"
              borderRadius="md"
            />
          </UnifiedCard.Header>
          <UnifiedCard.Body>
            <Stack gap={4}>
              <Box
                bg="gray.200"
                _dark={{ bg: "gray.700" }}
                h="60px"
                borderRadius="md"
              />
              <Box
                bg="gray.200"
                _dark={{ bg: "gray.700" }}
                h="60px"
                borderRadius="md"
              />
              <Box
                bg="gray.200"
                _dark={{ bg: "gray.700" }}
                h="60px"
                borderRadius="md"
              />
            </Stack>
          </UnifiedCard.Body>
        </UnifiedCard.Root>
      ))}
    </Stack>
  )
}
