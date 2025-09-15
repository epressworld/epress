"use client"

import { Field, Input, Textarea } from "@chakra-ui/react"

export function FormField({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  error,
  helperText,
  required = false,
  disabled = false,
  rows = 3,
  multiline = false,
  ...props
}) {
  const InputComponent = multiline ? Textarea : Input

  return (
    <Field.Root invalid={!!error}>
      {label && (
        <Field.Label>
          {label} {required && "*"}
        </Field.Label>
      )}

      <InputComponent
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        rows={multiline ? rows : undefined}
        {...props}
      />

      {helperText && <Field.HelperText>{helperText}</Field.HelperText>}

      {error && <Field.ErrorText>{error}</Field.ErrorText>}
    </Field.Root>
  )
}
