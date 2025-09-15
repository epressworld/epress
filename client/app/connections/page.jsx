"use client"
import { useQuery } from "@apollo/client/react"
import { Box, Heading, HStack, Text, VStack } from "@chakra-ui/react"
import { FollowersList, FollowingList } from "../../components/business"
import { LoadingSkeleton, UnifiedCard } from "../../components/ui"
import { SEARCH_NODES } from "../../graphql/queries"
import { usePageTitle } from "../../hooks/usePageTitle"
import { useTranslation } from "../../hooks/useTranslation"

export default function ConnectionsPage() {
  const { connection, common } = useTranslation()

  // 设置页面标题
  usePageTitle(common.pageTitle.connections())

  // 统一查询两个列表的数据
  const {
    data: followersData,
    loading: followersLoading,
    error: followersError,
  } = useQuery(SEARCH_NODES, {
    variables: {
      filterBy: { type: "followers" },
      orderBy: "-created_at",
      first: 20,
    },
    fetchPolicy: "cache-and-network",
  })

  const {
    data: followingData,
    loading: followingLoading,
    error: followingError,
  } = useQuery(SEARCH_NODES, {
    variables: {
      filterBy: { type: "following" },
      orderBy: "-created_at",
      first: 20,
    },
    fetchPolicy: "cache-and-network",
  })

  // 获取总数
  const followersTotal = followersData?.search?.total || 0
  const followingTotal = followingData?.search?.total || 0

  // 页面级加载状态
  const isLoading = followersLoading || followingLoading
  const hasError = followersError || followingError

  // 如果任一列表正在加载，显示页面级加载状态
  if (isLoading && !followersData && !followingData) {
    return <LoadingSkeleton count={6} />
  }

  // 如果有错误，显示错误信息
  if (hasError) {
    return (
      <VStack spacing={4} py={8}>
        <Heading size="lg" color="red.500">
          {common.loadFailed()}
        </Heading>
        <Box textAlign="center">
          {followersError && (
            <Box color="red.500" mb={2}>
              {connection.followers()}: {followersError.message}
            </Box>
          )}
          {followingError && (
            <Box color="red.500">
              {connection.following()}: {followingError.message}
            </Box>
          )}
        </Box>
      </VStack>
    )
  }

  return (
    <VStack spacing={6} align="stretch">
      {/* 关注我的 */}
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
              {followersTotal}
            </Text>
          </HStack>
        </UnifiedCard.Header>
        <UnifiedCard.Body pt={0}>
          <FollowersList
            initialData={followersData}
            loading={followersLoading}
            error={followersError}
          />
        </UnifiedCard.Body>
      </UnifiedCard.Root>

      {/* 我关注的 */}
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
              {followingTotal}
            </Text>
          </HStack>
        </UnifiedCard.Header>
        <UnifiedCard.Body pt={0}>
          <FollowingList
            initialData={followingData}
            loading={followingLoading}
            error={followingError}
          />
        </UnifiedCard.Body>
      </UnifiedCard.Root>
    </VStack>
  )
}
