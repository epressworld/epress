"use client"
import { useQuery } from "@apollo/client/react"
import {
  Avatar,
  Box,
  Button,
  HStack,
  Icon,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useEffect, useState } from "react"
import { LuEllipsis, LuUsers } from "react-icons/lu"
import { SEARCH_NODES } from "../../../graphql/queries"
import { useTranslation } from "../../../hooks/useTranslation"
import { LoadingSkeleton } from "../../ui"

export function FollowersList({ initialData, loading, error, onRefetch }) {
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(
    initialData?.search?.pageInfo?.hasNextPage ?? true,
  )
  const { connection, common } = useTranslation()

  // 使用传入的数据或查询数据
  const {
    data,
    loading: queryLoading,
    error: queryError,
    refetch,
    networkStatus,
  } = useQuery(SEARCH_NODES, {
    variables: {
      filterBy: { type: "followers" },
      orderBy: "-created_at",
      first: 20,
      after: page > 1 ? ((page - 1) * 20).toString() : undefined,
    },
    notifyOnNetworkStatusChange: true,
    // 始终进行网络校验，确保关注关系变更后能及时刷新
    fetchPolicy: "cache-and-network",
    nextFetchPolicy: "cache-and-network",
    // 在服务器端跳过，依赖 initialData，避免 SSR 时不必要的 loading=true
    skip: typeof window === "undefined",
  })

  // 使用传入的数据或查询的数据
  // 优先使用实时查询数据；如果尚未返回，则使用 initialData
  const currentData = data ?? initialData
  const currentLoading = loading || queryLoading
  const currentError = error || queryError

  useEffect(() => {
    if (currentData?.search) {
      setHasMore(currentData.search.pageInfo?.hasNextPage || false)
    }
  }, [currentData])

  const handleLoadMore = () => {
    if (!hasMore || networkStatus === 2) return
    setPage((prev) => prev + 1)
  }

  const handleRefresh = () => {
    setPage(1)
    setHasMore(true)
    if (onRefetch) {
      onRefetch()
    } else {
      refetch()
    }
  }

  // 处理加载更多时的错误
  if (currentLoading && page === 1 && !initialData) {
    return <LoadingSkeleton count={3} />
  }

  // 处理错误状态
  if (currentError) {
    return (
      <Box textAlign="center" py={12}>
        <Icon as={LuUsers} boxSize={12} color="red.500" mb={4} />
        <Text color="red.500" fontSize="lg" mb={2}>
          {common.loadFailed()}
        </Text>
        <Text color="gray.500" _dark={{ color: "gray.400" }} mb={4}>
          {currentError.message || common.loadFailed()}
        </Text>
        <Button onClick={handleRefresh} colorPalette="orange" size="sm">
          {common.retry()}
        </Button>
      </Box>
    )
  }

  const followers = currentData?.search?.edges || []
  console.log(
    currentLoading,
    followers,
    "============",
    loading,
    queryLoading,
    typeof window === "undefined",
  )

  // 处理空状态
  if (followers.length === 0 && !currentLoading) {
    return (
      <Box textAlign="center" py={12}>
        <Icon as={LuUsers} boxSize={16} color="gray.300" mb={4} />
        <Text
          color="gray.500"
          _dark={{ color: "gray.400" }}
          fontSize="lg"
          mb={2}
        >
          {connection.noFollowers()}
        </Text>
        <Text color="gray.400" _dark={{ color: "gray.500" }} fontSize="sm">
          {connection.noFollowersDescription()}
        </Text>
      </Box>
    )
  }

  return (
    <VStack spacing={2} align="stretch">
      {followers.map(({ node, cursor }) => (
        <FollowerItem key={cursor} follower={node} />
      ))}

      {hasMore && (
        <Box textAlign="center" py={6}>
          <Button
            onClick={handleLoadMore}
            loading={networkStatus === 2}
            colorPalette="orange"
            variant="ghost"
            size="sm"
            disabled={networkStatus === 2}
          >
            <LuEllipsis />
          </Button>
        </Box>
      )}

      {!hasMore && followers.length > 0 && page > 1 && (
        <Box textAlign="center" py={4}>
          <Text color="gray.400" _dark={{ color: "gray.500" }} fontSize="sm">
            {common.noMore()}
          </Text>
        </Box>
      )}
    </VStack>
  )
}

function FollowerItem({ follower }) {
  const { node } = useTranslation()

  // 安全地处理可能为空的数据
  const title = follower?.title || follower?.address || node.unnamedNode()
  const description = follower?.description || node.noDescription()
  const address = follower?.address
  const url = follower?.url
  const avatar = url ? `${url}/ewp/avatar` : undefined

  return (
    <HStack
      spacing={4}
      align="start"
      p={3}
      borderRadius="md"
      _hover={{ bg: "gray.50", _dark: { bg: "gray.800" } }}
      transition="all 0.2s"
    >
      <Avatar.Root size="md">
        <Avatar.Fallback name={title} />
        <Avatar.Image src={avatar} />
      </Avatar.Root>
      <Box flex={1} minW={0}>
        {url ? (
          <Text
            as="a"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            fontWeight="medium"
            fontSize="sm"
            noOfLines={1}
            color="orange.500"
            _hover={{ color: "orange.600", textDecoration: "underline" }}
          >
            {title}
          </Text>
        ) : (
          <Text fontWeight="medium" fontSize="sm" noOfLines={1}>
            {title}
          </Text>
        )}
        {address && (
          <Text
            fontSize="xs"
            color="gray.400"
            _dark={{ color: "gray.500" }}
            fontFamily="mono"
            mt={1}
            noOfLines={1}
          >
            {address}
          </Text>
        )}
        <Text
          fontSize="xs"
          color="gray.500"
          _dark={{ color: "gray.400" }}
          noOfLines={2}
          mt={1}
        >
          {description}
        </Text>
      </Box>
    </HStack>
  )
}
