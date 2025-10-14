"use client"
import { Button, HStack, Text } from "@chakra-ui/react"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { SiEthereum } from "react-icons/si"

export const ConnectWalletButton = () => {
  return (
    <ConnectButton.Custom>
      {({
        account,
        openAccountModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== "loading"
        const connected = ready && account

        return (
          <div
            {...(!ready && {
              "aria-hidden": true,
              style: {
                opacity: 0,
                pointerEvents: "none",
                userSelect: "none",
              },
            })}
          >
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
