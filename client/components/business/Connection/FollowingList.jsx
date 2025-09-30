"use client"
import { useMutation, useSuspenseQuery } from "@apollo/client/react"
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
import { useAuth } from "../../../contexts/AuthContext"
import { DESTROY_CONNECTION } from "../../../graphql/mutations"
import { SEARCH_NODES } from "../../../graphql/queries"
import { useTranslation } from "../../../hooks/useTranslation"
import { useWallet } from "../../../hooks/useWallet"
import { deleteConnectionTypedData } from "../../../utils/eip712"
import { ConfirmDialog, UnifiedCard } from "../../ui"
import { EmptyStateComponent } from "../../ui/EmptyState"
import { toaster } from "../../ui/toaster"

const Container = ({ children, lang, total }) => (
  <UnifiedCard.Root>
    <UnifiedCard.Header pb={2}>
      <HStack justify="space-between" align="center">
        <Heading size="lg" color="gray.700">
          {lang.following()}
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

const FollowingList = () => {
  const [hasAttemptedLoadMore, setHasAttemptedLoadMore] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [selectedNode, setSelectedNode] = useState(null)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { isNodeOwner } = useAuth()
  const { address, signEIP712Data } = useWallet()
  const { connection, common } = useTranslation()

  // 使用传入的数据或查询数据
  const { data, error, fetchMore } = useSuspenseQuery(SEARCH_NODES, {
    variables: {
      filterBy: { type: "following" },
      orderBy: "-created_at",
      first: 20,
    },
    notifyOnNetworkStatusChange: true,
    // 始终进行网络校验，确保关注关系变更后能及时刷新
    fetchPolicy: "cache-and-network",
    nextFetchPolicy: "cache-and-network",
  })

  // 使用传入的数据或查询的数据
  // 优先使用实时查询数据；如果尚未返回，则使用 initialData
  const [destroyConnection, { loading: isDestroying }] =
    useMutation(DESTROY_CONNECTION)
  const hasMore = data?.search?.pageInfo?.hasNextPage

  // 加载更多
  const loadMore = async (event) => {
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
            description: common.loadMoreFailed(),
            type: "error",
          })
        })
        .finally(() => {
          setLoading(false)
        })
    })
  }

  // 处理取消关注
  const handleUnfollow = async (node) => {
    if (!isNodeOwner || !address) {
      toaster.create({
        description: connection.onlyNodeOwnerCanUnfollow(),
        type: "error",
      })
      return
    }

    setSelectedNode(node)
    setIsOpen(true)
  }

  // 确认取消关注
  const handleConfirmUnfollow = async () => {
    if (!selectedNode || !address) return

    try {
      const timestamp = Math.floor(Date.now() / 1000)
      const typedData = deleteConnectionTypedData(
        selectedNode.address,
        address,
        timestamp,
      )

      const signature = await signEIP712Data(typedData)

      if (!signature) {
        toaster.create({
          description: connection.signatureFailed(),
          type: "error",
        })
        return
      }

      await destroyConnection({
        variables: {
          typedData,
          signature: signature,
        },
        refetchQueries: [
          {
            query: SEARCH_NODES,
            variables: {
              filterBy: { type: "following" },
              orderBy: "-created_at",
              first: 20,
            },
          },
        ],
        awaitRefetchQueries: true,
      })

      toaster.create({
        description: connection.unfollowSuccess(),
        type: "success",
      })

      setIsOpen(false)
      setSelectedNode(null)
    } catch (error) {
      console.error("取消关注失败:", error)
      toaster.create({
        description: error.message || connection.unfollowFailed(),
        type: "error",
      })
    }
  }
  const total = data?.search?.total

  if (loading && !data) {
    return (
      <Container lang={connection} total={total}>
        <VStack colorPalette="orange">
          <Spinner color="colorPalette.600" />
          <Text color="colorPalette.600">Loading...</Text>
        </VStack>
      </Container>
    )
  }

  if (error) {
    return (
      <Container lang={connection} total={total}>
        <Box p={4}>
          <Text color="red.500">
            {common.loadFailed()}: {error.message}
          </Text>
        </Box>
      </Container>
    )
  }

  const following = data?.search?.edges?.map((edge) => edge.node) || []

  return (
    <Container lang={connection} total={total}>
      <Box>
        <VStack spacing={4} align="stretch">
          {following.map((node) => (
            <HStack
              key={`following-${node.address}`}
              spacing={4}
              align="start"
              p={3}
              borderRadius="md"
              _hover={{ bg: "gray.50", _dark: { bg: "gray.800" } }}
              transition="all 0.2s"
              justify="space-between"
            >
              <HStack spacing={4} align="start" flex={1} minW={0}>
                <Avatar.Root size="md">
                  <Avatar.Fallback name={node.title} />
                  <Avatar.Image
                    src={node.url ? `${node.url}/ewp/avatar` : undefined}
                  />
                </Avatar.Root>

                <Box flex={1} minW={0}>
                  {node.url ? (
                    <Text
                      as="a"
                      href={node.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      fontWeight="medium"
                      fontSize="sm"
                      noOfLines={1}
                      color="orange.500"
                      _hover={{
                        color: "orange.600",
                        textDecoration: "underline",
                      }}
                    >
                      {node.title}
                    </Text>
                  ) : (
                    <Text fontWeight="medium" fontSize="sm" noOfLines={1}>
                      {node.title}
                    </Text>
                  )}
                  {node.address && (
                    <Text
                      color="gray.400"
                      fontSize="xs"
                      fontFamily="mono"
                      mt={1}
                      noOfLines={1}
                    >
                      {node.address}
                    </Text>
                  )}
                  <Text color="gray.500" fontSize="xs" noOfLines={2} mt={1}>
                    {node.description}
                  </Text>
                </Box>
              </HStack>

              {isNodeOwner && (
                <Button
                  size="xs"
                  variant="outline"
                  colorPalette="red"
                  onClick={() => handleUnfollow(node)}
                  loading={isDestroying}
                >
                  {connection.unfollow()}
                </Button>
              )}
            </HStack>
          ))}

          {hasMore && (
            <HStack justify="center" py={4}>
              <Button
                onClick={loadMore}
                loading={loading}
                variant="ghost"
                size="sm"
                colorPalette="orange"
                type="button"
                tabIndex={-1}
                onFocus={(e) => e.target.blur()}
              >
                <LuEllipsis />
              </Button>
            </HStack>
          )}

          {!hasMore && following.length > 0 && hasAttemptedLoadMore && (
            <Text
              textAlign="center"
              color="gray.400"
              _dark={{ color: "gray.500" }}
              fontSize="sm"
              py={4}
            >
              {common.noMore()}
            </Text>
          )}

          {following.length === 0 && !loading && (
            <EmptyStateComponent
              title={connection.noFollowing()}
              description={connection.noFollowingDescription()}
              icon={<Icon as={LuUsers} />}
            />
          )}
        </VStack>

        {/* 取消关注确认对话框 */}
        <ConfirmDialog
          isOpen={isOpen}
          onClose={() => {
            setIsOpen(false)
            setSelectedNode(null)
          }}
          onConfirm={handleConfirmUnfollow}
          title={connection.confirmUnfollow()}
          description={connection.confirmUnfollowMessage(
            selectedNode?.title || "",
          )}
          confirmText={connection.unfollow()}
          cancelText={common.cancel()}
          isLoading={isDestroying}
          colorPalette="red"
        />
      </Box>
    </Container>
  )
}

export default FollowingList
