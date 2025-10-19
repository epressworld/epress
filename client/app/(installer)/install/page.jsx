"use client"

import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  Center,
  Container,
  createListCollection,
  Field,
  Group,
  Heading,
  HStack,
  Icon,
  Image,
  Input,
  InputGroup,
  Progress,
  Select,
  Separator,
  Spinner,
  Stack,
  Steps,
  Text,
  Textarea,
  useSteps,
  VStack,
} from "@chakra-ui/react"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useCallback, useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { FaCheckCircle, FaGithub, FaHome } from "react-icons/fa"
import { FaEthereum } from "react-icons/fa6"
import { GrClose, GrInstall, GrNext, GrPrevious } from "react-icons/gr"
import { LuCircleAlert } from "react-icons/lu"
import { useAccount } from "wagmi"
import { Link, toaster } from "@/components/ui"
import { useWallet } from "@/hooks/data"
import { useIntl } from "@/hooks/utils"
import { installTypedData } from "@/utils/helpers"

// Helper function to get window.location.origin safely
const getOrigin = () => {
  if (typeof window !== "undefined") {
    return window.location.origin
  }
  return ""
}

// #region Sub-Components
// ############################################################################

/**
 * Renders the header section of the installer.
 */
function InstallHeader({ t }) {
  return (
    <Box textAlign="center">
      <VStack gap={2}>
        <Box fontSize="4xl">
          <Link
            href="https://github.com/epressworld/epress"
            target="_blank"
            rel="noopener noreferrer"
            _hover={{ opacity: 0.8 }}
          >
            <Image src="/assets/logo-light.svg" alt="epress logo" width={48} />
          </Link>
        </Box>
        <Heading size="2xl">{t("installer.welcome")}</Heading>
        <Text color="gray.600" fontSize="lg">
          {t("installer.welcomeDescription")}
        </Text>
      </VStack>
    </Box>
  )
}

/**
 * Renders the form fields for Step 0: Node Configuration.
 */
function StepNodeConfig({ form, t }) {
  const { register, formState, watch, setValue } = form
  const fileInputRef = useRef(null)

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toaster.create({
        title: t("installer.invalidFileType"),
        description: t("installer.selectImageError"),
        type: "error",
      })
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      // 2MB
      toaster.create({
        title: t("installer.fileTooLarge"),
        description: t("installer.imageSizeError"),
        type: "error",
      })
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setValue("node.avatar", reader.result, { shouldValidate: true })
    }
    reader.readAsDataURL(file)
  }

  return (
    <Card.Root mt={8}>
      <Card.Header>
        <Heading size="lg">{t("installer.nodeConfiguration")}</Heading>
        <Text color="gray.600">
          {t("installer.nodeConfigurationDescription")}
        </Text>
      </Card.Header>
      <Card.Body>
        <Stack gap={4}>
          <Field.Root>
            <Field.Label>{t("installer.nodeAvatar")}</Field.Label>
            <Box>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
              <Avatar.Root
                size="2xl"
                onClick={handleAvatarClick}
                cursor="pointer"
              >
                <Avatar.Fallback name={watch("node.title")} />
                <Avatar.Image
                  src={watch("node.avatar") || null}
                  _hover={{ opacity: 0.8 }}
                />
              </Avatar.Root>
            </Box>
            <Field.HelperText>
              {t("installer.nodeAvatarHelper")}
            </Field.HelperText>
          </Field.Root>

          <Field.Root required invalid={!!formState.errors.node?.address}>
            <Field.Label>
              {t("installer.nodeAddress")}
              <Field.RequiredIndicator />
            </Field.Label>
            <Group attached w="full">
              <Input
                readOnly
                {...register("node.address", {
                  required: t("installer.nodeAddressRequired"),
                  pattern: {
                    value: /^0x[a-fA-F0-9]{40}$/,
                    message: t("installer.invalidEthereumAddress"),
                  },
                })}
                placeholder={t("installer.nodeAddressPlaceholder")}
              />
              <ConnectButton.Custom>
                {({
                  account,
                  chain,
                  openAccountModal,
                  openChainModal,
                  openConnectModal,
                  authenticationStatus,
                  mounted,
                }) => {
                  const ready = mounted && authenticationStatus !== "loading"
                  const connected =
                    ready &&
                    account &&
                    chain &&
                    (!authenticationStatus ||
                      authenticationStatus === "authenticated")

                  return (
                    <div
                      {...(!ready && {
                        "aria-hidden": true,
                        style: {
                          opacity: 0,
                          pointerEvents: "none",
                          userSelect: "none",
                        },
                      })}
                    >
                      {(() => {
                        if (!connected) {
                          return (
                            <Button
                              roundedLeft={0}
                              onClick={openConnectModal}
                              colorPalette={"gray"}
                              aria-label={t("installer.connectWallet")}
                            >
                              <FaEthereum />
                            </Button>
                          )
                        }

                        if (chain.unsupported) {
                          return (
                            <Button
                              roundedLeft={0}
                              onClick={openChainModal}
                              colorPalette={"gray"}
                              aria-label={t("installer.wrongNetwork")}
                            >
                              Wrong network
                            </Button>
                          )
                        }

                        return (
                          <Button
                            roundedLeft={0}
                            onClick={openAccountModal}
                            colorPalette={"gray"}
                            aria-label={t("installer.nodeAddress")}
                          >
                            <FaEthereum />
                          </Button>
                        )
                      })()}
                    </div>
                  )
                }}
              </ConnectButton.Custom>
            </Group>
            <Field.ErrorText>
              {formState.errors.node?.address?.message}
            </Field.ErrorText>
          </Field.Root>

          <Field.Root required invalid={!!formState.errors.node?.url}>
            <Field.Label>
              {t("installer.nodeUrl")}
              <Field.RequiredIndicator />
            </Field.Label>
            <Input
              {...register("node.url", {
                required: t("installer.nodeUrlRequired"),
                pattern: {
                  value: /^https?:\/\/.+/,
                  message: t("installer.invalidUrl"),
                },
              })}
              placeholder={t("installer.nodeUrlPlaceholder")}
            />
            <Field.ErrorText>
              {formState.errors.node?.url?.message}
            </Field.ErrorText>
          </Field.Root>

          <Field.Root required invalid={!!formState.errors.node?.title}>
            <Field.Label>
              {t("installer.nodeTitle")}
              <Field.RequiredIndicator />
            </Field.Label>
            <Input
              {...register("node.title", {
                required: t("installer.nodeTitleRequired"),
              })}
              placeholder={t("installer.nodeTitlePlaceholder")}
            />
            <Field.ErrorText>
              {formState.errors.node?.title?.message}
            </Field.ErrorText>
          </Field.Root>

          <Field.Root invalid={!!formState.errors.node?.description}>
            <Field.Label>{t("installer.nodeDescription")}</Field.Label>
            <Textarea
              {...register("node.description")}
              placeholder={t("installer.nodeDescriptionPlaceholder")}
              rows={3}
            />
            <Field.ErrorText>
              {formState.errors.node?.description?.message}
            </Field.ErrorText>
          </Field.Root>
        </Stack>
      </Card.Body>
    </Card.Root>
  )
}

/**
 * Renders the form fields for Step 1: Advanced Settings.
 */
function StepAdvancedSettings({
  form,
  t,
  languageCollection,
  themeCollection,
  defaultValues,
  validateMailTransport,
  mailTransportValidating,
  mailTransportValid,
  mailFromRequired,
}) {
  const { register, formState, setValue } = form

  return (
    <Card.Root mt={8}>
      <Card.Header>
        <Heading size="lg">{t("installer.advancedSettings")}</Heading>
        <Text color="gray.600">
          {t("installer.advancedSettingsDescription")}
        </Text>
      </Card.Header>
      <Card.Body>
        <Stack gap={4}>
          <Field.Root>
            <Field.Label>{t("installer.defaultLanguage")}</Field.Label>
            <Select.Root
              defaultValue={[defaultValues.settings.defaultLanguage]}
              collection={languageCollection}
              onValueChange={(details) =>
                setValue("settings.defaultLanguage", details.value[0])
              }
            >
              <Select.HiddenSelect />
              <Select.Control>
                <Select.Trigger>
                  <Select.ValueText
                    placeholder={t("installer.defaultLanguage")}
                  />
                </Select.Trigger>
                <Select.IndicatorGroup>
                  <Select.Indicator />
                </Select.IndicatorGroup>
              </Select.Control>
              <Select.Positioner>
                <Select.Content>
                  {languageCollection.items.map((item) => (
                    <Select.Item item={item} key={item.value}>
                      {item.label}
                      <Select.ItemIndicator />
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Positioner>
            </Select.Root>
          </Field.Root>
          <Field.Root>
            <Field.Label>{t("installer.defaultTheme")}</Field.Label>
            <Select.Root
              defaultValue={[defaultValues.settings.defaultTheme]}
              collection={themeCollection}
              onValueChange={(details) =>
                setValue("settings.defaultTheme", details.value[0])
              }
            >
              <Select.HiddenSelect />
              <Select.Control>
                <Select.Trigger>
                  <Select.ValueText placeholder={t("installer.defaultTheme")} />
                </Select.Trigger>
                <Select.IndicatorGroup>
                  <Select.Indicator />
                </Select.IndicatorGroup>
              </Select.Control>
              <Select.Positioner>
                <Select.Content>
                  {themeCollection.items.map((item) => (
                    <Select.Item item={item} key={item.value}>
                      {item.label}
                      <Select.ItemIndicator />
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Positioner>
            </Select.Root>
          </Field.Root>
          <Field.Root>
            <Field.Label>{t("installer.walletConnectOptional")}</Field.Label>
            <Input
              {...register("settings.walletConnectProjectId")}
              placeholder={t("installer.walletConnectProjectIdPlaceholder")}
            />
            <Field.HelperText>
              {t("installer.walletConnectHelper")}{" "}
              <Link target="_blank" href="https://reown.com">
                Reown.com
              </Link>
            </Field.HelperText>
            <Field.ErrorText />
          </Field.Root>

          <Separator my={2} />

          <VStack align="stretch" gap={4}>
            <Text fontWeight="semibold" fontSize="md">
              {t("installer.mailServerSettings")}
            </Text>

            <Field.Root invalid={!!formState.errors.settings?.mailTransport}>
              <Field.Label>{t("installer.mailTransportOptional")}</Field.Label>
              <InputGroup
                endElement={
                  mailTransportValidating ? (
                    <Spinner size="sm" />
                  ) : mailTransportValid === true ? (
                    <Icon as={FaCheckCircle} color="green.500" />
                  ) : mailTransportValid === false ? (
                    <Icon as={LuCircleAlert} color="red.500" />
                  ) : null
                }
              >
                <Input
                  {...register("settings.mailTransport", {
                    validate: validateMailTransport,
                  })}
                  placeholder={t("installer.mailTransportPlaceholder")}
                />
              </InputGroup>
              <Field.HelperText>
                {t("installer.mailTransportHelper")}
              </Field.HelperText>
              <Field.ErrorText>
                {formState.errors.settings?.mailTransport?.message}
              </Field.ErrorText>
            </Field.Root>

            <Field.Root invalid={!!formState.errors.settings?.mailFrom}>
              <Field.Label>
                {t("installer.mailFromOptional")}
                <Field.RequiredIndicator />
              </Field.Label>
              <Input
                {...register("settings.mailFrom", {
                  required: {
                    value: mailFromRequired,
                    message: t("installer.mailFromRequired"),
                  },
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: t("installer.invalidEmailFormat"),
                  },
                })}
                placeholder={t("installer.mailFromPlaceholder")}
                type="email"
              />
              <Field.HelperText>
                {t("installer.mailFromHelper")}
              </Field.HelperText>
              <Field.ErrorText>
                {formState.errors.settings?.mailFrom?.message}
              </Field.ErrorText>
            </Field.Root>
          </VStack>
        </Stack>
      </Card.Body>
    </Card.Root>
  )
}

const ReviewItem = ({
  watchedValues,
  label,
  value,
  isAvatar = false,
  isEmpty = false,
}) => {
  const { t } = useIntl()

  return (
    <Box>
      <Text fontWeight="bold">{label}:</Text>
      {isAvatar ? (
        <>
          <Avatar.Root size="2xl" mt={2}>
            <Avatar.Fallback name={watchedValues.node.title} />
            <Avatar.Image src={value || null} />
          </Avatar.Root>
          {!value && (
            <Text color="gray.500" fontSize="sm" mt={1}>
              {t("installer.nodeAvatarEmpty")}
            </Text>
          )}
        </>
      ) : (
        <Text>{value || t("installer.notSet")}</Text>
      )}
      {isEmpty && (
        <Alert.Root mt={1} status="warning">
          <Alert.Indicator />
          <Alert.Content>
            {t("installer.mailTransportEmptyWarning")}
          </Alert.Content>
        </Alert.Root>
      )}
    </Box>
  )
}
/**
 * Renders the summary for Step 2: Review & Install.
 */
function StepReview({ form, t }) {
  const watchedValues = form.watch()

  return (
    <Card.Root mt={8}>
      <Card.Header>
        <Heading size="lg">{t("installer.reviewAndInstall")}</Heading>
        <Text color="gray.600">
          {t("installer.reviewAndInstallDescription")}
        </Text>
      </Card.Header>
      <Card.Body>
        <Stack gap={4}>
          <ReviewItem
            watchedValues={watchedValues}
            label={t("installer.nodeAvatar")}
            value={watchedValues.node.avatar}
            isAvatar
          />
          <ReviewItem
            watchedValues={watchedValues}
            label={t("installer.nodeAddress")}
            value={watchedValues.node.address}
          />
          <ReviewItem
            watchedValues={watchedValues}
            label={t("installer.nodeUrl")}
            value={watchedValues.node.url}
          />
          <ReviewItem
            watchedValues={watchedValues}
            label={t("installer.nodeTitle")}
            value={watchedValues.node.title}
          />
          <ReviewItem
            watchedValues={watchedValues}
            label={t("installer.nodeDescription")}
            value={watchedValues.node.description}
          />
          <ReviewItem
            watchedValues={watchedValues}
            label={t("installer.defaultLanguage")}
            value={watchedValues.settings.defaultLanguage}
          />
          <ReviewItem
            watchedValues={watchedValues}
            label={t("installer.defaultTheme")}
            value={watchedValues.settings.defaultTheme}
          />
          <ReviewItem
            watchedValues={watchedValues}
            label={t("installer.walletConnectProjectId")}
            value={watchedValues.settings.walletConnectProjectId}
          />
          <ReviewItem
            watchedValues={watchedValues}
            label={t("installer.mailTransport")}
            value={watchedValues.settings.mailTransport}
            isEmpty={!watchedValues.settings.mailTransport}
          />
          <ReviewItem
            watchedValues={watchedValues}
            label={t("installer.mailFrom")}
            value={watchedValues.settings.mailFrom}
          />
        </Stack>
      </Card.Body>
    </Card.Root>
  )
}

/**
 * Renders the installation progress spinner.
 */
function InstallProgress({ t }) {
  return (
    <VStack gap={4}>
      <Center>
        <Heading size="3xl">{t("installer.installing")}</Heading>
      </Center>
      <Center>
        <Progress.Root minW={"240px"} value={null}>
          <Progress.Track>
            <Progress.Range />
          </Progress.Track>
        </Progress.Root>
      </Center>
      <Center>
        <Box>
          <Text>{t("installer.pleaseWait")}</Text>
        </Box>
      </Center>
    </VStack>
  )
}

function InstallStepsResult({ installResult }) {
  const { t } = useIntl()
  const { steps } = installResult
  return (
    <>
      {steps && (
        <Box w="100%" maxW="500px" mt={4}>
          <Text fontWeight="bold" mb={2}>
            {t("installer.installationSteps") || "Installation Steps"}
          </Text>
          {steps.map((step, index) => (
            <HStack
              key={index}
              mb={2}
              bg={step.success ? "green.50" : "red.50"}
              p={3}
              borderRadius="md"
              justify="space-between"
              align="start"
            >
              <HStack>
                <Icon
                  as={step.success ? FaCheckCircle : LuCircleAlert}
                  color={step.success ? "green.500" : "red.500"}
                  mt="1"
                />
                <Text fontWeight="medium">
                  {/* Используем t() для перевода названий шагов */}
                  {t(`installer.steps.${step.step}`, step.step)}
                </Text>
              </HStack>
              {!step.success && step.error && (
                <Text color="red.600" fontSize="sm" textAlign="right" pl={4}>
                  {step.error}
                </Text>
              )}
            </HStack>
          ))}
        </Box>
      )}
    </>
  )
}
/**
 * Renders the final result of the installation (success or error).
 */
function InstallResult({ t, installResult }) {
  const { type, title, description } = installResult

  if (type === "success") {
    return (
      <VStack gap={4}>
        <Center>
          <Heading size="3xl">{title}</Heading>
        </Center>
        <Center fontSize="5xl" color="green.500">
          <Icon as={GrInstall} />
        </Center>
        <Center>
          <Box>
            <Text>{description}</Text>
          </Box>
        </Center>

        <InstallStepsResult installResult={installResult} />

        <Center>
          <Button
            onClick={() => {
              window.location.href = "/"
            }}
            variant={"subtle"}
            mr={4}
            leftIcon={<FaHome />}
          >
            {t("installer.goToHomePage")}
          </Button>
          <Button
            variant={"subtle"}
            onClick={() => {
              window.location.href =
                "https://github.com/epressworld/awesome-nodes"
            }}
            leftIcon={<FaGithub />}
          >
            {t("installer.goToAwesomeNodes")}
          </Button>
        </Center>
      </VStack>
    )
  }

  // Error case
  return (
    <VStack gap={4}>
      <Center>
        <Heading size="3xl">{title}</Heading>
      </Center>
      <Center fontSize="5xl" color="red.500">
        <Icon as={GrClose} />
      </Center>
      <Center>
        <Box>
          <Text>{description}</Text>
        </Box>
      </Center>
      <InstallStepsResult installResult={installResult} />
    </VStack>
  )
}

/**
 * Renders the "Previous" and "Next" / "Sign & Install" buttons.
 */
function InstallNavigation({
  steps,
  t,
  onNextClick,
  onInstallClick,
  isSigning,
  isInstalling,
  installResult,
  mailTransportValidating,
}) {
  const { value: currentStep, hasPrevStep, hasNextStep, count } = steps
  const isLastReviewStep = currentStep === count - 1

  return (
    <Stack direction="row" justify="space-between" mt={4}>
      <Button
        onClick={() => steps.goToPrevStep()}
        disabled={
          !hasPrevStep ||
          isSigning ||
          isInstalling ||
          installResult?.type === "success"
        }
        variant="outline"
        leftIcon={<GrPrevious />}
      >
        <GrPrevious /> {t("installer.previous") || "Previous"}
      </Button>

      {hasNextStep && (
        <Button
          colorPalette="orange"
          onClick={isLastReviewStep ? onInstallClick : onNextClick}
          disabled={mailTransportValidating || isSigning || isInstalling}
          isLoading={isSigning}
          loadingText={t("installer.signing") || "Signing..."}
          rightIcon={<GrNext />}
        >
          {isLastReviewStep
            ? t("installer.signAndInstall") || "Sign & Install"
            : t("installer.next") || "Next"}
          <GrNext />
        </Button>
      )}
    </Stack>
  )
}

// #endregion
// ############################################################################

/**
 * Main Install Page Component
 */
export default function InstallPage() {
  const t = useTranslations()
  const router = useRouter()
  const { address } = useAccount()
  const { signEIP712Data } = useWallet()

  // Step definition
  const installSteps = [
    {
      title: t("installer.nodeConfiguration"),
      description: t("installer.nodeConfigurationDescription"),
    },
    {
      title: t("installer.advancedSettings"),
      description: t("installer.advancedSettingsDescription"),
    },
    {
      title: t("installer.reviewAndInstall"),
      description: t("installer.reviewAndInstallDescription"),
    },
  ]

  // State
  const [isCheckingStatus, setIsCheckingStatus] = useState(true)
  const [isSigning, setIsSigning] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)
  const [installResult, setInstallResult] = useState(null)
  const [mailTransportValidating, setMailTransportValidating] = useState(false)
  const [mailTransportValid, setMailTransportValid] = useState(null)
  const [typedData, setTypedData] = useState(null)
  const [signature, setSignature] = useState(null)

  const steps = useSteps({
    defaultStep: 0,
    count: installSteps.length,
  })

  // Form setup
  const defaultValues = {
    node: {
      address: "",
      url: "",
      title: t("installer.nodeTitlePlaceholder"),
      description: t("installer.nodeDescriptionPlaceholder"),
      avatar: "",
    },
    settings: {
      mailTransport: "",
      mailFrom: "",
      defaultLanguage: "en",
      defaultTheme: "light",
      walletConnectProjectId: "69d8a07245b4715f6a73ed8bce668e6a",
    },
  }

  const form = useForm({
    defaultValues,
    mode: "onChange",
  })

  // Data collections for selects
  const languageCollection = createListCollection({
    items: [
      { label: t("installer.languageEnglish"), value: "en" },
      { label: t("installer.languageChinese"), value: "zh" },
    ],
  })

  const themeCollection = createListCollection({
    items: [
      { label: t("installer.themeLight"), value: "light" },
      { label: t("installer.themeDark"), value: "dark" },
    ],
  })

  // Effects
  useEffect(() => {
    document.title = "Installer - epress"
  }, [])

  useEffect(() => {
    form.setValue("node.url", getOrigin())
  }, [form])

  useEffect(() => {
    // Check if already installed
    const checkStatus = async () => {
      try {
        const response = await fetch("/ewp/profile")
        if (response.status !== 422) {
          router.push("/")
        }
      } catch (error) {
        console.error("Failed to check installation status:", error)
      } finally {
        setIsCheckingStatus(false)
      }
    }
    checkStatus()
  }, [router])

  useEffect(() => {
    form.setValue("node.address", address, { shouldValidate: true })
  }, [address, form])

  // Call performInstall when moving to the final step *after* signing
  useEffect(() => {
    if (steps.value === steps.count && signature && typedData) {
      performInstall()
    }
  }, [steps.value, steps.count, signature, typedData]) // `performInstall` is memoized

  // Async Functions
  const validateMailTransport = async (value) => {
    if (!value || value.trim() === "") {
      setMailTransportValid(null)
      return true // Optional field
    }
    setMailTransportValidating(true)
    setMailTransportValid(null)
    try {
      const response = await fetch("/api/smtp_check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mailTransport: value }),
      })
      const data = await response.json()
      if (data.valid) {
        setMailTransportValid(true)
        return true
      } else {
        setMailTransportValid(false)
        return data.error || t("installer.mailTransportInvalid")
      }
    } catch (_error) {
      setMailTransportValid(false)
      return t("installer.mailTransportInvalid")
    } finally {
      setMailTransportValidating(false)
    }
  }

  // Memoized performInstall function
  const performInstall = useCallback(async () => {
    if (!typedData || !signature) {
      console.error("Install called without signature or typedData.")
      return
    }

    setIsInstalling(true)
    setInstallResult(null)

    try {
      // 创建typedData对象

      // 构建新的API请求格式
      const requestData = {
        typedData,
        signature,
      }

      const response = await fetch("/api/install", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      })

      const data = await response.json()

      // --- 修复开始 ---

      if (!response.ok) {
        // 服务器返回了 500 错误
        if (data.result) {
          // 我们有步骤信息
          const failedStep = data.result.find((step) => !step.success)
          setInstallResult({
            title: t("installer.installationFailed"),
            description:
              failedStep?.error ||
              `Installation failed at "${failedStep?.step}"`,
            type: "error",
            steps: data.result, // <--- 直接使用 data.result
          })
        } else {
          // 500 错误，但没有 result 数组（例如其他服务器错误）
          throw new Error(data.message || "Installation failed")
        }
        return // 退出函数
      }

      // 既然 response.ok 为 true，我们知道所有步骤都成功了
      // (根据 install.mjs 的逻辑，不再需要检查 allStepsSuccessful)
      setInstallResult({
        title: t("installer.installationSuccessful"),
        description: t("installer.installationSuccessfulDescription"),
        type: "success",
        steps: data.result,
        node: data.node,
      })

      // 不再需要 'else' 块 (死代码)

      // --- 修复结束 ---
    } catch (error) {
      // 这个 catch 块现在只处理网络错误 (fetch 失败) 或 JSON 解析错误
      setInstallResult({
        title: t("installer.installationFailed"),
        description: error.message,
        type: "error",
        steps: null, // 我们在这里没有步骤信息
      })
    } finally {
      setIsInstalling(false)
    }
  }, [typedData, signature, t, installResult?.steps])

  // Navigation Handlers
  const getFieldsForStep = (step) => {
    switch (step) {
      case 0:
        return [
          "node.address",
          "node.url",
          "node.title",
          "node.description",
          "node.avatar",
        ]
      case 1:
        return [
          "settings.defaultLanguage",
          "settings.defaultTheme",
          "settings.walletConnectProjectId",
          "settings.mailTransport",
          "settings.mailFrom",
        ]
      default:
        return []
    }
  }

  const handleNextClick = async () => {
    const fieldsToValidate = getFieldsForStep(steps.value)
    const isValid = await form.trigger(fieldsToValidate)
    if (isValid) {
      steps.goToNextStep()
    } else {
      toaster.create({
        description: t("installer.formErrors"),
        type: "error",
      })
    }
  }

  const handleInstallClick = async () => {
    // Validate all fields first
    const isValid = await form.trigger()
    if (!isValid) {
      toaster.create({
        description: t("installer.formErrors"),
        type: "error",
      })
      return
    }

    setIsSigning(true)
    try {
      const { node, settings } = form.getValues()
      const td = installTypedData(node, settings, Math.floor(Date.now() / 1000))
      const sig = await signEIP712Data(td)

      // Set state and move to the final step
      setTypedData(td)
      setSignature(sig)
      steps.goToNextStep()
    } catch (e) {
      toaster.create({
        description: e.message,
        type: "error",
      })
    } finally {
      setIsSigning(false)
    }
  }

  const mailFromRequired =
    mailTransportValid || !!form.watch("settings.mailTransport")

  return (
    <Box>
      <Container maxW="6xl" py={10}>
        <VStack gap={8} align="stretch">
          <InstallHeader t={t} />

          <Steps.RootProvider value={steps} size="lg" colorPalette="orange">
            <Steps.List>
              {installSteps.map((step, index) => (
                <Steps.Item key={index} index={index}>
                  <Steps.Indicator />
                  <Steps.Title>{step.title}</Steps.Title>
                  <Steps.Separator />
                </Steps.Item>
              ))}
            </Steps.List>

            <Steps.Content index={0}>
              <StepNodeConfig form={form} t={t} />
            </Steps.Content>

            <Steps.Content index={1}>
              <StepAdvancedSettings
                form={form}
                t={t}
                languageCollection={languageCollection}
                themeCollection={themeCollection}
                defaultValues={defaultValues}
                validateMailTransport={validateMailTransport}
                mailTransportValidating={mailTransportValidating}
                mailTransportValid={mailTransportValid}
                mailFromRequired={mailFromRequired}
              />
            </Steps.Content>

            <Steps.Content index={2}>
              <StepReview form={form} t={t} />
            </Steps.Content>

            <Steps.CompletedContent>
              <Card.Root mt={8}>
                <Card.Body p={16}>
                  {isInstalling && <InstallProgress t={t} />}
                  {!isInstalling && installResult && (
                    <InstallResult t={t} installResult={installResult} />
                  )}
                </Card.Body>
              </Card.Root>
            </Steps.CompletedContent>

            <InstallNavigation
              steps={steps}
              t={t}
              onNextClick={handleNextClick}
              onInstallClick={handleInstallClick}
              isSigning={isSigning}
              isInstalling={isInstalling}
              installResult={installResult}
              mailTransportValidating={mailTransportValidating}
            />
          </Steps.RootProvider>
        </VStack>
        {isCheckingStatus && (
          <Box pos="absolute" inset="0" bg="bg/80">
            <Center h="full">
              <Spinner color="orange" size="lg" />
            </Center>
          </Box>
        )}
      </Container>
    </Box>
  )
}
