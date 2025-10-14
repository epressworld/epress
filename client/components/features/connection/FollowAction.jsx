"use client"

import { Button } from "@chakra-ui/react"
import { FaPlus } from "react-icons/fa"
import { useIntl } from "@/hooks/utils"

export function FollowAction({ onClick, disabled = false, ...props }) {
  const { t } = useIntl()

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
      {t("connection")("follow")}
    </Button>
  )
}
