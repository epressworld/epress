"use client"

import { createListCollection, Select } from "@chakra-ui/react"
import { useLocale } from "next-intl"

/**
 * Language switcher for the installer
 * Allows users to switch between languages during installation
 */
export function LanguageSwitcher({ onLocaleChange }) {
  const locale = useLocale()

  const languageCollection = createListCollection({
    items: [
      { label: "English", value: "en" },
      { label: "中文", value: "zh" },
    ],
  })

  const handleLanguageChange = (details) => {
    const newLocale = details.value[0]
    if (onLocaleChange) {
      onLocaleChange(newLocale)
    }
  }

  return (
    <Select.Root
      collection={languageCollection}
      value={[locale]}
      onValueChange={handleLanguageChange}
      size="sm"
      width="150px"
    >
      <Select.HiddenSelect />
      <Select.Control>
        <Select.Trigger>
          <Select.ValueText />
        </Select.Trigger>
        <Select.IndicatorGroup>
          <Select.Indicator />
        </Select.IndicatorGroup>
      </Select.Control>
      <Select.Positioner>
        <Select.Content>
          {languageCollection.items.map((item) => (
            <Select.Item item={item} key={item.value}>
              {item.label}
              <Select.ItemIndicator />
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Positioner>
    </Select.Root>
  )
}
