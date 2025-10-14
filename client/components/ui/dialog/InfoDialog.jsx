"use client"

import {
  Box,
  Button,
  CloseButton,
  Dialog,
  Portal,
  Text,
} from "@chakra-ui/react"
import { useIntl } from "@/hooks/utils"

export const InfoDialog = ({
  isOpen,
  onClose,
  title,
  content = "",
  closeText,
  isPreformatted = false,
  showCloseButton = true,
}) => {
  const { t } = useIntl()

  // 使用翻译的默认值
  const dialogTitle = title || t("common")("info")
  const dialogCloseText = closeText || t("common")("close")
  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={onClose}
      closeOnEscape={true}
      initialFocusEl={() => null}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>{dialogTitle}</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body>
              {isPreformatted ? (
                <Text as="pre" whiteSpace="pre-wrap" fontFamily="mono">
                  {content}
                </Text>
              ) : (
                <Box>{content}</Box>
              )}
            </Dialog.Body>
            {showCloseButton && (
              <Dialog.Footer>
                <Button variant="outline" onClick={onClose}>
                  {dialogCloseText}
                </Button>
              </Dialog.Footer>
            )}
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
