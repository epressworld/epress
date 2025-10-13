"use client"
import { useSuspenseQuery } from "@apollo/client/react"
import {
  Avatar,
  Box,
  Button,
  Heading,
  HStack,
  Icon,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useState, useTransition } from "react"
import { LuEllipsis, LuUsers } from "react-icons/lu"
import { SEARCH_NODES } from "../../../graphql/queries"
import { useIntl } from "../../../hooks/useIntl"
import { toaster, UnifiedCard } from "../../ui"
import { EmptyStateComponent } from "../../ui/EmptyState"

const Container = ({ children, total }) => {
  const { t } = useIntl()
  return (
    <UnifiedCard.Root>
      <UnifiedCard.Header pb={2}>
        <HStack justify="space-between" align="center">
          <Heading size="lg" color="gray.700">
            {t("connection")("followers")}
          </Heading>
          <Text
            fontSize="lg"
            fontWeight="bold"
            fontStyle="italic"
            color="gray.400"
            _dark={{ color: "gray.600" }}
          >
            {total}
          </Text>
        </HStack>
      </UnifiedCard.Header>
      <UnifiedCard.Body pt={0}>{children}</UnifiedCard.Body>
    </UnifiedCard.Root>
  )
}
export function FollowersList({ onRefetch }) {
  const { t } = useIntl()
  const [loading, setLoading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [hasAttemptedLoadMore, setHasAttemptedLoadMore] = useState(false)

  // 使用传入的数据或查询数据
  const { data, fetchMore, error, refetch } = useSuspenseQuery(SEARCH_NODES, {
    variables: {
      filterBy: { type: "followers" },
      orderBy: "-created_at",
      first: 20,
    },
    notifyOnNetworkStatusChange: true,
    // 始终进行网络校验，确保关注关系变更后能及时刷新
    fetchPolicy: "cache-and-network",
    nextFetchPolicy: "cache-and-network",
  })
  const hasMore = data?.search?.pageInfo?.hasNextPage

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
            description: t("common")("loadMoreFailed"),
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

  if (loading && !data) {
    return (
      <Container total={data?.search?.total}>
        <VStack colorPalette="orange">
          <Spinner color="colorPalette.600" />
          <Text color="colorPalette.600">Loading...</Text>
        </VStack>
      </Container>
    )
  }

  // 处理错误状态
  if (error) {
    return (
      <Container total={data?.search?.total}>
        <Box textAlign="center" py={12}>
          <Icon as={LuUsers} boxSize={12} color="red.500" mb={4} />
          <Text color="red.500" fontSize="lg" mb={2}>
            {t("common")("loadFailed")}
          </Text>
          <Text color="gray.500" _dark={{ color: "gray.400" }} mb={4}>
            {error.message || t("common")("loadFailed")}
          </Text>
          <Button onClick={handleRefresh} colorPalette="orange" size="sm">
            {t("common")("retry")}
          </Button>
        </Box>
      </Container>
    )
  }

  const followers = data?.search?.edges || []

  // 处理空状态
  if (followers.length === 0 && !loading) {
    return (
      <Container lang={t("connection")("followers")} total={0}>
        <EmptyStateComponent
          title={t("connection")("noFollowers")}
          description={t("connection")("noFollowersDescription")}
          icon={<Icon as={LuUsers} />}
        />
      </Container>
    )
  }

  return (
    <Container lang={t("connection")("followers")} total={data?.search?.total}>
      <VStack spacing={2} align="stretch">
        {followers.map(({ node }) => (
          <FollowerItem key={`follower-${node.address}`} follower={node} />
        ))}

        {hasMore && (
          <Box textAlign="center" py={6}>
            <Button
              onClick={handleLoadMore}
              loading={loading}
              colorPalette="orange"
              variant="ghost"
              size="sm"
              disabled={loading}
            >
              <LuEllipsis />
            </Button>
          </Box>
        )}

        {!hasMore && hasAttemptedLoadMore && (
          <Box textAlign="center" py={4}>
            <Text color="gray.400" _dark={{ color: "gray.500" }} fontSize="sm">
              {t("common")("noMore")}
            </Text>
          </Box>
        )}
      </VStack>
    </Container>
  )
}

function FollowerItem({ follower }) {
  const { t } = useIntl()

  // 安全地处理可能为空的数据
  const title = follower?.title || follower?.address || t("node")("unnamedNode")
  const description = follower?.description || t("node")("noDescription")
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
