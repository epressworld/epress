"use client"

import { useMutation } from "@apollo/client/react"
import {
  Box,
  Button,
  createListCollection,
  IconButton,
  Input,
  Select,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react"
import { useCopyToClipboard } from "@uidotdev/usehooks"
import { useState } from "react"
import { LuCheck, LuCopy, LuKey } from "react-icons/lu"
import { GENERATE_INTEGRATION_TOKEN } from "../../graphql/mutations"
import { useIntl } from "../../hooks/useIntl"
import { toaster } from "../ui/toaster"

export function TokenGenerator() {
  const { t } = useIntl()

  // 权限选项
  const PERMISSIONS = createListCollection({
    items: [
      {
        label: t("settings")("searchPublications"),
        value: "search:publications",
      },
      {
        label: t("settings")("fetchPublications"),
        value: "fetch:publications",
      },
      {
        label: t("settings")("createPublications"),
        value: "create:publications",
      },
      {
        label: t("settings")("updatePublications"),
        value: "update:publications",
      },
      {
        label: t("settings")("deletePublications"),
        value: "delete:publications",
      },
      { label: t("settings")("searchComments"), value: "search:comments" },
      { label: t("settings")("fetchComments"), value: "fetch:comments" },
      { label: t("settings")("deleteComments"), value: "delete:comments" },
    ],
  })
  const [generateToken, { loading }] = useMutation(GENERATE_INTEGRATION_TOKEN)
  const [copiedText, copyToClipboard] = useCopyToClipboard()

  const [selectedPermissions, setSelectedPermissions] = useState([])
  const [expirationTime, setExpirationTime] = useState("90d")
  const [generatedToken, setGeneratedToken] = useState("")

  const handleGenerate = async () => {
    console.log("Selected permissions:", selectedPermissions)
    if (!selectedPermissions || selectedPermissions.length === 0) {
      toaster.create({
        description: t("settings")("selectAtLeastOnePermission"),
        type: "error",
      })
      return
    }

    try {
      const { data } = await generateToken({
        variables: {
          scope: selectedPermissions,
          expiresIn: expirationTime || "90d",
        },
      })

      setGeneratedToken(data.generateIntegrationToken)

      toaster.create({
        description: t("settings")("tokenGenerated"),
        type: "success",
      })
    } catch (error) {
      console.error("Token generation failed:", error)
      toaster.create({
        description: error.message || t("settings")("generateFailed"),
        type: "error",
      })
    }
  }

  const handleCopyToken = async () => {
    try {
      await copyToClipboard(generatedToken)
      toaster.create({
        description: t("settings")("tokenCopied"),
        type: "success",
      })
    } catch (error) {
      console.error("Copy failed:", error)
      toaster.create({
        description: t("settings")("copyFailed"),
        type: "error",
      })
    }
  }

  return (
    <VStack gap={6} align="stretch">
      {/* 权限选择 */}
      <VStack align="stretch" gap={2}>
        <VStack align="start" gap={1}>
          <Text fontSize="sm" fontWeight="medium">
            {t("settings")("selectPermissions")}
          </Text>
          <Text fontSize="xs" color="gray.500">
            {t("settings")("selectPermissionsHelper")}
          </Text>
        </VStack>

        <Select.Root
          multiple
          value={selectedPermissions || []}
          collection={PERMISSIONS}
          onValueChange={(details) => {
            console.log("Value change details:", details)
            setSelectedPermissions(details.value || [])
          }}
        >
          <Select.HiddenSelect />
          <Select.Control>
            <Select.Trigger>
              <Select.ValueText
                placeholder={t("settings")("selectPermissions")}
              />
            </Select.Trigger>
            <Select.IndicatorGroup>
              <Select.Indicator />
            </Select.IndicatorGroup>
          </Select.Control>
          <Select.Positioner>
            <Select.Content>
              {PERMISSIONS.items.map((permission) => (
                <Select.Item key={permission.value} item={permission}>
                  {permission.label}
                  <Select.ItemIndicator />
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Positioner>
        </Select.Root>
      </VStack>

      {/* 过期时间 */}
      <VStack align="stretch" gap={2}>
        <VStack align="start" gap={1}>
          <Text fontSize="sm" fontWeight="medium">
            {t("settings")("expirationTime")}
          </Text>
          <Text fontSize="xs" color="gray.500">
            {t("settings")("expirationTimeHelper")}
          </Text>
        </VStack>

        <Input
          value={expirationTime}
          onChange={(e) => setExpirationTime(e.target.value)}
          placeholder={t("settings")("expirationTimePlaceholder")}
        />
      </VStack>

      {/* 生成按钮 */}
      <Button
        onClick={handleGenerate}
        loading={loading}
        loadingText={t("settings")("generating")}
        colorPalette="orange"
        disabled={!selectedPermissions || selectedPermissions.length === 0}
      >
        <LuKey /> {t("settings")("generateTokenButton")}
      </Button>

      {/* 生成的令牌 */}
      {generatedToken && (
        <VStack align="stretch" gap={2}>
          <VStack align="start" gap={1}>
            <Text fontSize="sm" fontWeight="medium">
              {t("settings")("tokenGenerated")}
            </Text>
            <Text fontSize="xs" color="gray.500">
              {t("settings")("tokenGeneratedHelper")}
            </Text>
          </VStack>

          <Box position="relative">
            <Textarea
              value={generatedToken}
              readOnly
              rows={4}
              fontSize="xs"
              fontFamily="mono"
              bg="gray.50"
              _dark={{ bg: "gray.800" }}
            />
            <IconButton
              position="absolute"
              top={2}
              right={2}
              size="sm"
              variant="ghost"
              onClick={handleCopyToken}
            >
              {copiedText ? <LuCheck /> : <LuCopy />}
            </IconButton>
          </Box>

          <Text fontSize="xs" color="gray.500">
            {copiedText
              ? t("settings")("tokenCopied")
              : t("settings")("copyToken")}
          </Text>
        </VStack>
      )}
    </VStack>
  )
}
