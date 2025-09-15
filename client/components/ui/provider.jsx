"use client"

import { ChakraProvider, defaultSystem } from "@chakra-ui/react"
import { usePage } from "../../contexts/PageContext"
import { ColorModeProvider } from "./color-mode"

export function Provider(props) {
  const { runtimeConfig } = usePage()
  const defaultTheme = runtimeConfig.defaultTheme || "light"
  return (
    <ChakraProvider value={defaultSystem}>
      <ColorModeProvider
        defaultTheme={defaultTheme}
        enableSystem={false}
        disableTransitionOnChange={false}
        storageKey="epress-theme"
        {...props}
      />
    </ChakraProvider>
  )
}
