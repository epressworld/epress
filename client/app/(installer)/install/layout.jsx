"use client"
import { ChakraProvider, defaultSystem } from "@chakra-ui/react"
import { WagmiProvider } from "../../../components/client/wagmi-provider"
export default function ({ children }) {
  return (
    <ChakraProvider value={defaultSystem}>
      <WagmiProvider
        walletConnectProjectId={"e051171ce1ac90c199f5405899925b60"}
      >
        <div className="install-container">{children}</div>
      </WagmiProvider>
    </ChakraProvider>
  )
}
