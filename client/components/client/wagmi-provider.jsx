"use client"
import "@rainbow-me/rainbowkit/styles.css"
import {
  getDefaultConfig,
  lightTheme,
  RainbowKitProvider,
} from "@rainbow-me/rainbowkit"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useMemo } from "react"
import { createConfig, http, WagmiProvider as WagmiProviderBase } from "wagmi"
import { arbitrum, base, mainnet, optimism, polygon } from "wagmi/chains"
import { injected } from "wagmi/connectors"

// 全局单例实例
const globalQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5分钟
      gcTime: 1000 * 60 * 10, // 10分钟
    },
  },
})

const defaultConnectors = [injected()]
const defaultTransports = {
  [mainnet.id]: http(),
  [polygon.id]: http(),
  [optimism.id]: http(),
  [arbitrum.id]: http(),
  [base.id]: http(),
}

export const WagmiProvider = ({
  children,
  walletConnectProjectId,
  ...props
}) => {
  const config = useMemo(() => {
    if (!walletConnectProjectId) {
      return createConfig({
        chains: [mainnet, polygon, optimism, arbitrum, base],
        connectors: defaultConnectors,
        transports: defaultTransports,
        ssr: true,
      })
    } else {
      return getDefaultConfig({
        appName: "epress",
        projectId: walletConnectProjectId,
        chains: [mainnet, polygon, optimism, arbitrum, base],
        ssr: true, // If your dApp uses server side rendering (SSR)
      })
    }
  }, [walletConnectProjectId])

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
