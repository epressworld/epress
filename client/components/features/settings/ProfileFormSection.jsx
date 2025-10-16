"use client"

import {
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
  Dialog,
  Flex,
  HStack,
  Input,
  InputGroup,
  Portal,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useRef, useState } from "react"
import { LuCamera, LuSave } from "react-icons/lu"
import { FormField } from "@/components/ui"
import { usePage } from "@/contexts/PageContext"
import { useProfileForm } from "@/hooks/form"
import { useIntl } from "@/hooks/utils"

export function ProfileFormSection({ onSuccess }) {
  const { t } = useIntl()
  const inputRef = useRef(null)
  const { profile } = usePage()
  const {
    form,
    isLoading,
    avatarPreview,
    handleAvatarChange,
    onSubmit,
    isWalletConnected,
  } = useProfileForm()

  // 控制 URL 输入框的启用状态
  const [isUrlEnabled, setIsUrlEnabled] = useState(false)
  // 控制警告对话框的显示
  const [showUrlWarning, setShowUrlWarning] = useState(false)

  const handleSubmit = async (data) => {
    const result = await onSubmit(data)
    if (result.success && onSuccess) {
      onSuccess()
    }
  }

  // 处理 URL 编辑状态变化
  const handleUrlEnabledChange = (details) => {
    const newValue = details.checked
    if (newValue && !isUrlEnabled) {
      // 从禁用变为启用时显示警告，但不立即激活
      setShowUrlWarning(true)
    } else {
      // 如果是从启用变为禁用，直接更新状态
      setIsUrlEnabled(newValue)
    }
  }

  // 处理警告对话框的确认
  const handleUrlWarningConfirm = () => {
    setIsUrlEnabled(true)
    setShowUrlWarning(false)
  }

  // 处理警告对话框的取消
  const handleUrlWarningCancel = () => {
    setShowUrlWarning(false)
    // 不更新 isUrlEnabled 状态，保持禁用
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)}>
      <VStack gap={6} align="stretch">
        <Alert.Root status="info" variant="subtle">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>
              {t("settings.modifyRequiresSignature")}
            </Alert.Description>
          </Alert.Content>
        </Alert.Root>

        {/* 第一行：头像和基本信息 */}
        <Flex
          direction={{ base: "column", md: "row" }}
          gap={4}
          align={{ base: "stretch", md: "start" }}
        >
          {/* 头像 */}
          <VStack
            gap={2}
            align="center"
            minW={{ base: "auto", md: "120px" }}
            flex={{ base: "none", md: "0 0 auto" }}
          >
            <Box position="relative">
              <Avatar.Root size={{ base: "xl", md: "2xl" }}>
                <Avatar.Fallback name={form.watch("title") || "Node"} />
                <Avatar.Image
                  src={
                    avatarPreview ||
                    (profile.url ? `${profile.url}/ewp/avatar` : undefined)
                  }
                />
              </Avatar.Root>
              <Button
                size="xs"
                position="absolute"
                bottom="-8px"
                right="-8px"
                borderRadius="full"
                colorPalette="orange"
                variant="solid"
                onClick={() => inputRef.current?.click()}
              >
                <LuCamera />
              </Button>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                style={{ display: "none" }}
              />
            </Box>
            <Text fontSize="xs" color="gray.500" textAlign="center">
              {t("settings.supportedFormats", { maxSize: 2 })}
            </Text>
          </VStack>

          {/* 标题和描述 */}
          <VStack gap={4} align="stretch" flex="1">
            <FormField
              label={t("settings.nodeTitle")}
              placeholder={t("settings.nodeTitlePlaceholder")}
              error={form.formState.errors.title?.message}
              required
              {...form.register("title", {
                required: t("settings.titleRequired"),
              })}
            />

            <FormField
              label={t("settings.nodeDescription")}
              placeholder={t("settings.nodeDescriptionPlaceholder")}
              multiline
              rows={3}
              {...form.register("description")}
            />
          </VStack>
        </Flex>

        {/* 第二行：节点URL */}
        <VStack gap={2} align="stretch">
          <Text fontSize="sm" fontWeight="medium">
            {t("settings.nodeUrl")}{" "}
            <Text as="span" color="red.500">
              *
            </Text>
          </Text>
          <InputGroup
            endElement={
              <HStack align="center" px={3}>
                <Checkbox.Root
                  checked={isUrlEnabled}
                  onCheckedChange={handleUrlEnabledChange}
                >
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                  <Checkbox.Label
                    fontSize="sm"
                    color="gray.600"
                    _dark={{ color: "gray.400" }}
                  >
                    {t("settings.edit")}
                  </Checkbox.Label>
                </Checkbox.Root>
              </HStack>
            }
          >
            <Input
              placeholder={t("settings.nodeUrlPlaceholder")}
              disabled={!isUrlEnabled}
              {...form.register("url", {
                required: isUrlEnabled ? t("settings.urlRequired") : false,
                pattern: {
                  value: /^https?:\/\/.+/,
                  message: t("settings.urlFormatIncorrect"),
                },
              })}
            />
          </InputGroup>
          {form.formState.errors.url?.message && (
            <Text fontSize="sm" color="red.500">
              {form.formState.errors.url.message}
            </Text>
          )}
          <Text fontSize="sm" color="gray.500" _dark={{ color: "gray.400" }}>
            {t("settings.nodeUrlHelper")}
          </Text>
        </VStack>

        <Button
          type="submit"
          loading={isLoading}
          loadingText={t("settings.saving")}
          colorPalette="orange"
          disabled={!isWalletConnected}
        >
          <LuSave />{" "}
          {isWalletConnected
            ? t("settings.saveAndBroadcast")
            : t("common.pleaseConnectWalletButton")}
        </Button>
      </VStack>

      {/* URL 编辑警告对话框 */}
      <Dialog.Root
        open={showUrlWarning}
        onOpenChange={(details) => setShowUrlWarning(details.open)}
        closeOnEscape={true}
        closeOnInteractOutside={true}
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content maxW="md">
              <Dialog.Header>
                <Dialog.Title>{t("settings.nodeUrl")}</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Text>{t("settings.urlEditWarning")}</Text>
              </Dialog.Body>
              <Dialog.Footer>
                <HStack gap={2} justify="end">
                  <Button variant="outline" onClick={handleUrlWarningCancel}>
                    {t("common.cancel")}
                  </Button>
                  <Button onClick={handleUrlWarningConfirm}>
                    {t("common.confirm")}
                  </Button>
                </HStack>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </form>
  )
}
