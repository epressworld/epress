"use client"

import { useIntl } from "../../hooks/useIntl"
import { FormField } from "../ui"

export function EmailAuthForm({ form, errors }) {
  const { t } = useIntl()

  return (
    <>
      <FormField
        label={t("common")("displayName")}
        placeholder={t("common")("displayNamePlaceholder")}
        error={errors.username?.message}
        required
        {...form.register("username", {
          required: t("common")("displayNameRequired"),
        })}
      />

      <FormField
        label={t("common")("emailAddress")}
        type="email"
        placeholder={t("common")("emailAddressPlaceholder")}
        error={errors.email?.message}
        required
        {...form.register("email", {
          required: t("common")("emailAddressRequired"),
          pattern: {
            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            message: t("common")("emailFormatIncorrect"),
          },
        })}
      />
    </>
  )
}
