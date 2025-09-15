"use client"

import {
  Alert,
  Button,
  Heading,
  HStack,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react"
import { LuEye, LuHouse } from "react-icons/lu"
import { UnifiedCard } from "../../components/ui"
import { usePageTitle } from "../../hooks/usePageTitle"
import { useTranslation } from "../../hooks/useTranslation"
import { useVerifyPage } from "../../hooks/useVerifyPage"

export default function VerifyPage() {
  const { common, comment } = useTranslation()
  const {
    action,
    isProcessing,
    result,
    error,
    handleViewPublication,
    handleGoHome,
  } = useVerifyPage()

  // 设置页面标题
  const getPageTitle = () => {
    if (error) {
      return common.pageTitle.verificationFailed()
    } else if (isProcessing) {
      return common.pageTitle.verificationProcessing()
    } else if (result) {
      return common.pageTitle.verificationSuccess()
    } else {
      return common.pageTitle.verificationProcessing()
    }
  }

  usePageTitle(getPageTitle())

  // 错误状态
  if (error) {
    return (
      <UnifiedCard.Root w="100%">
        <UnifiedCard.Body>
          <VStack gap={6} textAlign="center">
            <Text fontSize="6xl" color="red.500">
              ✕
            </Text>
            <VStack gap={4}>
              <Heading size="lg" color="red.500">
                {common.verificationFailed()}
              </Heading>
              <Text color="gray.600">{error}</Text>
            </VStack>
            <Button
              colorPalette="orange"
              onClick={handleGoHome}
              leftIcon={<LuHouse />}
            >
              {common.goHome()}
            </Button>
          </VStack>
        </UnifiedCard.Body>
      </UnifiedCard.Root>
    )
  }

  // 处理中状态
  if (isProcessing) {
    const getTitle = () => {
      if (action === "confirm") return comment.verifyingComment()
      if (action === "destroy") return comment.deletingComment()
      return common.processing()
    }

    return (
      <UnifiedCard.Root w="100%">
        <UnifiedCard.Body>
          <VStack gap={6} textAlign="center">
            <Spinner size="xl" color="orange.500" />
            <VStack gap={4}>
              <Heading size="lg" color="gray.700">
                {getTitle()}
              </Heading>
              <Text color="gray.500">{common.pleaseWaitProcessing()}</Text>
            </VStack>
          </VStack>
        </UnifiedCard.Body>
      </UnifiedCard.Root>
    )
  }

  // 成功状态
  if (result) {
    const getTitle = () => {
      if (action === "confirm") return comment.commentVerificationSuccess()
      if (action === "destroy") return comment.commentDeletionSuccess()
      return common.operationSuccess()
    }

    const getMessage = () => {
      if (action === "confirm") return comment.commentVerifiedVisible()
      if (action === "destroy") return comment.commentDeletedSuccessfully()
      return common.operationCompleted()
    }

    return (
      <UnifiedCard.Root w="100%">
        <UnifiedCard.Body>
          <VStack gap={6} textAlign="center">
            <Text fontSize="6xl" color="green.500">
              ✓
            </Text>
            <VStack gap={4}>
              <Heading size="lg" color="green.500">
                {getTitle()}
              </Heading>
              <Text color="gray.600">{getMessage()}</Text>
              {result?.publication?.id && (
                <Alert.Root status="success" textAlign="left">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Title>
                      {action === "confirm"
                        ? common.commentLocation()
                        : common.publicationLocation()}
                    </Alert.Title>
                    <Alert.Description>
                      {action === "confirm"
                        ? common.commentLocationDescription()
                        : common.publicationLocationDescription()}
                    </Alert.Description>
                  </Alert.Content>
                </Alert.Root>
              )}
            </VStack>
            <HStack gap={4}>
              {result?.publication?.id && (
                <Button
                  colorPalette="orange"
                  onClick={() => handleViewPublication(result.publication.id)}
                  leftIcon={<LuEye />}
                >
                  {action === "confirm"
                    ? common.viewComment()
                    : common.viewPublication()}
                </Button>
              )}
              <Button
                colorPalette="gray"
                onClick={handleGoHome}
                leftIcon={<LuHouse />}
              >
                {common.goHome()}
              </Button>
            </HStack>
          </VStack>
        </UnifiedCard.Body>
      </UnifiedCard.Root>
    )
  }

  // 默认状态 - 等待处理
  return (
    <UnifiedCard.Root w="100%">
      <UnifiedCard.Body>
        <VStack gap={6} textAlign="center">
          <Spinner size="xl" color="orange.500" />
          <VStack gap={4}>
            <Heading size="lg" color="gray.700">
              {common.preparingVerification()}
            </Heading>
            <Text color="gray.500">{common.parsingVerificationLink()}</Text>
          </VStack>
        </VStack>
      </UnifiedCard.Body>
    </UnifiedCard.Root>
  )
}
