"use client"

import { Button } from "@chakra-ui/react"
import { FaMinus } from "react-icons/fa"
import { useTranslation } from "../../hooks/useTranslation"

export function UnfollowAction({
  onClick,
  isLoading = false,
  disabled = false,
  ...props
}) {
  const { connection } = useTranslation()

  return (
    <Button
      onClick={onClick}
      loading={isLoading}
      loadingText={connection.unfollowing()}
      disabled={disabled}
      {...props}
    >
      <FaMinus />
      {connection.unfollow()}
    </Button>
  )
}
