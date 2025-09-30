import { Box } from "@chakra-ui/react"
import { FaExclamationTriangle } from "react-icons/fa"
import { EmptyStateComponent } from "../components/ui/EmptyState"

export const metadata = {
  title: "404 - Page Not Found",
  description: "Sorry, the page you are visiting does not exist.",
}

export default async function NotFound() {
  return (
    <Box minH="50vh" display="flex" alignItems="center" justifyContent="center">
      <EmptyStateComponent
        color="red"
        size="lg"
        title="404 - Page Not Found"
        description={"Sorry, the page you are visiting does not exist."}
        icon={<FaExclamationTriangle color="red" />}
      />
    </Box>
  )
}
