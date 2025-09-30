"use client"
import { EmptyState, VStack } from "@chakra-ui/react"

export const EmptyStateComponent = ({ title, description, icon, ...props }) => {
  return (
    <EmptyState.Root {...props}>
      <EmptyState.Content>
        <EmptyState.Indicator>{icon}</EmptyState.Indicator>
        <VStack textAlign="center">
          <EmptyState.Title>{title}</EmptyState.Title>
          <EmptyState.Description>{description}</EmptyState.Description>
        </VStack>
      </EmptyState.Content>
    </EmptyState.Root>
  )
}
