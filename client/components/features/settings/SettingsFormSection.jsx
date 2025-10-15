"use client"

import {
  Button,
  HStack,
  Input,
  Link,
  Separator,
  Spinner,
  Switch,
  Text,
  VStack,
} from "@chakra-ui/react"
import { FaCheckCircle } from "react-icons/fa"
import { LuAlertCircle, LuSettings } from "react-icons/lu"
import { FormField, LanguageSelect, ThemeSelector } from "@/components/ui"
import { Field } from "@/components/ui/field"
import { useSettingsForm } from "@/hooks/form"
import { useIntl } from "@/hooks/utils"
import { TokenGenerator } from "./TokenGenerator"

export function SettingsFormSection({ onSuccess }) {
  const { t } = useIntl()
  const {
    form,
    isLoading,
    onSubmit,
    validateMailTransport,
    mailTransportValidating,
    mailTransportValid,
  } = useSettingsForm()

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

        <Separator my={2} />

        {/* Mail Server Settings Group */}
        <VStack align="stretch" gap={3}>
          <Text fontWeight="semibold" fontSize="md">
            {t("settings")("mailServerSettings")}
          </Text>

          <Field.Root invalid={!!form.formState.errors.mailTransport}>
            <Field.Label>{t("settings")("mailTransport")}</Field.Label>
            <HStack align="start">
              <Input
                {...form.register("mailTransport", {
                  validate: validateMailTransport,
                  onChange: (e) => {
                    const mailFrom = form.watch("mailFrom")
                    if (mailFrom && !e.target.value) {
                      form.setError("mailTransport", {
                        type: "manual",
                        message: t("settings")("mailTransportRequired"),
                      })
                    } else {
                      form.clearErrors("mailTransport")
                    }
                  },
                })}
                placeholder={t("settings")("mailTransportPlaceholder")}
              />
              {mailTransportValidating && (
                <Spinner size="sm" color="orange.500" mt={2} />
              )}
              {!mailTransportValidating && mailTransportValid === true && (
                <FaCheckCircle
                  color="green"
                  size={20}
                  style={{ marginTop: "8px" }}
                />
              )}
              {!mailTransportValidating && mailTransportValid === false && (
                <LuAlertCircle
                  color="red"
                  size={20}
                  style={{ marginTop: "8px" }}
                />
              )}
            </HStack>
            <Field.HelperText>
              {t("settings")("mailTransportHelper")}
            </Field.HelperText>
            <Field.ErrorText>
              {form.formState.errors.mailTransport?.message}
            </Field.ErrorText>
          </Field.Root>

          <Field.Root invalid={!!form.formState.errors.mailFrom}>
            <Field.Label>{t("settings")("mailFrom")}</Field.Label>
            <Input
              {...form.register("mailFrom", {
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: t("settings")("invalidEmailFormat"),
                },
                onChange: (e) => {
                  const mailTransport = form.watch("mailTransport")
                  if (mailTransport && !e.target.value) {
                    form.setError("mailFrom", {
                      type: "manual",
                      message: t("settings")("mailFromRequired"),
                    })
                  } else {
                    form.clearErrors("mailFrom")
                  }
                },
              })}
              placeholder={t("settings")("mailFromPlaceholder")}
              type="email"
            />
            <Field.HelperText>
              {t("settings")("mailFromHelper")}
            </Field.HelperText>
            <Field.ErrorText>
              {form.formState.errors.mailFrom?.message}
            </Field.ErrorText>
          </Field.Root>
        </VStack>
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
