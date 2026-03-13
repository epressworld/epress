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
import { FormField, LanguageSelect, Link, ThemeSelector } from "@/components/ui"
import { usePushNotification } from "@/contexts/PushNotificationContext"
import { useSettingsForm } from "@/hooks/form"
import { useIntl } from "@/hooks/utils"
import { TokenGenerator } from "./TokenGenerator"

export function SettingsFormSection({ onSuccess }) {
  const { t } = useIntl()
  const { form, isLoading, onSubmit } = useSettingsForm()

  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading: isEnabling,
    subscribe,
    unsubscribe,
    canSubscribe,
  } = usePushNotification()

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
          label={t("settings.walletConnectProjectId")}
          placeholder={t("settings.walletConnectProjectIdPlaceholder")}
          error={form.formState.errors.walletConnectProjectId?.message}
          helperText={
            <>
              {t("settings.walletConnectProjectIdHelper")}{" "}
              <Link target="_blank" href="https://reown.com">
                Reown.com
              </Link>
            </>
          }
          {...form.register("walletConnectProjectId")}
        />
        <FormField
          label={t("settings.pwaAppName")}
          placeholder={t("settings.pwaAppNamePlaceholder")}
          error={form.formState.errors.pwaAppName?.message}
          helperText={t("settings.pwaAppNameHelper")}
          {...form.register("pwaAppName")}
        />
      </VStack>
      <VStack gap={6} mt={3} align="stretch">
        <VStack align="stretch" gap={2}>
          <HStack justify="space-between">
            <VStack align="start" gap={1}>
              <Text fontSize="sm" fontWeight="medium">
                {t("settings.enableRSS")}
              </Text>
              <Text fontSize="xs" color="gray.500">
                {t("settings.enableRSSHelper")}
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

        <VStack align="stretch" gap={2}>
          <HStack justify="space-between">
            <VStack align="start" gap={1}>
              <Text fontSize="sm" fontWeight="medium">
                {t("settings.allowFollow")}
              </Text>
              <Text fontSize="xs" color="gray.500">
                {t("settings.allowFollowHelper")}
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

        <VStack align="stretch" gap={2}>
          <HStack justify="space-between">
            <VStack align="start" gap={1}>
              <Text fontSize="sm" fontWeight="medium">
                {t("settings.allowComment")}
              </Text>
              <Text fontSize="xs" color="gray.500">
                {t("settings.allowCommentHelper")}
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
          loadingText={t("settings.saving")}
          colorPalette="orange"
        >
          <LuSettings /> {t("settings.saveSettings")}
        </Button>
        <Separator />

        <VStack align="stretch" gap={2}>
          <HStack justify="space-between">
            <VStack align="start" gap={1}>
              <Text fontSize="sm" fontWeight="medium">
                {t("settings.enablePushNotification")}
              </Text>
              <Text fontSize="xs" color="gray.500">
                {permission === "denied"
                  ? t("settings.pushNotificationDenied")
                  : t("settings.enablePushNotificationHelper")}
              </Text>
            </VStack>
            <Switch.Root
              checked={isSubscribed}
              disabled={!isSupported || !canSubscribe || isEnabling}
              onCheckedChange={async (details) => {
                if (!details.checked) {
                  await unsubscribe()
                } else {
                  await subscribe()
                }
              }}
            >
              <Switch.HiddenInput />
              <Switch.Control />
            </Switch.Root>
          </HStack>
        </VStack>
        <Separator />
        <VStack align="stretch" gap={4}>
          <VStack align="start" gap={1}>
            <Text fontSize="sm" fontWeight="medium">
              {t("settings.generateToken")}
            </Text>
            <Text fontSize="xs" color="gray.500">
              {t("settings.generateTokenHelper")}
            </Text>
          </VStack>

          <TokenGenerator />
        </VStack>
      </VStack>
    </form>
  )
}
