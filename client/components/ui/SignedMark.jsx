"use client"

import { Box, Text } from "@chakra-ui/react"

export const SignedMark = ({ isSigned = false, isOwner = false, onClick }) => {
  const handleClick = () => {
    if (isSigned || (isOwner && !isSigned)) {
      onClick?.()
    }
  }

  return (
    <Box
      position="absolute"
      top="-3px"
      right="2px"
      bg={isSigned ? "green" : "gray.200"}
      _dark={{ bg: isSigned ? "green" : "gray.600" }}
      color="white"
      px={4}
      py={0.5}
      transform="rotate(45deg) translate(30%, -40%)"
      transformOrigin="center"
      boxShadow="sm"
      minW="80px"
      textAlign="center"
      zIndex={10}
      cursor={isSigned || (isOwner && !isSigned) ? "pointer" : "default"}
      transition="background-color 0.2s"
      onClick={handleClick}
      _hover={
        isSigned || (isOwner && !isSigned)
          ? {
              bg: isSigned ? "green.600" : "gray.300",
              _dark: { bg: isSigned ? "green.600" : "gray.500" },
            }
          : {}
      }
    >
      <Text fontSize="xs" fontWeight="bold" letterSpacing="0.5px">
        SIGNED
      </Text>
    </Box>
  )
}
