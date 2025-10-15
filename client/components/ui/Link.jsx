import { Link as ChakraLink } from "@chakra-ui/react"
import NextLink from "next/link"

export function Link({
  href,
  replace,
  scroll,
  prefetch,
  onNavigate,
  children,
  ...props
}) {
  return (
    <ChakraLink asChild {...props}>
      <NextLink
        href={href}
        replace={replace}
        scroll={scroll}
        prefetch={prefetch}
        onNavigate={onNavigate}
      >
        {children}
      </NextLink>
    </ChakraLink>
  )
}
