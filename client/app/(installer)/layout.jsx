import "../../styles/globals.css"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"
/**
 * Installation layout - completely independent from main app layout
 * No GraphQL, no WagmiProvider, no authentication required
 */
export default async function InstallLayout({ children }) {
  const response = await fetch(`${process.env.EPRESS_API_URL}/ewp/profile`)
  if (response.status !== 422) redirect("/")
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
