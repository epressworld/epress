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
import { useTranslation } from "../../hooks/useTranslation"
import { toaster } from "../ui/toaster"

export function TokenGenerator() {
  const { settings } = useTranslation()

  // 权限选项
  const PERMISSIONS = createListCollection({
    items: [
      { label: settings.searchPublications(), value: "search:publications" },
      { label: settings.fetchPublications(), value: "fetch:publications" },
      { label: settings.createPublications(), value: "create:publications" },
      { label: settings.updatePublications(), value: "update:publications" },
      { label: settings.deletePublications(), value: "delete:publications" },
      { label: settings.searchComments(), value: "search:comments" },
      { label: settings.fetchComments(), value: "fetch:comments" },
      { label: settings.deleteComments(), value: "delete:comments" },
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
        description: settings.selectAtLeastOnePermission(),
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
        description: settings.tokenGenerated(),
        type: "success",
      })
    } catch (error) {
      console.error("Token generation failed:", error)
      toaster.create({
        description: error.message || settings.generateFailed(),
        type: "error",
      })
    }
  }

  const handleCopyToken = async () => {
    try {
      await copyToClipboard(generatedToken)
      toaster.create({
        description: settings.tokenCopied(),
        type: "success",
      })
    } catch (error) {
      console.error("Copy failed:", error)
      toaster.create({
        description: settings.copyFailed(),
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
            {settings.selectPermissions()}
          </Text>
          <Text fontSize="xs" color="gray.500">
            {settings.selectPermissionsHelper()}
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
              <Select.ValueText placeholder={settings.selectPermissions()} />
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
            {settings.expirationTime()}
          </Text>
          <Text fontSize="xs" color="gray.500">
            {settings.expirationTimeHelper()}
          </Text>
        </VStack>

        <Input
          value={expirationTime}
          onChange={(e) => setExpirationTime(e.target.value)}
          placeholder={settings.expirationTimePlaceholder()}
        />
      </VStack>

      {/* 生成按钮 */}
      <Button
        onClick={handleGenerate}
        loading={loading}
        loadingText={settings.generating()}
        colorPalette="orange"
        disabled={!selectedPermissions || selectedPermissions.length === 0}
      >
        <LuKey /> {settings.generateTokenButton()}
      </Button>

      {/* 生成的令牌 */}
      {generatedToken && (
        <VStack align="stretch" gap={2}>
          <VStack align="start" gap={1}>
            <Text fontSize="sm" fontWeight="medium">
              {settings.tokenGenerated()}
            </Text>
            <Text fontSize="xs" color="gray.500">
              {settings.tokenGeneratedHelper()}
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
            {copiedText ? settings.tokenCopied() : settings.copyToken()}
          </Text>
        </VStack>
      )}
    </VStack>
  )
}
