"use client"

import { ClientOnly, IconButton, Skeleton, Span } from "@chakra-ui/react"
import { ThemeProvider, useTheme } from "next-themes"

import * as React from "react"
import { LuMoon, LuSun } from "react-icons/lu"

export function ColorModeProvider({ defaultTheme, ...props }) {
  return (
    <ThemeProvider
      attribute="class"
      disableTransitionOnChange
      suppressHydrationWarning
      enableSystem={defaultTheme === "system"}
      defaultTheme={defaultTheme === "system" ? "system" : defaultTheme}
      storageKey="epress-theme"
      {...props}
    />
  )
}

export function useColorMode(defaultTheme) {
  const { resolvedTheme, setTheme, forcedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)

    // 优先使用 localStorage，环境变量作为默认值
    const savedTheme = localStorage.getItem("epress-theme")
    if (
      savedTheme &&
      (savedTheme === "light" ||
        savedTheme === "dark" ||
        savedTheme === "system")
    ) {
      setTheme(savedTheme)
    } else {
      // 如果没有 localStorage 设置，使用环境变量
      const envTheme = defaultTheme
      if (
        envTheme &&
        (envTheme === "light" || envTheme === "dark" || envTheme === "system")
      ) {
        setTheme(envTheme)
        localStorage.setItem("epress-theme", envTheme)
      }
    }
  }, [])

  const colorMode = mounted ? forcedTheme || resolvedTheme || "light" : "light"

  const toggleColorMode = () => {
    const newTheme = resolvedTheme === "dark" ? "light" : "dark"
    setTheme(newTheme)
    localStorage.setItem("epress-theme", newTheme)
  }

  const setColorMode = (theme) => {
    setTheme(theme)
    localStorage.setItem("epress-theme", theme)
  }

  return {
    colorMode: colorMode,
    setColorMode: setColorMode,
    toggleColorMode,
    mounted,
  }
}

export function useColorModeValue(light, dark) {
  const { colorMode } = useColorMode()
  return colorMode === "dark" ? dark : light
}

export function ColorModeIcon() {
  const { colorMode } = useColorMode()
  return colorMode === "dark" ? <LuMoon /> : <LuSun />
}

export const ColorModeButton = React.forwardRef(
  function ColorModeButton(props, ref) {
    const { toggleColorMode } = useColorMode()
    return (
      <ClientOnly fallback={<Skeleton boxSize="8" />}>
        <IconButton
          onClick={toggleColorMode}
          variant="ghost"
          aria-label="Toggle color mode"
          size="sm"
          ref={ref}
          {...props}
          css={{
            _icon: {
              width: "5",
              height: "5",
            },
          }}
        >
          <ColorModeIcon />
        </IconButton>
      </ClientOnly>
    )
  },
)

export const LightMode = React.forwardRef(function LightMode(props, ref) {
  return (
    <Span
      color="fg"
      display="contents"
      className="chakra-theme light"
      colorPalette="light"
      ref={ref}
      {...props}
    />
  )
})

export const DarkMode = React.forwardRef(function DarkMode(props, ref) {
  return (
    <Span
      color="fg"
      display="contents"
      className="chakra-theme dark"
      colorPalette="dark"
      ref={ref}
      {...props}
    />
  )
})
