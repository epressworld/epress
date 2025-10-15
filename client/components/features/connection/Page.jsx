"use client"
import { VStack } from "@chakra-ui/react"
import { FollowersList, FollowingList } from "@/components/features/connection"
import { useIntl, usePageTitle } from "@/hooks/utils"

/**
 * Connections page component
 * Displays followers and following lists
 */
export function ConnectionPage() {
  const { t } = useIntl()

  usePageTitle(t("common.pageTitle.connections"))

  return (
    <VStack spacing={6} align="stretch">
      <FollowersList />
      <FollowingList />
    </VStack>
  )
}
