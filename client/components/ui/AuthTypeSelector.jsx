"use client"

import { Tabs } from "@chakra-ui/react"
import { useIntl } from "../../hooks/useIntl"

export function AuthTypeSelector({
  authType,
  onAuthTypeChange,
  isConnected,
  disabled = false,
}) {
  const { t } = useIntl()

  return (
    <Tabs.Root
      value={authType}
      onValueChange={onAuthTypeChange}
      size="sm"
      variant="subtle"
      disabled={disabled}
    >
      <Tabs.List>
        <Tabs.Trigger value="EMAIL" disabled={isConnected}>
          {t("common")("emailAuth")}
        </Tabs.Trigger>
        <Tabs.Trigger value="ETHEREUM">
          {t("common")("ethereumAuth")}
        </Tabs.Trigger>
      </Tabs.List>
    </Tabs.Root>
  )
}
