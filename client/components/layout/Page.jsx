"use client"
import { Container } from "@chakra-ui/react"
import { Suspense } from "react"
import { AuthProvider } from "../../contexts/AuthContext"
import { LanguageProvider } from "../../contexts/LanguageContext"
import { PageProvider } from "../../contexts/PageContext"
import { ThemeProvider } from "../../contexts/ThemeContext"
import { ApolloProvider } from "../client"
import { WagmiProvider } from "../client/wagmi-provider"
import { Provider } from "../ui/provider"
import { Footer } from "./Footer"
import { Header } from "./Header"

export function Page({ children, runtimeConfig, serverDataMap, serverErrors }) {
  return (
    <WagmiProvider
      walletConnectProjectId={runtimeConfig.walletConnectProjectId}
    >
      <ApolloProvider serverDataMap={serverDataMap}>
        <PageProvider
          runtimeConfig={runtimeConfig}
          serverDataMap={serverDataMap}
          serverErrors={serverErrors}
        >
          <Provider>
            <AuthProvider>
              <ThemeProvider>
                <LanguageProvider
                  defaultLanguage={runtimeConfig.defaultLanguage}
                >
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
        </PageProvider>
      </ApolloProvider>
    </WagmiProvider>
  )
}
