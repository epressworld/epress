"use client"
import { Heading, HStack, Text, VStack } from "@chakra-ui/react"
import { FollowersList, FollowingList } from "../../components/business"
import { UnifiedCard } from "../../components/ui"
import { usePageTitle } from "../../hooks/usePageTitle"
import { useTranslation } from "../../hooks/useTranslation"

export default function ClientPage({
  initialFollowersData,
  initialFollowingData,
  initialFollowersTotal,
  initialFollowingTotal,
}) {
  const { connection, common } = useTranslation()

  usePageTitle(common.pageTitle.connections())

  return (
    <VStack spacing={6} align="stretch">
      <UnifiedCard.Root>
        <UnifiedCard.Header pb={2}>
          <HStack justify="space-between" align="center">
            <Heading size="lg" color="gray.700">
              {connection.followers()}
            </Heading>
            <Text
              fontSize="lg"
              fontWeight="bold"
              fontStyle="italic"
              color="gray.400"
              _dark={{ color: "gray.600" }}
            >
              {initialFollowersTotal}
            </Text>
          </HStack>
        </UnifiedCard.Header>
        <UnifiedCard.Body pt={0}>
          <FollowersList initialData={initialFollowersData} />
        </UnifiedCard.Body>
      </UnifiedCard.Root>

      <UnifiedCard.Root>
        <UnifiedCard.Header pb={2}>
          <HStack justify="space-between" align="center">
            <Heading size="lg" color="gray.700">
              {connection.following()}
            </Heading>
            <Text
              fontSize="lg"
              fontWeight="bold"
              fontStyle="italic"
              color="gray.400"
              _dark={{ color: "gray.600" }}
            >
              {initialFollowingTotal}
            </Text>
          </HStack>
        </UnifiedCard.Header>
        <UnifiedCard.Body pt={0}>
          <FollowingList initialData={initialFollowingData} />
        </UnifiedCard.Body>
      </UnifiedCard.Root>
    </VStack>
  )
}
