"use client"

import {
  Box,
  Button,
  CloseButton,
  Dialog,
  Field,
  Group,
  IconButton,
  Input,
  Textarea,
  VStack,
} from "@chakra-ui/react"
import { useCopyToClipboard } from "@uidotdev/usehooks"
import { useState } from "react"
import { FiCheck, FiCopy } from "react-icons/fi"
import { useIntl } from "../../hooks/useIntl"

// 签名数据结构定义
export const createSignatureData = (publication) => {
  // 确保 timestamp 是 ISO 格式字符串
  let timestamp = ""

  if (publication?.created_at) {
    const date = new Date(publication.created_at)
    timestamp = date.toISOString()
  }

  const result = {
    address: publication?.author?.address || "",
    content_hash: publication?.content?.content_hash || "",
    signature: publication?.signature || "",
    timestamp: timestamp,
  }

  return result
}

const CopyButton = ({ field, value, copiedFields, handleCopy }) => (
  <IconButton
    variant="outline"
    bg="bg.subtle"
    onClick={() => handleCopy(field, value)}
    aria-label="Copy"
    roundedLeft={0}
  >
    {copiedFields[field] ? <FiCheck /> : <FiCopy />}
  </IconButton>
)

const TextareaCopyButton = ({ field, value, copiedFields, handleCopy }) => (
  <IconButton
    variant="outline"
    bg="bg.subtle"
    size="sm"
    position="absolute"
    top="2"
    right="2"
    zIndex="1"
    onClick={() => handleCopy(field, value)}
    aria-label="Copy"
  >
    {copiedFields[field] ? <FiCheck /> : <FiCopy />}
  </IconButton>
)

export const SignatureDialog = ({ isOpen, onClose, signatureData }) => {
  const [_copied, copyToClipboard] = useCopyToClipboard()
  const [copiedFields, setCopiedFields] = useState({})
  const { t } = useIntl()

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

  // 直接从signatureData创建Statement of Source的JSON字符串
  const statementOfSource = {
    contentHash: signatureData.content_hash,
    publisherAddress: signatureData.address,
    timestamp: Math.floor(new Date(signatureData.timestamp).getTime() / 1000),
  }
  const statementOfSourceJson = JSON.stringify(statementOfSource, null, 2)

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
            <Dialog.Title>{t("common")("proofOfSource")}</Dialog.Title>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
          </Dialog.Header>

          <Dialog.Body>
            <VStack gap={4} align="stretch">
              <Field.Root>
                <Field.Label>{t("common")("statementOfSource")}</Field.Label>
                <Box position="relative" w="full">
                  <Textarea
                    value={statementOfSourceJson}
                    readOnly
                    variant="outline"
                    w="full"
                    minH="180px"
                    fontFamily="mono"
                    fontSize="sm"
                    pr="12"
                  />
                  <TextareaCopyButton
                    field="statement"
                    value={statementOfSourceJson}
                    copiedFields={copiedFields}
                    handleCopy={handleCopy}
                  />
                </Box>
              </Field.Root>
              <Field.Root>
                <Field.Label>{t("common")("signature")}</Field.Label>
                <Group attached w="full">
                  <Input
                    value={signatureData?.signature || ""}
                    readOnly
                    variant="outline"
                    flex="1"
                    fontFamily="mono"
                    fontSize="sm"
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
              {t("common")("close")}
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}
