"use client"

import { useQuery } from "@apollo/client/react"
import { Alert, Button, HStack, Spinner, Text, VStack } from "@chakra-ui/react"
import { useEffect, useState } from "react"
import { LuEllipsis } from "react-icons/lu"
import { SEARCH_COMMENTS } from "../../../graphql/queries"
import { useTranslation } from "../../../hooks/useTranslation"
import { toaster } from "../../ui/toaster"
import { CommentItem } from "./Item"

const CommentList = ({
  publicationId,
  onCommentDeleted,
  localPendingComment,
  onRetrySignature,
  onSetRefetch,
}) => {
  const [hasMore, setHasMore] = useState(true)
  const [hasAttemptedLoadMore, setHasAttemptedLoadMore] = useState(false)
  const { common } = useTranslation()

  // 获取评论列表 - 使用 Apollo Client
  const { data, loading, error, fetchMore, refetch } = useQuery(
    SEARCH_COMMENTS,
    {
      variables: {
        filterBy: { publication_id: publicationId },
        orderBy: "-created_at",
        first: 10,
      },
      notifyOnNetworkStatusChange: true,
      fetchPolicy: "cache-and-network", // 确保数据一致性
    },
  )

  // 更新 hasMore 状态
  useEffect(() => {
    if (data?.search?.pageInfo) {
      setHasMore(data.search.pageInfo.hasNextPage)
    }
  }, [data])

  // 将 refetch 暴露给父组件，便于外部触发刷新
  useEffect(() => {
    if (onSetRefetch && refetch) {
      // 通过函数式更新避免 React 将函数视为 updater 并调用它
      onSetRefetch(() => refetch)
    }
  }, [onSetRefetch, refetch])

  // 处理评论删除后的回调
  const handleCommentDeleted = () => {
    // 重新获取评论列表以更新缓存
    refetch()
    // 通知父组件刷新 publication 数据
    if (onCommentDeleted) {
      onCommentDeleted()
    }
  }

  // Load more comments - using Apollo Client's fetchMore
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
          // 保持与初次查询一致的排序
          orderBy: "-created_at",
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
      console.error("Failed to load more comments:", error)
      toaster.create({
        description: common.loadMoreFailed(),
        type: "error",
      })
    }
  }

  if (loading && !data) {
    return (
      <VStack colorPalette="orange">
        <Spinner color="colorPalette.600" />
        <Text color="colorPalette.600">Loading...</Text>
      </VStack>
    )
  }

  if (error) {
    return (
      <Alert.Root status="error" py={8}>
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>{common.loadFailed()}</Alert.Title>
          <Alert.Description>{error.message}</Alert.Description>
        </Alert.Content>
      </Alert.Root>
    )
  }

  const comments = data?.search?.edges?.map((edge) => edge.node) || []

  return (
    <VStack gap={4} align="stretch">
      {/* 本地待确认评论置顶显示 */}
      {localPendingComment && (
        <CommentItem
          key={`local-pending-${localPendingComment.id}`}
          comment={{
            id: localPendingComment.id,
            body: localPendingComment.body,
            status: "PENDING",
            auth_type: "ETHEREUM",
            commenter_username: localPendingComment.commenterUsername,
            commenter_address: localPendingComment.commenterAddress,
            created_at: localPendingComment.createdAt,
          }}
          onCommentDeleted={handleCommentDeleted}
          isLocalPending={true}
          onRetrySignature={onRetrySignature}
        />
      )}

      {comments.map((comment, index) => (
        <CommentItem
          key={`${comment.id}-${index}`}
          comment={comment}
          onCommentDeleted={handleCommentDeleted}
        />
      ))}

      {hasMore && (
        <HStack justify="center" py={1}>
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

      {!hasMore && comments.length > 0 && hasAttemptedLoadMore && (
        <Text textAlign="center" color="gray.500" py={4}>
          {common.noMore()}
        </Text>
      )}

      {comments.length === 0 && !loading && !localPendingComment && (
        <Text textAlign="center" color="gray.500" py={8}>
          {common.noComments()}
        </Text>
      )}
    </VStack>
  )
}

export default CommentList
