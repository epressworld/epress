"use client"

import { useTranslation } from "../../hooks/useTranslation"
import { FormField } from "../ui"

export function EmailAuthForm({ form, errors }) {
  const { common } = useTranslation()

  return (
    <>
      <FormField
        label={common.displayName()}
        placeholder={common.displayNamePlaceholder()}
        error={errors.username?.message}
        required
        {...form.register("username", {
          required: common.displayNameRequired(),
        })}
      />

      <FormField
        label={common.emailAddress()}
        type="email"
        placeholder={common.emailAddressPlaceholder()}
        error={errors.email?.message}
        required
        {...form.register("email", {
          required: common.emailAddressRequired(),
          pattern: {
            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            message: common.emailFormatIncorrect(),
          },
        })}
      />
    </>
  )
}
