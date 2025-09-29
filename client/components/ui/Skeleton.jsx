"use client"
import {
  Box,
  HStack,
  Separator,
  Skeleton,
  SkeletonCircle,
  SkeletonText,
  VStack,
} from "@chakra-ui/react"
import { UnifiedCard } from "./UnifiedCard"

export function Publication() {
  return (
    <Box>
      <SkeletonText noOfLines={3} gap={3} />
      <Skeleton height="4" mt={5} width="120px" />
    </Box>
  )
}
export function Publications({ total = 2, children, spacing = 6, ...props }) {
  return (
    <VStack spacing={spacing} {...props}>
      {Array.from({ length: total }).map((_, index) => (
        <UnifiedCard.Root key={index} w="full">
          <UnifiedCard.Body>
            <Publication />
          </UnifiedCard.Body>
        </UnifiedCard.Root>
      ))}
      {children}
    </VStack>
  )
}
export function PublicationDetail() {
  return (
    <Publications total={1} gap={4}>
      <UnifiedCard.Root w="full">
        <UnifiedCard.Body>
          <HStack width="full">
            <SkeletonCircle size="10" />
            <SkeletonText width="50%" noOfLines={2} />
          </HStack>
          <Skeleton mt={2} height="20px" />
          <Separator my={6} />
          <Skeleton height="32px" width="100%" />
          <Skeleton mt={2} height="80px" />
        </UnifiedCard.Body>
      </UnifiedCard.Root>
    </Publications>
  )
}
export function Connections() {
  return (
    <VStack spacing={6} align="stretch">
      <UnifiedCard.Root>
        <UnifiedCard.Body>
          <HStack width="full">
            <SkeletonCircle size="10" />
            <SkeletonText width="50%" noOfLines={2} />
          </HStack>
        </UnifiedCard.Body>
      </UnifiedCard.Root>
      <UnifiedCard.Root>
        <UnifiedCard.Body>
          <HStack width="full">
            <SkeletonCircle size="10" />
            <SkeletonText width="50%" noOfLines={2} />
          </HStack>
        </UnifiedCard.Body>
      </UnifiedCard.Root>
    </VStack>
  )
}
