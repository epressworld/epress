"use client"
import { VStack } from "@chakra-ui/react"
import { useRef } from "react"
import { FollowersList, FollowingList } from "@/components/features/connection"
import { PullToRefresh, toaster } from "@/components/ui"
import { useIntl, usePageTitle, usePullToRefresh } from "@/hooks/utils"

/**
 * Connections page component
 * Displays followers and following lists
 */
export function ConnectionPage() {
  const { t } = useIntl()
  const contentTriggerRef = useRef(null)
  const followersRef = useRef(null)
  const followingRef = useRef(null)

  usePageTitle(t("common.pageTitle.connections"))

  // Handle refresh for both lists
  const handleRefresh = async () => {
    // Wait for all refetch operations to complete
    try {
      // Refetch followers if available
      if (followersRef.current?.refetch) {
        await followersRef.current.refetch()
      }

      // Refetch following if available
      if (followingRef.current?.refetch) {
        await followingRef.current.refetch()
      }
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
      {/* Pull to refresh indicator */}
      <PullToRefresh
        isRefreshing={isRefreshing}
        pullPosition={pullPosition}
        isPulling={isPulling}
      />

      {/* Attach ref to the main content wrapper */}
      <VStack ref={contentTriggerRef} spacing={6} align="stretch">
        <FollowersList ref={followersRef} />
        <FollowingList ref={followingRef} />
      </VStack>
    </>
  )
}
