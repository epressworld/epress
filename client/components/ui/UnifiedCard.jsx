"use client"

import { Card } from "@chakra-ui/react"

// 统一的Card组件，管理所有Card的padding
export const UnifiedCard = {
  Root: ({ children, ...props }) => (
    <Card.Root className="epress-card" {...props}>
      {children}
    </Card.Root>
  ),

  Header: ({ children, ...props }) => (
    <Card.Header p={4} {...props}>
      {children}
    </Card.Header>
  ),

  Body: ({ children, ...props }) => (
    <Card.Body p={4} {...props}>
      {children}
    </Card.Body>
  ),

  Footer: ({ children, ...props }) => (
    <Card.Footer p={4} {...props}>
      {children}
    </Card.Footer>
  ),
}
