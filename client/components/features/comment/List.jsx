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
  ({ publicationId, onCommentDeleted, suspense = true }, ref) => {
    const [hasMore, setHasMore] = useState(false)
    const [hasAttemptedLoadMore, setHasAttemptedLoadMore] = useState(false)
    const { t } = useIntl()

    const useQueryHook = suspense ? useSuspenseQuery : useQuery
    const { data, loading, error, fetchMore, refetch } = useQueryHook(
      SEARCH_COMMENTS,
      {
        variables: {
          filterBy: { publication_id: publicationId },
          orderBy: "-created_at",
          first: 10,
        },
        notifyOnNetworkStatusChange: true,
        fetchPolicy: "cache-and-network",
      },
    )

    useImperativeHandle(
      ref,
      () => ({
        refetch,
      }),
      [refetch],
    )

    useEffect(() => {
      if (data?.search?.pageInfo) {
        setHasMore(data.search.pageInfo.hasNextPage)
      }
    }, [data])

    const handleCommentDeleted = () => {
      refetch()
      if (onCommentDeleted) {
        onCommentDeleted()
      }
    }

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

        {comments.length === 0 && !loading && (
          <Text textAlign="center" color="gray.500" py={8}>
            {t("common.noComments")}
          </Text>
        )}
      </VStack>
    )
  },
)
