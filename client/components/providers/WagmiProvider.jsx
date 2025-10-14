"use client"

import "@rainbow-me/rainbowkit/styles.css"
import {
  getDefaultConfig,
  lightTheme,
  RainbowKitProvider,
} from "@rainbow-me/rainbowkit"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createConfig, http, WagmiProvider as WagmiProviderBase } from "wagmi"
import { arbitrum, base, mainnet, optimism, polygon } from "wagmi/chains"
import { injected } from "wagmi/connectors"

/**
 * 全局 QueryClient 单例
 * 用于 React Query 的数据缓存和状态管理
 */
const globalQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5分钟
      gcTime: 1000 * 60 * 10, // 10分钟
    },
  },
})

/**
 * 默认的钱包连接器
 */
const defaultConnectors = [injected()]

/**
 * 默认的区块链网络传输配置
 */
const defaultTransports = {
  [mainnet.id]: http(),
  [polygon.id]: http(),
  [optimism.id]: http(),
  [arbitrum.id]: http(),
  [base.id]: http(),
}
let config = null
function getConfig(walletConnectProjectId) {
  if (config) return config
  if (!walletConnectProjectId) {
    // 没有 Project ID,使用基础配置
    config = createConfig({
      chains: [mainnet, polygon, optimism, arbitrum, base],
      connectors: defaultConnectors,
      transports: defaultTransports,
      ssr: true,
    })
  }

  // 有 Project ID,使用完整的 RainbowKit 配置
  config = getDefaultConfig({
    appName: "epress",
    projectId: walletConnectProjectId,
    chains: [mainnet, polygon, optimism, arbitrum, base],
    ssr: true,
  })
  return config
}

/**
 * WagmiProvider - Web3 钱包连接 Provider
 *
 * 提供 Web3 钱包连接功能,支持多种钱包和区块链网络
 * 集成了 RainbowKit UI 和 React Query
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - 子组件
 * @param {string} [props.walletConnectProjectId] - WalletConnect 项目 ID
 *
 * @example
 * <WagmiProvider walletConnectProjectId="your-project-id">
 *   <App />
 * </WagmiProvider>
 */
export function WagmiProvider({ children, walletConnectProjectId, ...props }) {
  const config = getConfig(walletConnectProjectId)

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
