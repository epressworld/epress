"use client"

import { useTranslation } from "../../hooks/useTranslation"
import { FormField } from "../ui"

export function EthereumAuthForm({ form, errors }) {
  const { common } = useTranslation()

  return (
    <FormField
      label={common.displayName()}
      placeholder={common.displayNamePlaceholder()}
      error={errors.username?.message}
      required
      {...form.register("username", {
        required: common.displayNameRequired(),
      })}
    />
  )
}
