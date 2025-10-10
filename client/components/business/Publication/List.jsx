"use client"

import { useMutation, useSuspenseQuery } from "@apollo/client/react"
import { Alert, Button, HStack, Text, VStack } from "@chakra-ui/react"
import { useRouter } from "next/navigation"
import { useEffect, useState, useTransition } from "react"
import { LuEllipsis } from "react-icons/lu"
import { AUTH_STATUS, useAuth } from "../../../contexts/AuthContext"
import {
  DESTROY_PUBLICATION,
  SIGN_PUBLICATION,
} from "../../../graphql/mutations"
import { SEARCH_PUBLICATIONS } from "../../../graphql/queries"
import { useTranslation } from "../../../hooks/useTranslation"
import { useWallet } from "../../../hooks/useWallet"
import { statementOfSourceTypedData } from "../../../utils/eip712"
import { ConfirmDialog, SearchResultAlert, Skeletons } from "../../ui"
import { toaster } from "../../ui/toaster"
import { PublicationItem } from "./Item"

const PublicationList = ({
  onEdit,
  onSetRefetch,
  onPublicationCreated,
  onPublish,
  variables,
  keyword,
}) => {
  const router = useRouter()
  const { authStatus, isNodeOwner } = useAuth()
  const { signEIP712Data } = useWallet()
  const { publication: pub, common } = useTranslation()
  const [hasAttemptedLoadMore, setHasAttemptedLoadMore] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState(false)

  // 对话框状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedPublication, setSelectedPublication] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // 签名和删除Publication的mutations
  const [signPublication] = useMutation(SIGN_PUBLICATION)
  const [destroyPublication] = useMutation(DESTROY_PUBLICATION)

  // 获取Publications列表 - 使用 Apollo Client
  const { data, error, fetchMore, refetch } = useSuspenseQuery(
    SEARCH_PUBLICATIONS,
    {
      variables,
      notifyOnNetworkStatusChange: true,
      // 始终进行网络校验，确保登录状态变化后列表及时刷新
      fetchPolicy: "cache-and-network",
      nextFetchPolicy: "cache-and-network",
    },
  )

  const hasMore = data?.search?.pageInfo?.hasNextPage

  // 设置 refetch 方法给父组件
  useEffect(() => {
    if (onSetRefetch && refetch) {
      onSetRefetch(refetch)
    }
  }, [onSetRefetch, refetch])

  // 加载更多 - 使用 Apollo Client 的 fetchMore
  const loadMore = async (event) => {
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }

    if (!hasMore || isLoading || isPending) return

    setIsLoading(true)
    startTransition(() => {
      setHasAttemptedLoadMore(true)
      fetchMore({
        variables: {
          after: data?.search?.pageInfo?.endCursor,
        },
      })
        .catch((error) => {
          console.error("加载更多失败:", error)
          toaster.create({
            description: common.pleaseRetry(),
            type: "error",
          })
        })
        .finally(() => {
          setIsLoading(false)
        })
    })
  }

  // 签名Publication
  const handleSignPublication = async (publication) => {
    if (authStatus !== AUTH_STATUS.AUTHENTICATED || !isNodeOwner) {
      toaster.create({
        description: common.pleaseLoginAndConfirmOwner(),
        type: "error",
      })
      return
    }

    try {
      // 使用实际的内容哈希，而不是重新计算
      const typedData = statementOfSourceTypedData(
        publication.content.content_hash,
        publication.author.address,
        Math.floor(new Date(publication.created_at).getTime() / 1000), // 使用 publication 的创建时间
      )
      const signature = await signEIP712Data(typedData)

      if (!signature) {
        toaster.create({
          description: common.signFailed(),
          type: "error",
        })
        return
      }

      const { data: result } = await signPublication({
        variables: {
          id: publication.id,
          signature: signature,
        },
        refetchQueries: [{ query: SEARCH_PUBLICATIONS, variables }],
        awaitRefetchQueries: true,
      })

      if (result?.signPublication) {
        toaster.create({
          description: common.signSuccess(),
          type: "success",
        })
      }
    } catch (error) {
      console.error("签名失败:", error)
      toaster.create({
        description: `${common.signFailed()}, ${common.pleaseRetry()}`,
        type: "error",
      })
    }
  }

  // 删除Publication
  const handleDeleteClick = (publication) => {
    setSelectedPublication(publication)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!selectedPublication) return

    setIsDeleting(true)
    try {
      const { data: result } = await destroyPublication({
        variables: {
          id: selectedPublication.id,
        },
        update: (cache, { data }) => {
          if (data?.destroyPublication) {
            // 从缓存中移除被删除的 publication
            cache.modify({
              fields: {
                search(existingSearch, { readField }) {
                  if (!existingSearch) return existingSearch

                  return {
                    ...existingSearch,
                    edges: existingSearch.edges.filter((edge) => {
                      const node = readField("node", edge)
                      return readField("id", node) !== selectedPublication.id
                    }),
                    total: existingSearch.total - 1,
                  }
                },
              },
            })
          }
        },
      })

      if (result?.destroyPublication) {
        toaster.create({
          description: common.deleteSuccess(),
          type: "success",
        })
        setDeleteDialogOpen(false)
        setSelectedPublication(null)
        // Apollo Client 会自动更新缓存
      }
    } catch (error) {
      console.error("删除失败:", error)
      toaster.create({
        description: `${common.deleteFailed()}, ${common.pleaseRetry()}`,
        type: "error",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading && !data) {
    return <Skeletons.Publications total={2} />
  }

  if (error) {
    return (
      <Alert.Root status="error" py={8}>
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>{pub.loadFailed()}</Alert.Title>
          <Alert.Description>{error.message}</Alert.Description>
        </Alert.Content>
      </Alert.Root>
    )
  }

  const publications = data?.search?.edges?.map((edge) => edge.node) || []

  // 清除搜索
  const handleClearSearch = () => {
    router.push("/publications")
  }

  return (
    <>
      <VStack spacing={6} align="stretch">
        {/* 搜索结果提示 */}
        {keyword && (
          <SearchResultAlert
            keyword={keyword}
            count={data?.search?.total}
            onClear={handleClearSearch}
          />
        )}
        {publications.map((publication) => (
          <PublicationItem
            key={publication.id}
            publication={publication}
            isNodeOwner={isNodeOwner}
            isAuthenticated={authStatus === AUTH_STATUS.AUTHENTICATED}
            onSign={handleSignPublication}
            onDelete={handleDeleteClick}
            onEdit={onEdit}
            onPublicationCreated={onPublicationCreated}
            onPublish={onPublish}
            keyword={keyword}
          />
        ))}

        {hasMore && (
          <HStack justify="center" py={4}>
            <Button
              onClick={loadMore}
              loading={isLoading}
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

        {!hasMore && publications.length > 0 && hasAttemptedLoadMore && (
          <Text
            textAlign="center"
            color="gray.500"
            _dark={{ color: "gray.400" }}
            py={4}
          >
            {common.noMore()}
          </Text>
        )}

        {publications.length === 0 && !isLoading && (
          <Text
            textAlign="center"
            color="gray.500"
            _dark={{ color: "gray.400" }}
            py={8}
          >
            {pub.noContent()}
          </Text>
        )}
      </VStack>

      {/* 删除确认对话框 */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title={common.confirmDelete()}
        message={common.confirmDeleteContent()}
        confirmText={common.confirmDeleteText()}
        cancelText={common.cancel()}
        isLoading={isDeleting}
        confirmColorPalette="red"
      />
    </>
  )
}

export default PublicationList
