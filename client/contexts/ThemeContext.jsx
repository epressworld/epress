"use client"

import { createContext, useContext } from "react"
import { useColorMode } from "../components/ui/color-mode"

const ThemeContext = createContext()

export function ThemeProvider({ children, defaultTheme }) {
  const { colorMode, setColorMode, mounted } = useColorMode(defaultTheme)

  const value = {
    theme: colorMode,
    setTheme: setColorMode,
    isLoading: !mounted,
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
