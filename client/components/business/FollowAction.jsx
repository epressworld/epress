"use client"

import { Button } from "@chakra-ui/react"
import { FaPlus } from "react-icons/fa"
import { useTranslation } from "../../hooks/useTranslation"

export function FollowAction({ onClick, disabled = false, ...props }) {
  const { connection } = useTranslation()

  return (
    <Button
      size="xs"
      onClick={onClick}
      colorPalette="orange"
      disabled={disabled}
      className="btn-primary"
      {...props}
    >
      <FaPlus />
      {connection.follow()}
    </Button>
  )
}
