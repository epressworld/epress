"use client"

import {
  Button,
  CloseButton,
  Dialog,
  Field,
  Group,
  IconButton,
  Input,
  VStack,
} from "@chakra-ui/react"
import { useCopyToClipboard } from "@uidotdev/usehooks"
import { useState } from "react"
import { FiCheck, FiCopy } from "react-icons/fi"
import { useTranslation } from "../../hooks/useTranslation"

// 签名数据结构定义
export const createSignatureData = (publication) => {
  // 确保 timestamp 是 ISO 格式字符串
  let timestamp = ""

  if (publication?.created_at) {
    const date = new Date(publication.created_at)
    timestamp = date.toISOString()
  }

  return {
    address: publication?.author?.address || "",
    content_hash: publication?.content?.content_hash || "",
    signature: publication?.signature || "",
    timestamp: timestamp,
  }
}

const CopyButton = ({ field, value, copiedFields, handleCopy }) => (
  <IconButton
    variant="outline"
    bg="bg.subtle"
    onClick={() => handleCopy(field, value)}
    aria-label="复制"
  >
    {copiedFields[field] ? <FiCheck /> : <FiCopy />}
  </IconButton>
)

export const SignatureDialog = ({ isOpen, onClose, signatureData }) => {
  const [_copied, copyToClipboard] = useCopyToClipboard()
  const [copiedFields, setCopiedFields] = useState({})
  const { signature: sig, common } = useTranslation()

  const handleCopy = async (field, value) => {
    try {
      await copyToClipboard(value)
      setCopiedFields((prev) => ({ ...prev, [field]: true }))
      setTimeout(() => {
        setCopiedFields((prev) => ({ ...prev, [field]: false }))
      }, 2000)
    } catch (err) {
      console.error("Failed to copy: ", err)
    }
  }

  if (!signatureData) return null

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(e) => e.open === false && onClose()}
      size="lg"
      closeOnEscape={true}
      initialFocusEl={() => null}
    >
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>{sig.signatureInfo()}</Dialog.Title>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
          </Dialog.Header>

          <Dialog.Body>
            <VStack gap={4} align="stretch">
              <Field.Root>
                <Field.Label>{sig.signerAddress()}</Field.Label>
                <Group attached w="full">
                  <Input
                    value={signatureData?.address || ""}
                    readOnly
                    variant="outline"
                    flex="1"
                  />
                  <CopyButton
                    field="address"
                    value={signatureData?.address || ""}
                    copiedFields={copiedFields}
                    handleCopy={handleCopy}
                  />
                </Group>
              </Field.Root>
              <Field.Root>
                <Field.Label>{sig.signatureTimestamp()}</Field.Label>
                <Group attached w="full">
                  <Input
                    value={signatureData?.timestamp || ""}
                    readOnly
                    variant="outline"
                    flex="1"
                  />
                  <CopyButton
                    field="timestamp"
                    value={signatureData?.timestamp || ""}
                    copiedFields={copiedFields}
                    handleCopy={handleCopy}
                  />
                </Group>
              </Field.Root>
              <Field.Root>
                <Field.Label>{sig.signatureHash()}</Field.Label>
                <Group attached w="full">
                  <Input
                    value={signatureData?.content_hash || ""}
                    readOnly
                    variant="outline"
                    flex="1"
                  />
                  <CopyButton
                    field="hash"
                    value={signatureData?.content_hash || ""}
                    copiedFields={copiedFields}
                    handleCopy={handleCopy}
                  />
                </Group>
              </Field.Root>
              <Field.Root>
                <Field.Label>{sig.signatureData()}</Field.Label>
                <Group attached w="full">
                  <Input
                    value={signatureData?.signature || ""}
                    readOnly
                    variant="outline"
                    flex="1"
                  />
                  <CopyButton
                    field="signature"
                    value={signatureData?.signature || ""}
                    copiedFields={copiedFields}
                    handleCopy={handleCopy}
                  />
                </Group>
              </Field.Root>
            </VStack>
          </Dialog.Body>

          <Dialog.Footer>
            <Button onClick={onClose} colorPalette="gray">
              {common.close()}
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}
