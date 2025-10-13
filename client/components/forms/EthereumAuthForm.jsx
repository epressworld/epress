"use client"

import { useIntl } from "../../hooks/useIntl"
import { FormField } from "../ui"

export function EthereumAuthForm({ form, errors }) {
  const { t } = useIntl()

  return (
    <FormField
      label={t("common")("displayName")}
      placeholder={t("common")("displayNamePlaceholder")}
      error={errors.username?.message}
      required
      {...form.register("username", {
        required: t("common")("displayNameRequired"),
      })}
    />
  )
}
