"use client"

import { useAccount, useWalletClient } from "wagmi"
import { signTypedData } from "../utils/eip712"

// 重构后的 useWallet Hook 只关心钱包本身的功能
export function useWallet() {
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()

  // 签名EIP-712数据
  const signEIP712Data = async (typedData) => {
    if (!isConnected || !address || !walletClient) {
      throw new Error("钱包未连接，无法签名。")
    }

    try {
      const signature = await signTypedData(walletClient, address, typedData)
      return signature
    } catch (error) {
      console.error("EIP-712签名失败:", error)
      throw error
    }
  }

  return {
    address,
    isConnected,
    walletClient,
    signEIP712Data,
  }
}
