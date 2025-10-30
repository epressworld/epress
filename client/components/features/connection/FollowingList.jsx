"use client"
import { useMutation, useSuspenseQuery } from "@apollo/client/react"
import { Box, Button, Icon, Spinner, Text, VStack } from "@chakra-ui/react"
import { forwardRef, useImperativeHandle, useState, useTransition } from "react"
import { FaMinus } from "react-icons/fa"
import { LuUserRoundCheck } from "react-icons/lu"
import {
  ConfirmDialog,
  EmptyState,
  LoadMoreButton,
  toaster,
} from "@/components/ui"
import { useAuth } from "@/contexts/AuthContext"
import { useWallet } from "@/hooks/data"
import { useIntl } from "@/hooks/utils"
import { DESTROY_CONNECTION, SEARCH_NODES } from "@/lib/apollo"
import { deleteConnectionTypedData } from "@/utils/helpers"
import { ConnectionItem } from "./Item"
import { ConnectionList } from "./List"

export const FollowingList = forwardRef((_props, ref) => {
  const [hasAttemptedLoadMore, setHasAttemptedLoadMore] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [selectedNode, setSelectedNode] = useState(null)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { isNodeOwner } = useAuth()
  const { address, signEIP712Data } = useWallet()
  const { t } = useIntl()

  const { data, error, fetchMore, refetch } = useSuspenseQuery(SEARCH_NODES, {
    variables: {
      filterBy: { type: "following" },
      orderBy: "-created_at",
      first: 20,
    },
    notifyOnNetworkStatusChange: true,
    fetchPolicy: "cache-and-network",
    nextFetchPolicy: "cache-and-network",
  })

  // Expose refetch method to parent via ref
  useImperativeHandle(
    ref,
    () => ({
      refetch,
    }),
    [refetch],
  )

  const [destroyConnection, { loading: isDestroying }] =
    useMutation(DESTROY_CONNECTION)

  const hasMore = data?.search?.pageInfo?.hasNextPage
  const following = data?.search?.edges?.map((edge) => edge.node) || []
  const total = data?.search?.total

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
            description: t("common.loadMoreFailed"),
            type: "error",
          })
        })
        .finally(() => {
          setLoading(false)
        })
    })
  }

  const handleUnfollow = async (node) => {
    if (!isNodeOwner || !address) {
      toaster.create({
        description: t("connection.onlyNodeOwnerCanUnfollow"),
        type: "error",
      })
      return
    }

    setSelectedNode(node)
    setIsOpen(true)
  }

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
          description: t("connection.signatureFailed"),
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
        description: t("connection.unfollowSuccess"),
        type: "success",
      })

      setIsOpen(false)
      setSelectedNode(null)
    } catch (error) {
      console.error("取消关注失败:", error)
      toaster.create({
        description: error.message || t("connection.unfollowFailed"),
        type: "error",
      })
    }
  }

  // 加载状态
  if (loading && !data) {
    return (
      <ConnectionList title={t("connection.following")} total={total}>
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
      <ConnectionList title={t("connection.following")} total={total}>
        <Box p={4}>
          <Text color="red.500">
            {t("common.loadFailed")}: {error.message}
          </Text>
        </Box>
      </ConnectionList>
    )
  }

  // 空状态
  if (following.length === 0 && !loading) {
    return (
      <ConnectionList title={t("connection.following")} total={0}>
        <EmptyState
          title={t("connection.noFollowing")}
          description={t("connection.noFollowingDescription")}
          icon={<Icon as={LuUserRoundCheck} />}
        />
      </ConnectionList>
    )
  }

  return (
    <ConnectionList title={t("connection.following")} total={total}>
      <VStack gap={4} py={4} align="stretch">
        {following.map((node) => (
          <ConnectionItem
            key={`following-${node.address}`}
            node={node}
            actions={
              isNodeOwner && (
                <Button
                  size="xs"
                  variant="plain"
                  height="auto"
                  onClick={() => handleUnfollow(node)}
                  loading={isDestroying}
                >
                  <Icon as={FaMinus} />
                  {t("connection.unfollow")}
                </Button>
              )
            }
          />
        ))}

        <LoadMoreButton
          hasMore={hasMore}
          loading={loading}
          onLoadMore={loadMore}
          hasAttemptedLoadMore={hasAttemptedLoadMore}
        />
      </VStack>

      <ConfirmDialog
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false)
          setSelectedNode(null)
        }}
        onConfirm={handleConfirmUnfollow}
        title={t("connection.confirmUnfollow")}
        description={t("connection.confirmUnfollowMessage", {
          title: selectedNode?.title || "",
        })}
        confirmText={t("connection.unfollow")}
        cancelText={t("common.cancel")}
        isLoading={isDestroying}
        colorPalette="red"
      />
    </ConnectionList>
  )
})
