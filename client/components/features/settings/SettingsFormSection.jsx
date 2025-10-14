"use client"

import {
  Button,
  HStack,
  Link,
  Separator,
  Switch,
  Text,
  VStack,
} from "@chakra-ui/react"
import { LuSettings } from "react-icons/lu"
import { FormField, LanguageSelect, ThemeSelector } from "@/components/ui"
import { useSettingsForm } from "@/hooks/form"
import { useIntl } from "@/hooks/utils"
import { TokenGenerator } from "./TokenGenerator"

export function SettingsFormSection({ onSuccess }) {
  const { t } = useIntl()
  const { form, isLoading, onSubmit } = useSettingsForm()

  const handleSubmit = async (data) => {
    const result = await onSubmit(data)
    if (result.success && onSuccess) {
      onSuccess()
    }
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)}>
      <VStack gap={3} align="stretch">
        <LanguageSelect
          value={form.watch("defaultLanguage")}
          onChange={(v) => form.setValue("defaultLanguage", v)}
        />
        <ThemeSelector
          value={form.watch("defaultTheme")}
          onChange={(v) => form.setValue("defaultTheme", v)}
        />
        <FormField
          label={t("settings")("walletConnectProjectId")}
          placeholder={t("settings")("walletConnectProjectIdPlaceholder")}
          error={form.formState.errors.walletConnectProjectId?.message}
          helperText={
            <>
              {t("settings")("walletConnectProjectIdHelper")}{" "}
              <Link target="_blank" href="https://reown.com">
                Reown.com
              </Link>
            </>
          }
          {...form.register("walletConnectProjectId")}
        />
        <FormField
          label={t("settings")("mailTransport")}
          placeholder={t("settings")("mailTransportPlaceholder")}
          error={form.formState.errors.mailTransport?.message}
          helperText={t("settings")("mailTransportHelper")}
          {...form.register("mailTransport")}
        />
        <FormField
          label={t("settings")("mailFrom")}
          placeholder={t("settings")("mailFromPlaceholder")}
          error={form.formState.errors.mailFrom?.message}
          helperText={t("settings")("mailFromHelper")}
          {...form.register("mailFrom")}
          type="email"
        />
      </VStack>
      <VStack gap={6} mt={3} align="stretch">
        {/* RSS 设置 */}
        <VStack align="stretch" gap={2}>
          <HStack justify="space-between">
            <VStack align="start" gap={1}>
              <Text fontSize="sm" fontWeight="medium">
                {t("settings")("enableRSS")}
              </Text>
              <Text fontSize="xs" color="gray.500">
                {t("settings")("enableRSSHelper")}
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
                {t("settings")("allowFollow")}
              </Text>
              <Text fontSize="xs" color="gray.500">
                {t("settings")("allowFollowHelper")}
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
                {t("settings")("allowComment")}
              </Text>
              <Text fontSize="xs" color="gray.500">
                {t("settings")("allowCommentHelper")}
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
          loadingText={t("settings")("saving")}
          colorPalette="orange"
        >
          <LuSettings /> {t("settings")("saveSettings")}
        </Button>

        <Separator />

        {/* Token 生成功能 */}
        <VStack align="stretch" gap={4}>
          <VStack align="start" gap={1}>
            <Text fontSize="sm" fontWeight="medium">
              {t("settings")("generateToken")}
            </Text>
            <Text fontSize="xs" color="gray.500">
              {t("settings")("generateTokenHelper")}
            </Text>
          </VStack>

          <TokenGenerator />
        </VStack>
      </VStack>
    </form>
  )
}
