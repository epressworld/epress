"use client"

import {
  Button,
  CloseButton,
  Dialog,
  HStack,
  Portal,
  Text,
} from "@chakra-ui/react"
import { useIntl } from "@/hooks/utils"

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  confirmColorPalette = "red",
  isLoading = false,
}) => {
  const { t } = useIntl()

  // 使用翻译的默认值
  const dialogTitle = title || t("dialog.confirmOperation")
  const dialogMessage = message || t("dialog.confirmMessage")
  const dialogConfirmText = confirmText || t("common.confirm")
  const dialogCancelText = cancelText || t("common.cancel")

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
              <Text>{dialogMessage}</Text>
            </Dialog.Body>
            <Dialog.Footer>
              <HStack gap={2}>
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={isLoading}
                >
                  {dialogCancelText}
                </Button>
                <Button
                  colorPalette={confirmColorPalette}
                  onClick={onConfirm}
                  loading={isLoading}
                >
                  {dialogConfirmText}
                </Button>
              </HStack>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
