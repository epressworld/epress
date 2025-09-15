"use client"

import { Button, HStack, Input, Text, VStack } from "@chakra-ui/react"
import { useTranslation } from "../../hooks/useTranslation"

export function NodeUrlInput({
  url,
  setUrl,
  onFollow,
  onCancel,
  isLoading = false,
  disabled = false,
}) {
  const { connection, common } = useTranslation()

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && url.trim() && !isLoading) {
      onFollow()
    }
  }

  return (
    <VStack gap={3} align="stretch">
      <Text fontSize="sm" color="gray.600">
        {connection.enterYourNodeUrl()}
      </Text>
      <Input
        placeholder={connection.yourNodeUrlPlaceholder()}
        size="sm"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
      />
      <HStack gap={2}>
        <Button
          flex={1}
          colorPalette="orange"
          onClick={onFollow}
          loading={isLoading}
          loadingText={connection.following()}
          disabled={!url.trim() || disabled}
        >
          {connection.confirmFollow()}
        </Button>
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isLoading || disabled}
        >
          {common.cancel()}
        </Button>
      </HStack>
    </VStack>
  )
}
