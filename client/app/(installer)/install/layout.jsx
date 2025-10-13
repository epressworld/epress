"use client"
import {
  ChakraProvider,
  Container,
  defaultSystem,
  Flex,
} from "@chakra-ui/react"
import { NextIntlClientProvider } from "next-intl"
import { useEffect, useState } from "react"
import { WagmiProvider } from "../../../components/client/wagmi-provider"
import { LanguageSwitcher } from "../../../components/installer/LanguageSwitcher"
import installerMessages from "../../../messages/installer.json"

export default function InstallerLayout({ children }) {
  const [locale, setLocale] = useState("en")

  // Get locale from localStorage on mount
  useEffect(() => {
    const savedLocale = localStorage.getItem("installer-locale")
    if (savedLocale && (savedLocale === "en" || savedLocale === "zh")) {
      setLocale(savedLocale)
    }
  }, [])

  // Handler for language change
  const handleLocaleChange = (newLocale) => {
    setLocale(newLocale)
    localStorage.setItem("installer-locale", newLocale)
  }

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={installerMessages[locale]}
    >
      <ChakraProvider value={defaultSystem}>
        <WagmiProvider
          walletConnectProjectId={"e051171ce1ac90c199f5405899925b60"}
        >
          <div className="install-container">
            {/* Language switcher in top-right corner */}
            <Container width="6xl">
              <Flex
                justify="flex-end"
                pos="fixed"
                top={4}
                right={4}
                zIndex={"sticky"}
              >
                <LanguageSwitcher onLocaleChange={handleLocaleChange} />
              </Flex>
            </Container>
            {children}
          </div>
        </WagmiProvider>
      </ChakraProvider>
    </NextIntlClientProvider>
  )
}
