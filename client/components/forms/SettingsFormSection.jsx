"use client"

import {
  Button,
  Field,
  HStack,
  Input,
  Link,
  Separator,
  Switch,
  Text,
  VStack,
} from "@chakra-ui/react"
import { LuSettings } from "react-icons/lu"
import { useIntl } from "../../hooks/useIntl"
import { useSettingsForm } from "../../hooks/useSettingsForm"
import { LanguageSelect, ThemeSelector } from "../ui"
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
        <Field.Root>
          <Field.Label>{t("settings")("walletConnectProjectId")}</Field.Label>
          <Input
            {...form.register("walletConnectProjectId")}
            placeholder={t("settings")("walletConnectProjectIdPlaceholder")}
          />
          <Field.HelperText>
            {t("settings")("walletConnectProjectIdHelper")}{" "}
            <Link target="_blank" href="https://reown.com">
              Reown.com
            </Link>
          </Field.HelperText>
        </Field.Root>
        <Field.Root>
          <Field.Label>{t("settings")("mailTransport")}</Field.Label>
          <Input
            {...form.register("mailTransport")}
            placeholder={t("settings")("mailTransportPlaceholder")}
          />
          <Field.HelperText>
            {t("settings")("mailTransportHelper")}
          </Field.HelperText>
        </Field.Root>
        <Field.Root>
          <Field.Label>{t("settings")("mailFrom")}</Field.Label>
          <Input
            {...form.register("mailFrom")}
            type="email"
            placeholder={t("settings")("mailFromPlaceholder")}
          />
          <Field.HelperText>{t("settings")("mailFromHelper")}</Field.HelperText>
        </Field.Root>
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
