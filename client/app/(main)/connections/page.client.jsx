"use client"
import { VStack } from "@chakra-ui/react"
import { FollowersList, FollowingList } from "../../../components/business"
import { useIntl } from "../../../hooks/useIntl"
import { usePageTitle } from "../../../hooks/usePageTitle"

export default function ClientPage() {
  const { t } = useIntl()

  usePageTitle(t("common")("pageTitle.connections"))

  return (
    <VStack spacing={6} align="stretch">
      <FollowersList />
      <FollowingList />
    </VStack>
  )
}
