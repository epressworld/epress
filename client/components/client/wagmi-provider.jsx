"use client"
import "@rainbow-me/rainbowkit/styles.css"
import {
  getDefaultConfig,
  lightTheme,
  RainbowKitProvider,
} from "@rainbow-me/rainbowkit"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useMemo } from "react"
import { WagmiProvider as WagmiProviderBase } from "wagmi"
import { arbitrum, base, mainnet, optimism, polygon } from "wagmi/chains"

// 全局单例实例
const globalQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5分钟
      gcTime: 1000 * 60 * 10, // 10分钟
    },
  },
})

export const WagmiProvider = ({
  children,
  walletConnectProjectId,
  ...props
}) => {
  // 使用 useMemo 确保 wagmi config 只在 projectId 变化时重新创建
  const config = useMemo(() => {
    if (!walletConnectProjectId) {
      // 如果没有 project ID，则无法初始化 wagmi，可以返回 null 或者一个 fallback
      // 这里我们选择不渲染 Provider，因为 wagmi 缺少 projectId 会抛出错误
      return null
    }
    return getDefaultConfig({
      appName: "epress",
      projectId: walletConnectProjectId,
      chains: [mainnet, polygon, optimism, arbitrum, base],
      ssr: true, // If your dApp uses server side rendering (SSR)
    })
  }, [walletConnectProjectId])

  // 如果 config 未准备好，则不渲染 wagmi 相关 providers
  if (!config) {
    return <>{children}</>
  }

  return (
    <WagmiProviderBase config={config} {...props}>
      <QueryClientProvider client={globalQueryClient}>
        <RainbowKitProvider
          modalSize="compact"
          theme={lightTheme({ ...lightTheme.accentColors.orange })}
          initialChain={mainnet}
          showRecentTransactions={false}
          appInfo={{
            appName: "epress",
            disclaimer: null,
          }}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProviderBase>
  )
}
