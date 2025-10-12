"use client"
import { VStack } from "@chakra-ui/react"
import { FollowersList, FollowingList } from "../../../components/business"
import { usePageTitle } from "../../../hooks/usePageTitle"
import { useTranslation } from "../../../hooks/useTranslation"

export default function ClientPage() {
  const { common } = useTranslation()

  usePageTitle(common.pageTitle.connections())

  return (
    <VStack spacing={6} align="stretch">
      <FollowersList />
      <FollowingList />
    </VStack>
  )
}
