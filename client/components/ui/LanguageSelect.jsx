"use client"

import { createListCollection, Select, Text, VStack } from "@chakra-ui/react"
import { useTranslation } from "../../hooks/useTranslation"

export function LanguageSelect({ value, onChange }) {
  const { settings } = useTranslation()

  // 动态创建语言选项，使用翻译
  const languageCollection = createListCollection({
    items: [
      { label: settings.languageEnglish(), value: "en" },
      { label: settings.languageChinese(), value: "zh" },
    ],
  })

  return (
    <VStack align="stretch" gap={2}>
      <Text fontSize="sm" fontWeight="medium">
        {settings.languageSelect()}
      </Text>
      <Select.Root
        collection={languageCollection}
        value={[value]}
        onValueChange={(details) => onChange(details.value[0])}
      >
        <Select.HiddenSelect />
        <Select.Control>
          <Select.Trigger>
            <Select.ValueText placeholder={settings.languageSelect()} />
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
    </VStack>
  )
}
