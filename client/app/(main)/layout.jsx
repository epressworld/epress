import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { Page } from "@/components/layout"
import { ApolloProvider } from "@/components/providers"
import { PwaRegistry } from "@/components/ui/PwaRegistry"
import { PAGE_DATA } from "@/lib/apollo"
import { PreloadQuery, query } from "@/lib/apollo/client"
import { isTokenExpired } from "@/utils/helpers/jwt"

import "@/styles/globals.css"

export const dynamic = "force-dynamic"

// Metadata API configuration
export const metadata = {
  applicationName: "epress",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "epress",
  },
  description: "A decentralized publishing platform",
  formatDetection: {
    telephone: false,
  },
  icons: {
    apple: "/icons/icon-192x192.png",
    icon: [
      { url: "/icons/icon-72x72.png", sizes: "72x72", type: "image/png" },
      { url: "/icons/icon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/icons/icon-128x128.png", sizes: "128x128", type: "image/png" },
      { url: "/icons/icon-144x144.png", sizes: "144x144", type: "image/png" },
      { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-256x256.png", sizes: "256x256", type: "image/png" },
      { url: "/icons/icon-384x384.png", sizes: "384x384", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/icons/icon-192x192.png",
    maskIcon: { url: "/icons/icon.svg", color: "#000000" },
  },
  manifest: "/manifest.json",
  msapplication: {
    config: "/icons/browserconfig.xml",
    TileColor: "#000000",
    tapHighlight: "no",
  },
}

// Viewport configuration
export const viewport = {
  themeColor: "#000000",
}

export default async function RootLayout({ children }) {
  const response = await fetch(`${process.env.EPRESS_API_URL}/ewp/profile`)
  // 检查响应是否成功
  if (!response.ok) {
    if (response.status === 422) {
      redirect("/install")
    } else {
      throw new Error(`HTTP error! Status: ${response.status}`)
    }
  }

  // 解析 JSON 数据
  const profile = await response.json()

  // 直接查询 PAGE_DATA（会被缓存）
  let locale = "en"
  let messages = null

  try {
    const { data } = await query({ query: PAGE_DATA })
    const defaultLanguage = data?.settings?.defaultLanguage

    if (
      defaultLanguage &&
      (defaultLanguage === "en" || defaultLanguage === "zh")
    ) {
      locale = defaultLanguage
    }

    messages = (await import(`../../messages/${locale}.json`)).default
  } catch (error) {
    console.error("Failed to load settings or messages:", error)
    messages = (await import(`../../messages/en.json`)).default
    locale = "en"
  }

  // 在服务端检查认证状态
  let initialAuthState = null
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get("authToken")?.value

    if (authToken && !isTokenExpired(authToken)) {
      // Token存在且未过期
      initialAuthState = {
        authenticated: true,
        token: authToken,
      }
    } else {
      // Token不存在或已过期
      initialAuthState = {
        authenticated: false,
        token: null,
      }
    }
  } catch (error) {
    console.error("Failed to check auth state:", error)
    initialAuthState = {
      authenticated: false,
      token: null,
    }
  }

  return (
    <html lang={locale} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <PwaRegistry />
        <ApolloProvider url={profile.url}>
          <PreloadQuery query={PAGE_DATA}>
            <Page
              intl={{ locale, messages }}
              initialAuthState={initialAuthState}
            >
              {children}
            </Page>
          </PreloadQuery>
        </ApolloProvider>
      </body>
    </html>
  )
}
