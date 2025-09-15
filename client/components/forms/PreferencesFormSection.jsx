"use client"

import { VStack } from "@chakra-ui/react"
import { LanguageSelect, ThemeSelector } from "../ui"

export function PreferencesFormSection() {
  return (
    <VStack gap={6} align="stretch">
      <LanguageSelect />
      <ThemeSelector />
    </VStack>
  )
}
