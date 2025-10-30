"use client"
import { useApolloClient } from "@apollo/client/react"
import { VStack } from "@chakra-ui/react"
import { useRef } from "react"
import { FollowersList, FollowingList } from "@/components/features/connection"
import { PullToRefresh, toaster } from "@/components/ui"
import { useIntl, usePageTitle, usePullToRefresh } from "@/hooks/utils"
import { SEARCH_NODES } from "@/lib/apollo"

/**
 * Connections page component
 * Displays followers and following lists
 */
export function ConnectionPage() {
  const { t } = useIntl()
  const contentTriggerRef = useRef(null)
  const client = useApolloClient()

  usePageTitle(t("common.pageTitle.connections"))

  // Handle refresh for both lists
  const handleRefresh = async () => {
    try {
      await client.refetchQueries({
        include: [SEARCH_NODES],
      })
      toaster.create({
        description: t("common.refreshSuccess"),
        type: "success",
      })
    } catch (error) {
      console.warn(error)
      toaster.create({
        description: t("common.refreshFailed"),
        type: "error",
      })
    }
  }

  // Pull to refresh hook
  const { isRefreshing, pullPosition, isPulling } = usePullToRefresh({
    onRefresh: handleRefresh,
    triggerRef: contentTriggerRef,
  })

  return (
    <>
      <PullToRefresh
        isRefreshing={isRefreshing}
        pullPosition={pullPosition}
        isPulling={isPulling}
      />

      {/* Attach ref to the main content wrapper */}
      <VStack ref={contentTriggerRef} spacing={6} align="stretch">
        <FollowersList />
        <FollowingList />
      </VStack>
    </>
  )
}
