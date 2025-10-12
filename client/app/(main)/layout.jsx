import { redirect } from "next/navigation"
import { ApolloProvider } from "../../components/client/apollo-provider"
import { Page } from "../../components/layout"
import { PwaRegistry } from "../../components/ui/PwaRegistry"
import { PreloadQuery } from "../../graphql/client"
import { PAGE_DATA } from "../../graphql/queries"

import "../../styles/globals.css"

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
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <PwaRegistry />
        <ApolloProvider url={profile.url}>
          <PreloadQuery query={PAGE_DATA}>
            <Page>{children}</Page>
          </PreloadQuery>
        </ApolloProvider>
      </body>
    </html>
  )
}
