"use client"

import { createListCollection, Select, Text, VStack } from "@chakra-ui/react"
import { useTheme } from "../../contexts/ThemeContext"
import { useTranslation } from "../../hooks/useTranslation"

// 主题选项将在组件内部动态创建，以便使用翻译

export function ThemeSelector() {
  const { theme, setTheme } = useTheme()
  const { settings } = useTranslation()

  // 动态创建主题选项，使用翻译
  const themeCollection = createListCollection({
    items: [
      { label: settings.themeLight(), value: "light" },
      { label: settings.themeDark(), value: "dark" },
      { label: settings.themeSystem(), value: "system" },
    ],
  })

  return (
    <VStack align="stretch" gap={2}>
      <Text fontSize="sm" fontWeight="medium">
        {settings.themeSelect()}
      </Text>
      <Select.Root
        collection={themeCollection}
        value={[theme]}
        onValueChange={(details) => setTheme(details.value[0])}
      >
        <Select.HiddenSelect />
        <Select.Control>
          <Select.Trigger>
            <Select.ValueText placeholder={settings.themeSelect()} />
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
