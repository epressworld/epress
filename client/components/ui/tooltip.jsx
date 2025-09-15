import { Tooltip as ChakraTooltip, Portal } from "@chakra-ui/react"

export const Tooltip = ({ children, content, ...props }) => {
  return (
    <ChakraTooltip.Root {...props}>
      <ChakraTooltip.Trigger asChild>{children}</ChakraTooltip.Trigger>
      <Portal>
        <ChakraTooltip.Positioner>
          <ChakraTooltip.Content>{content}</ChakraTooltip.Content>
        </ChakraTooltip.Positioner>
      </Portal>
    </ChakraTooltip.Root>
  )
}
