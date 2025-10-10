"use client"

import {
  Button,
  HStack,
  Separator,
  Switch,
  Text,
  VStack,
} from "@chakra-ui/react"
import { LuSettings } from "react-icons/lu"
import { useSettingsForm } from "../../hooks/useSettingsForm"
import { useTranslation } from "../../hooks/useTranslation"
import { TokenGenerator } from "./TokenGenerator"

export function SettingsFormSection({ onSuccess }) {
  const { settings } = useTranslation()
  const { form, isLoading, onSubmit } = useSettingsForm()

  const handleSubmit = async (data) => {
    const result = await onSubmit(data)
    if (result.success && onSuccess) {
      onSuccess()
    }
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)}>
      <VStack gap={6} align="stretch">
        {/* RSS 设置 */}
        <VStack align="stretch" gap={2}>
          <HStack justify="space-between">
            <VStack align="start" gap={1}>
              <Text fontSize="sm" fontWeight="medium">
                {settings.enableRSS()}
              </Text>
              <Text fontSize="xs" color="gray.500">
                {settings.enableRSSHelper()}
              </Text>
            </VStack>
            <Switch.Root
              checked={form.watch("enableRSS") === "on"}
              onCheckedChange={(details) => {
                form.setValue("enableRSS", details.checked ? "on" : undefined)
              }}
              disabled={isLoading}
            >
              <Switch.HiddenInput />
              <Switch.Control />
            </Switch.Root>
          </HStack>
        </VStack>

        {/* 关注设置 */}
        <VStack align="stretch" gap={2}>
          <HStack justify="space-between">
            <VStack align="start" gap={1}>
              <Text fontSize="sm" fontWeight="medium">
                {settings.allowFollow()}
              </Text>
              <Text fontSize="xs" color="gray.500">
                {settings.allowFollowHelper()}
              </Text>
            </VStack>
            <Switch.Root
              checked={form.watch("allowFollow") === "on"}
              onCheckedChange={(details) => {
                form.setValue("allowFollow", details.checked ? "on" : undefined)
              }}
              disabled={isLoading}
            >
              <Switch.HiddenInput />
              <Switch.Control />
            </Switch.Root>
          </HStack>
        </VStack>

        {/* 评论设置 */}
        <VStack align="stretch" gap={2}>
          <HStack justify="space-between">
            <VStack align="start" gap={1}>
              <Text fontSize="sm" fontWeight="medium">
                {settings.allowComment()}
              </Text>
              <Text fontSize="xs" color="gray.500">
                {settings.allowCommentHelper()}
              </Text>
            </VStack>
            <Switch.Root
              checked={form.watch("allowComment") === "on"}
              onCheckedChange={(details) => {
                form.setValue(
                  "allowComment",
                  details.checked ? "on" : undefined,
                )
              }}
              disabled={isLoading}
            >
              <Switch.HiddenInput />
              <Switch.Control />
            </Switch.Root>
          </HStack>
        </VStack>

        <Button
          type="submit"
          loading={isLoading}
          loadingText={settings.saving()}
          colorPalette="orange"
        >
          <LuSettings /> {settings.saveSettings()}
        </Button>

        <Separator />

        {/* Token 生成功能 */}
        <VStack align="stretch" gap={4}>
          <VStack align="start" gap={1}>
            <Text fontSize="sm" fontWeight="medium">
              {settings.generateToken()}
            </Text>
            <Text fontSize="xs" color="gray.500">
              {settings.generateTokenHelper()}
            </Text>
          </VStack>

          <TokenGenerator />
        </VStack>
      </VStack>
    </form>
  )
}
