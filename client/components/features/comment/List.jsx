"use client"

import { useQuery, useSuspenseQuery } from "@apollo/client/react"
import { Alert, Button, HStack, Spinner, Text, VStack } from "@chakra-ui/react"
import { forwardRef, useEffect, useImperativeHandle, useState } from "react"
import { LuEllipsis } from "react-icons/lu"
import { useIntl } from "@/hooks/utils"
import { SEARCH_COMMENTS } from "@/lib/apollo"
import { toaster } from "../../ui/toaster"
import { CommentItem } from "./Item"

export const CommentList = forwardRef(
  (
    {
      publicationId,
      onCommentDeleted,
      localPendingComment,
      onRetrySignature,
      suspense = true,
    },
    ref,
  ) => {
    const [hasMore, setHasMore] = useState(false)
    const [hasAttemptedLoadMore, setHasAttemptedLoadMore] = useState(false)
    const { t } = useIntl()

    const useQueryHook = suspense ? useSuspenseQuery : useQuery
    // 获取评论列表 - 使用 Apollo Client
    const { data, loading, error, fetchMore, refetch } = useQueryHook(
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

    // Expose refetch method to parent via ref
    useImperativeHandle(
      ref,
      () => ({
        refetch,
      }),
      [refetch],
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
          description: t("common.loadMoreFailed"),
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
            <Alert.Title>{t("common.loadFailed")}</Alert.Title>
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
              author_name: localPendingComment.authorName,
              author_id: localPendingComment.authorId,
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
            {t("common.noMore")}
          </Text>
        )}

        {comments.length === 0 && !loading && !localPendingComment && (
          <Text textAlign="center" color="gray.500" py={8}>
            {t("common.noComments")}
          </Text>
        )}
      </VStack>
    )
  },
)
