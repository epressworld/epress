"use client"
import { EmptyState as ChakraEmptyState, VStack } from "@chakra-ui/react"

export const EmptyState = ({ title, description, icon, ...props }) => {
  return (
    <ChakraEmptyState.Root {...props}>
      <ChakraEmptyState.Content>
        <ChakraEmptyState.Indicator>{icon}</ChakraEmptyState.Indicator>
        <VStack textAlign="center">
          <ChakraEmptyState.Title>{title}</ChakraEmptyState.Title>
          <ChakraEmptyState.Description>
            {description}
          </ChakraEmptyState.Description>
        </VStack>
      </ChakraEmptyState.Content>
    </ChakraEmptyState.Root>
  )
}

// Backward compatibility
export const EmptyStateComponent = EmptyState
