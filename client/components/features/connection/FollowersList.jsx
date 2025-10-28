"use client"
import { useSuspenseQuery } from "@apollo/client/react"
import { Box, Button, Icon, Spinner, Text, VStack } from "@chakra-ui/react"
import { useState, useTransition } from "react"
import { LuUsers } from "react-icons/lu"
import { EmptyState, LoadMoreButton, toaster } from "@/components/ui"
import { useIntl } from "@/hooks/utils"
import { SEARCH_NODES } from "@/lib/apollo"
import { ConnectionItem } from "./Item"
import { ConnectionList } from "./List"
export function FollowersList({ onRefetch }) {
  const { t } = useIntl()
  const [loading, setLoading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [hasAttemptedLoadMore, setHasAttemptedLoadMore] = useState(false)

  const { data, fetchMore, error, refetch } = useSuspenseQuery(SEARCH_NODES, {
    variables: {
      filterBy: { type: "followers" },
      orderBy: "-created_at",
      first: 20,
    },
    notifyOnNetworkStatusChange: true,
    fetchPolicy: "cache-and-network",
    nextFetchPolicy: "cache-and-network",
  })

  const hasMore = data?.search?.pageInfo?.hasNextPage
  const followers = data?.search?.edges || []
  const total = data?.search?.total

  const handleLoadMore = async (event) => {
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }

    if (!hasMore || isPending) return

    setHasAttemptedLoadMore(true)
    startTransition(() => {
      setLoading(true)
      fetchMore({
        variables: {
          after: data?.search?.pageInfo?.endCursor,
        },
      })
        .catch((error) => {
          console.error("加载更多失败:", error)
          toaster.create({
            description: t("common.loadMoreFailed"),
            type: "error",
          })
        })
        .finally(() => {
          setLoading(false)
        })
    })
  }

  const handleRefresh = () => {
    if (onRefetch) {
      onRefetch()
    } else {
      refetch()
    }
  }

  // 加载状态
  if (loading && !data) {
    return (
      <ConnectionList
        icon={<Icon as={LuUsers} />}
        title={t("connection.followers")}
        total={total}
      >
        <VStack colorPalette="orange">
          <Spinner color="colorPalette.600" />
          <Text color="colorPalette.600">Loading...</Text>
        </VStack>
      </ConnectionList>
    )
  }

  // 错误状态
  if (error) {
    return (
      <ConnectionList
        title={t("connection.followers")}
        icon={<Icon as={LuUsers} />}
        total={total}
      >
        <Box textAlign="center" py={12}>
          <Icon as={LuUsers} boxSize={12} color="red.500" mb={4} />
          <Text color="red.500" fontSize="lg" mb={2}>
            {t("common.loadFailed")}
          </Text>
          <Text color="gray.500" _dark={{ color: "gray.400" }} mb={4}>
            {error.message || t("common.loadFailed")}
          </Text>
          <Button onClick={handleRefresh} colorPalette="orange" size="sm">
            {t("common.retry")}
          </Button>
        </Box>
      </ConnectionList>
    )
  }

  // 空状态
  if (followers.length === 0 && !loading) {
    return (
      <ConnectionList
        title={t("connection.followers")}
        icon={<Icon as={LuUsers} />}
        total={0}
      >
        <EmptyState
          title={t("connection.noFollowers")}
          description={t("connection.noFollowersDescription")}
          icon={<Icon as={LuUsers} />}
        />
      </ConnectionList>
    )
  }

  return (
    <ConnectionList
      icon={<Icon as={LuUsers} />}
      title={t("connection.followers")}
      total={total}
    >
      <VStack gap={4} py={4} align="stretch">
        {followers.map(({ node }) => (
          <ConnectionItem key={`follower-${node.address}`} node={node} />
        ))}

        <LoadMoreButton
          hasMore={hasMore}
          loading={loading}
          onLoadMore={handleLoadMore}
          hasAttemptedLoadMore={hasAttemptedLoadMore}
        />
      </VStack>
    </ConnectionList>
  )
}
