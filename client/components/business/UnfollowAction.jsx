"use client"

import { Button } from "@chakra-ui/react"
import { FaMinus } from "react-icons/fa"
import { useIntl } from "../../hooks/useIntl"

export function UnfollowAction({
  onClick,
  isLoading = false,
  disabled = false,
  ...props
}) {
  const { t } = useIntl()

  return (
    <Button
      onClick={onClick}
      loading={isLoading}
      loadingText={t("connection")("unfollowing")}
      disabled={disabled}
      {...props}
    >
      <FaMinus />
      {t("connection")("unfollow")}
    </Button>
  )
}
