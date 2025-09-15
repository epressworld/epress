"use client"

import { Tabs } from "@chakra-ui/react"
import { useTranslation } from "../../hooks/useTranslation"

export function AuthTypeSelector({
  authType,
  onAuthTypeChange,
  isConnected,
  disabled = false,
}) {
  const { common } = useTranslation()

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
          {common.emailAuth()}
        </Tabs.Trigger>
        <Tabs.Trigger value="ETHEREUM">{common.ethereumAuth()}</Tabs.Trigger>
      </Tabs.List>
    </Tabs.Root>
  )
}
