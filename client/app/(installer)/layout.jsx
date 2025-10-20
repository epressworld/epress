import "../../styles/globals.css"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

/**
 * Installation layout - completely independent from main app layout
 * No GraphQL, no WagmiProvider, no authentication required
 */
export default async function InstallLayout({ children }) {
  // 检查系统是否已安装
  const response = await fetch(`${process.env.EPRESS_API_URL}/api/install`, {
    cache: "no-store",
  })

  if (!response.ok) {
    console.error("Failed to check install status:", response.status)
    // 如果接口出错，仍然显示安装页面（容错处理）
    return (
      <html lang="en" suppressHydrationWarning>
        <body suppressHydrationWarning>{children}</body>
      </html>
    )
  }

  const { installed } = await response.json()

  // 如果已经安装，重定向到主页
  if (installed) {
    redirect("/")
  }

  // 未安装，显示安装页面
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
