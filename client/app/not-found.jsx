import { Box } from "@chakra-ui/react"
import { LuHouse } from "react-icons/lu"
import { EmptyStateComponent } from "../components/ui/EmptyState"

export default function NotFound() {
  return (
    <Box minH="60vh" display="flex" alignItems="center" justifyContent="center">
      <EmptyStateComponent
        title="页面未找到"
        description={"抱歉，您访问的页面不存在或已被移动。"}
        icon={
          <Box mb={4} color="gray.300">
            <LuHouse size={64} />
          </Box>
        }
      />
    </Box>
  )
}
