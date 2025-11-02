"use client"
import { useSuspenseQuery } from "@apollo/client/react"
import { Container } from "@chakra-ui/react"
import { NextIntlClientProvider } from "next-intl"
import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { AuthProvider } from "@/contexts/AuthContext"
import { OnlineVisitorsProvider } from "@/contexts/OnlineVisitorsContext"
import { PageContext } from "@/contexts/PageContext"
import { PushNotificationProvider } from "@/contexts/PushNotificationContext"
import { PAGE_DATA } from "@/lib/apollo/queries"
import { ChakraProvider, WagmiProvider } from "../providers"
import { Footer } from "./Footer"
import { Header } from "./Header"

export function Page({ children, intl, initialAuthState }) {
  // 客户端 Apollo 查询 - 复用相同的查询
  const { data, loading, error, refetch } = useSuspenseQuery(PAGE_DATA, {
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: false,
    onError: (error) => {
      console.error("PageContext GraphQL Error:", error)
    },
  })
  const [isClient, setIsClient] = useState(false)

  // 确保只在客户端执行
  useEffect(() => {
    setIsClient(true)
  }, [])

  // 创建 refetchPageData 函数
  const refetchPageData = useCallback(async () => {
    if (isClient) {
      const result = await refetch()
      return result
    }
  }, [refetch, isClient])

  // 使用 useMemo 稳定 value 对象
  const value = useMemo(
    () => ({
      // 来自旧 NodeContext 的数据
      settings: data?.settings || {},
      profile: data?.profile || {},
      nodeStatus: data?.nodeStatus || {},

      // 状态信息
      loading: isClient ? loading : false,
      error,

      // 重新获取数据函数
      refetchPageData,
    }),
    [isClient, loading, error, data, refetchPageData],
  )

  return (
    <PageContext.Provider value={value}>
      <NextIntlClientProvider
        locale={intl.locale}
        messages={intl.messages}
        timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone}
      >
        <WagmiProvider
          walletConnectProjectId={value.settings.walletConnectProjectId}
        >
          <ChakraProvider defaultTheme={value.settings.defaultTheme}>
            <AuthProvider initialAuthState={initialAuthState}>
              <PushNotificationProvider>
                <OnlineVisitorsProvider>
                  <div className="layout-container page-container">
                    <main
                      className="content-area"
                      style={{
                        minHeight: "100vh",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <Header />
                      <Container maxW="6xl" py={6} flex={1}>
                        <Suspense fallback={null}>{children}</Suspense>
                      </Container>
                      <Footer />
                    </main>
                  </div>
                </OnlineVisitorsProvider>
              </PushNotificationProvider>
            </AuthProvider>
          </ChakraProvider>
        </WagmiProvider>
      </NextIntlClientProvider>
    </PageContext.Provider>
  )
}
