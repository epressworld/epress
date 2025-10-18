"use client"
import {
  Box,
  HStack,
  Separator,
  Skeleton,
  SkeletonCircle,
  SkeletonText,
  Stack,
  VStack,
} from "@chakra-ui/react"
import { UnifiedCard } from "@/components/ui/UnifiedCard"

export function PublicationPost() {
  return (
    <UnifiedCard.Root w="full">
      <UnifiedCard.Body>
        <SkeletonText noOfLines={3} height="6" gap={3} />
        <Skeleton height="6" mt={5} width="120px" />
      </UnifiedCard.Body>
    </UnifiedCard.Root>
  )
}
export function PublicationImage() {
  return (
    <UnifiedCard.Root w="full">
      <Box w="full">
        <Skeleton height={"200px"} roundedBottom={0} w="full" />
      </Box>
      <UnifiedCard.Body>
        <SkeletonText noOfLines={3} gap={3} height={"6"} />
        <Skeleton height="6" mt={5} width="120px" />
      </UnifiedCard.Body>
    </UnifiedCard.Root>
  )
}
export function PublicationForm() {
  return (
    <UnifiedCard.Root w="full">
      <UnifiedCard.Body>
        <Skeleton height={"150px"} w="full" />
        <HStack mt={3} justify="space-between" align="center">
          <Box>
            <Skeleton height="36px" width="128px" />
          </Box>
          <Box textAlign={"right"}>
            <Skeleton height="36px" width="96px" />
          </Box>
        </HStack>
      </UnifiedCard.Body>
    </UnifiedCard.Root>
  )
}
export function Publications() {
  return (
    <VStack spacing={6} w="full">
      <PublicationForm />
      <PublicationPost />
      <PublicationImage />
    </VStack>
  )
}
export function PublicationDetail() {
  return (
    <VStack spacing={6}>
      <PublicationPost />
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
    </VStack>
  )
}
export function Connections() {
  return (
    <VStack spacing={6} align="stretch">
      <UnifiedCard.Root>
        <UnifiedCard.Header>
          <HStack justify="space-between" align="center">
            <Skeleton width="96px" height="8" />
            <Skeleton width="96px" height="8" />
          </HStack>
        </UnifiedCard.Header>
        <UnifiedCard.Body>
          <HStack width="full">
            <SkeletonCircle size="12" />
            <Stack flex="1">
              <Skeleton height="5" width="128px" />
              <Skeleton height="5" width="300px" />
            </Stack>
          </HStack>
        </UnifiedCard.Body>
      </UnifiedCard.Root>
      <UnifiedCard.Root>
        <UnifiedCard.Header>
          <HStack justify="space-between" align="center">
            <Skeleton width="96px" height="8" />
            <Skeleton width="96px" height="8" />
          </HStack>
        </UnifiedCard.Header>
        <UnifiedCard.Body>
          <HStack width="full">
            <SkeletonCircle size="12" />
            <Stack flex="1">
              <Skeleton height="5" width="128px" />
              <Skeleton height="5" width="300px" />
            </Stack>
          </HStack>
        </UnifiedCard.Body>
      </UnifiedCard.Root>
    </VStack>
  )
}
