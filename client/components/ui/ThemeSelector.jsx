"use client"

import { createListCollection, Select, Text, VStack } from "@chakra-ui/react"
import { useIntl } from "../../hooks/useIntl"

// 主题选项将在组件内部动态创建，以便使用翻译

export function ThemeSelector({ value, onChange }) {
  const { t } = useIntl()

  // 动态创建主题选项，使用翻译
  const themeCollection = createListCollection({
    items: [
      { label: t("settings")("themeLight"), value: "light" },
      { label: t("settings")("themeDark"), value: "dark" },
    ],
  })

  return (
    <VStack align="stretch" gap={2}>
      <Text fontSize="sm" fontWeight="medium">
        {t("settings")("themeSelect")}
      </Text>
      <Select.Root
        collection={themeCollection}
        value={[value]}
        onValueChange={(details) => onChange(details.value[0])}
      >
        <Select.HiddenSelect />
        <Select.Control>
          <Select.Trigger>
            <Select.ValueText placeholder={t("settings")("themeSelect")} />
          </Select.Trigger>
          <Select.IndicatorGroup>
            <Select.Indicator />
          </Select.IndicatorGroup>
        </Select.Control>
        <Select.Positioner>
          <Select.Content>
            {themeCollection.items.map((item) => (
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
