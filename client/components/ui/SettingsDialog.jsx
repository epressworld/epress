"use client"

import { CloseButton, Dialog, Portal, Tabs } from "@chakra-ui/react"
import { useState } from "react"
import { LuPalette, LuSettings, LuUser } from "react-icons/lu"
import { useTranslation } from "../../hooks/useTranslation"
import { ProfileFormSection, SettingsFormSection } from "../forms"
import { PreferencesFormSection } from "../forms/PreferencesFormSection"

export function SettingsDialog({ isOpen, onClose }) {
  const { settings } = useTranslation()
  const [activeTab, setActiveTab] = useState("profile")

  const handleSuccess = () => {
    // onClose()
  }

  const handleTabChange = (details) => {
    setActiveTab(details.value)
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose} closeOnEscape={true}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="2xl">
            <Dialog.Header>
              <Dialog.Title>{settings.nodeSettings()}</Dialog.Title>
            </Dialog.Header>

            <Dialog.Body>
              <Tabs.Root value={activeTab} onValueChange={handleTabChange}>
                <Tabs.List>
                  <Tabs.Trigger value="profile">
                    <LuUser />
                    {settings.nodeBasicInfo()}
                  </Tabs.Trigger>
                  <Tabs.Trigger value="preferences">
                    <LuPalette />
                    {settings.preferences()}
                  </Tabs.Trigger>
                  <Tabs.Trigger value="settings">
                    <LuSettings />
                    {settings.systemSettings()}
                  </Tabs.Trigger>
                </Tabs.List>

                <Tabs.Content value="profile" pt={4}>
                  <ProfileFormSection onSuccess={handleSuccess} />
                </Tabs.Content>

                <Tabs.Content value="preferences" pt={4}>
                  <PreferencesFormSection />
                </Tabs.Content>

                <Tabs.Content value="settings" pt={4}>
                  <SettingsFormSection onSuccess={handleSuccess} />
                </Tabs.Content>
              </Tabs.Root>
            </Dialog.Body>

            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
