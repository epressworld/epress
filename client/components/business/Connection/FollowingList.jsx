"use client"
import { useMutation, useQuery } from "@apollo/client/react"
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
import { useAuth } from "../../../contexts/AuthContext"
import { DESTROY_CONNECTION } from "../../../graphql/mutations"
import { SEARCH_NODES } from "../../../graphql/queries"
import { useTranslation } from "../../../hooks/useTranslation"
import { useWallet } from "../../../hooks/useWallet"
import { deleteConnectionTypedData } from "../../../utils/eip712"
import { ConfirmDialog, LoadingSkeleton } from "../../ui"
import { toaster } from "../../ui/toaster"

const FollowingList = ({ initialData, loading, error }) => {
  const [hasMore, setHasMore] = useState(true)
  const [hasAttemptedLoadMore, setHasAttemptedLoadMore] = useState(false)
  const [selectedNode, setSelectedNode] = useState(null)
  const [isOpen, setIsOpen] = useState(false)
  const { isNodeOwner } = useAuth()
  const { address, signEIP712Data } = useWallet()
  const { connection, common } = useTranslation()

  // 使用传入的数据或查询数据
  const {
    data,
    loading: queryLoading,
    error: queryError,
    fetchMore,
  } = useQuery(SEARCH_NODES, {
    variables: {
      filterBy: { type: "following" },
      orderBy: "-created_at",
      first: 20,
    },
    notifyOnNetworkStatusChange: true,
    fetchPolicy: "cache-and-network",
    skip: !!initialData, // 如果有初始数据就跳过查询
  })

  // 使用传入的数据或查询的数据
  const currentData = initialData || data
  const currentLoading = loading || queryLoading
  const currentError = error || queryError

  const [destroyConnection, { loading: isDestroying }] =
    useMutation(DESTROY_CONNECTION)

  // 更新 hasMore 状态
  useEffect(() => {
    if (currentData?.search?.pageInfo) {
      setHasMore(currentData.search.pageInfo.hasNextPage)
    }
  }, [currentData])

  // 加载更多
  const loadMore = async (event) => {
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }

    if (!hasMore || loading) return

    try {
      setHasAttemptedLoadMore(true)
      await fetchMore({
        variables: {
          after: data?.search?.pageInfo?.endCursor,
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev

          return {
            search: {
              ...fetchMoreResult.search,
              edges: [...prev.search.edges, ...fetchMoreResult.search.edges],
            },
          }
        },
      })
    } catch (error) {
      console.error("加载更多失败:", error)
      toaster.create({
        description: common.loadMoreFailed(),
        type: "error",
      })
    }
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

  if (currentLoading && !currentData) {
    return <LoadingSkeleton count={3} />
  }

  if (currentError) {
    return (
      <Box p={4}>
        <Text color="red.500">
          {common.loadFailed()}: {currentError.message}
        </Text>
      </Box>
    )
  }

  const following = currentData?.search?.edges?.map((edge) => edge.node) || []

  return (
    <Box>
      <VStack spacing={4} align="stretch">
        {following.map((node, index) => (
          <HStack
            key={`${node.address}-${index}`}
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
              loading={currentLoading}
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

        {following.length === 0 && !currentLoading && (
          <Box textAlign="center" py={12}>
            <Icon as={LuUsers} boxSize={16} color="gray.300" mb={4} />
            <Text
              color="gray.500"
              _dark={{ color: "gray.400" }}
              fontSize="lg"
              mb={2}
            >
              {connection.noFollowing()}
            </Text>
            <Text color="gray.400" _dark={{ color: "gray.500" }} fontSize="sm">
              {connection.noFollowingDescription()}
            </Text>
          </Box>
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
  )
}

export default FollowingList
