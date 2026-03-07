"use client"

import { Button, HStack, Input, Text } from "@chakra-ui/react"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { SiEthereum } from "react-icons/si"

export const ConnectWalletButton = ({ fullWidth = false }) => {
  return (
    <ConnectButton.Custom>
      {({ account, openAccountModal, openConnectModal, mounted }) => {
        const connected = mounted && account

        if (!connected) {
          return (
            <Button
              size={fullWidth ? "md" : "xs"}
              width={fullWidth ? "100%" : undefined}
              variant={fullWidth ? "solid" : "subtle"}
              onClick={openConnectModal}
              type="button"
            >
              <HStack gap={2}>
                <SiEthereum />
                <Text>Connect Wallet</Text>
              </HStack>
            </Button>
          )
        }

        if (fullWidth) {
          return (
            <Input
              value={account.displayName}
              readOnly
              bg="bg.subtle"
              borderColor="border"
              fontSize="sm"
              cursor="pointer"
              onClick={openAccountModal}
            />
          )
        }

        return (
          <Button
            size="xs"
            variant="subtle"
            onClick={openAccountModal}
            type="button"
          >
            <HStack gap={{ base: 0, md: 1 }}>
              <SiEthereum />
              <Text display={{ base: "none", md: "inline" }}>
                {account.displayName}
              </Text>
            </HStack>
          </Button>
        )
      }}
    </ConnectButton.Custom>
  )
}
