"use client"
import { Button, HStack, Text } from "@chakra-ui/react"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { SiEthereum } from "react-icons/si"

export const ConnectWalletButton = () => {
  return (
    <ConnectButton.Custom>
      {({ account, openAccountModal, openConnectModal, mounted }) => {
        // 只要mounted就显示,不等待authenticationStatus
        const connected = mounted && account

        return (
          <div>
            {!connected ? (
              <Button size="xs" onClick={openConnectModal} variant="subtle">
                <HStack gap={{ base: 0, md: 1 }}>
                  <SiEthereum />
                  <Text display={{ base: "none", md: "inline" }}>
                    Connect Wallet
                  </Text>
                </HStack>
              </Button>
            ) : (
              <Button size="xs" onClick={openAccountModal} variant="subtle">
                <HStack gap={{ base: 0, md: 1 }}>
                  <SiEthereum />
                  <Text display={{ base: "none", md: "inline" }}>
                    {account.displayName}
                  </Text>
                </HStack>
              </Button>
            )}
          </div>
        )
      }}
    </ConnectButton.Custom>
  )
}
