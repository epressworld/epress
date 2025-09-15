"use client"

import { useQuery } from "@apollo/client/react"
import { Alert, Button, HStack, Text, VStack } from "@chakra-ui/react"
import { useEffect, useState } from "react"
import { LuEllipsis } from "react-icons/lu"
import { SEARCH_COMMENTS } from "../../../graphql/queries"
import { useTranslation } from "../../../hooks/useTranslation"
import { LoadingSkeleton } from "../../ui"
import { toaster } from "../../ui/toaster"
import { CommentItem } from "./Item"

const CommentList = ({ publicationId, onCommentDeleted }) => {
  const [hasMore, setHasMore] = useState(true)
  const { common } = useTranslation()

  // 获取评论列表 - 使用 Apollo Client
  const { data, loading, error, fetchMore, refetch } = useQuery(
    SEARCH_COMMENTS,
    {
      variables: {
        filterBy: { publication_id: publicationId },
        orderBy: "created_at",
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
      console.error("Failed to load more comments:", error)
      toaster.create({
        description: common.loadMoreFailed(),
        type: "error",
      })
    }
  }

  if (loading && !data) {
    return <LoadingSkeleton count={2} />
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
      {comments.map((comment, index) => (
        <CommentItem
          key={`${comment.id}-${index}`}
          comment={comment}
          onCommentDeleted={handleCommentDeleted}
        />
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

      {!hasMore && comments.length > 0 && (
        <Text textAlign="center" color="gray.500" py={4}>
          {common.noMore()}
        </Text>
      )}

      {comments.length === 0 && !loading && (
        <Text textAlign="center" color="gray.500" py={8}>
          {common.noComments()}
        </Text>
      )}
    </VStack>
  )
}

export default CommentList
