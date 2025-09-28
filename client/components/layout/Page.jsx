"use client"
import { Container } from "@chakra-ui/react"
import { Suspense } from "react"
import { AuthProvider } from "../../contexts/AuthContext"
import { LanguageProvider } from "../../contexts/LanguageContext"
import { PageProvider } from "../../contexts/PageContext"
import { ThemeProvider } from "../../contexts/ThemeContext"
import { WagmiProvider } from "../client/wagmi-provider"
import { Provider } from "../ui/provider"
import { Footer } from "./Footer"
import { Header } from "./Header"

export function Page({ children, runtimeConfig }) {
  return (
    <PageProvider runtimeConfig={runtimeConfig}>
      <WagmiProvider
        walletConnectProjectId={runtimeConfig.walletConnectProjectId}
      >
        <Provider>
          <AuthProvider>
            <ThemeProvider defaultTheme={runtimeConfig.defaultTheme}>
              <LanguageProvider defaultLanguage={runtimeConfig.defaultLanguage}>
                <div className="layout-container page-container">
                  <Header />
                  <main className="content-area">
                    <Container maxW="6xl" py={6}>
                      <Suspense fallback={null}>{children}</Suspense>
                    </Container>
                  </main>
                  <Footer />
                </div>
              </LanguageProvider>
            </ThemeProvider>
          </AuthProvider>
        </Provider>
      </WagmiProvider>
    </PageProvider>
  )
}
