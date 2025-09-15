"use client"

import { useQuery } from "@apollo/client/react"
import { Alert, Spinner, Text, VStack } from "@chakra-ui/react"
import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { UnifiedCard } from "../../components/ui"
import { FETCH } from "../../graphql/queries"
import { usePageTitle } from "../../hooks/usePageTitle"
import { useTranslation } from "../../hooks/useTranslation"

export default function RedirectPage() {
  const searchParams = useSearchParams()
  const { common } = useTranslation()
  const [isRedirecting, setIsRedirecting] = useState(false)

  // 设置页面标题
  usePageTitle(common.redirectingToDetailPage())

  const contentHash = searchParams.get("content_hash")

  // 调用GraphQL查询获取publication信息
  const { data, loading, error } = useQuery(FETCH, {
    variables: {
      type: "PUBLICATION",
      id: contentHash,
    },
    skip: !contentHash, // 如果没有content_hash则跳过查询
    fetchPolicy: "network-only", // 每次都从网络获取最新数据
  })

  // 处理重定向
  useEffect(() => {
    if (data?.fetch && !isRedirecting) {
      setIsRedirecting(true)
      const publication = data.fetch
      const redirectUrl = `/publications/${publication.id}`

      // 重定向到正确的详情页
      window.location.href = redirectUrl
    }
  }, [data, isRedirecting])

  // 参数验证
  if (!contentHash) {
    return (
      <UnifiedCard.Root w="100%">
        <UnifiedCard.Body>
          <Alert.Root status="error">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>{common.error()}</Alert.Title>
              <Alert.Description>
                {common.missingRequiredParameter()}
              </Alert.Description>
            </Alert.Content>
          </Alert.Root>
        </UnifiedCard.Body>
      </UnifiedCard.Root>
    )
  }

  // 加载状态
  if (loading) {
    return (
      <UnifiedCard.Root w="100%">
        <UnifiedCard.Body>
          <VStack gap={4} align="center">
            <Spinner size="lg" />
            <Text>{common.loading()}</Text>
          </VStack>
        </UnifiedCard.Body>
      </UnifiedCard.Root>
    )
  }

  // 错误状态
  if (error) {
    return (
      <UnifiedCard.Root w="100%">
        <UnifiedCard.Body>
          <Alert.Root status="error">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>{common.loadFailed()}</Alert.Title>
              <Alert.Description>
                {error.message || common.cannotFindContent()}
              </Alert.Description>
            </Alert.Content>
          </Alert.Root>
        </UnifiedCard.Body>
      </UnifiedCard.Root>
    )
  }

  // 未找到内容
  if (data && !data.fetch) {
    return (
      <UnifiedCard.Root w="100%">
        <UnifiedCard.Body>
          <Alert.Root status="warning">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>{common.contentNotExists()}</Alert.Title>
              <Alert.Description>
                {common.contentNotFoundDescription()}
              </Alert.Description>
            </Alert.Content>
          </Alert.Root>
        </UnifiedCard.Body>
      </UnifiedCard.Root>
    )
  }

  // 重定向中
  if (isRedirecting) {
    return (
      <UnifiedCard.Root w="100%">
        <UnifiedCard.Body>
          <VStack gap={4} align="center">
            <Spinner size="lg" />
            <Text>{common.redirectingToDetailPage()}</Text>
          </VStack>
        </UnifiedCard.Body>
      </UnifiedCard.Root>
    )
  }

  // 默认状态
  return (
    <UnifiedCard.Root w="100%">
      <UnifiedCard.Body>
        <VStack gap={4} align="center">
          <Spinner size="lg" />
          <Text>{common.processing()}</Text>
        </VStack>
      </UnifiedCard.Body>
    </UnifiedCard.Root>
  )
}
