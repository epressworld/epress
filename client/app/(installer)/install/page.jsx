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
  VStack,
} from "@chakra-ui/react"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { FaCheckCircle, FaGithub, FaHome } from "react-icons/fa"
import { FaEthereum } from "react-icons/fa6"
import { GrClose, GrInstall, GrNext, GrPrevious } from "react-icons/gr"
import { LuCircleAlert } from "react-icons/lu"
import { useAccount } from "wagmi"
import { Link } from "@/components/ui"
import { ConfirmDialog } from "@/components/ui/dialog/ConfirmDialog"

const getOrigin = () => {
  if (typeof window !== "undefined") {
    return window.location.origin
  }
  return ""
}

export default function InstallPage() {
  const t = useTranslations()
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [isCheckingStatus, setIsCheckingStatus] = useState(true)
  const [isInstalling, setIsInstalling] = useState(false)
  const [installResult, setInstallResult] = useState(null)
  const { address } = useAccount()
  const fileInputRef = useRef(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [mailTransportValidating, setMailTransportValidating] = useState(false)
  const [mailTransportValid, setMailTransportValid] = useState(null)

  // Define install steps with translations
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

  useEffect(() => {
    form.setValue("node.url", getOrigin())
  }, [])

  // Check if already installed
  useEffect(() => {
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
    form.setValue("node.address", address)
  }, [address])

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("installer.Please select an image file")
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert("installer.Image size should be less than 2MB")
      return
    }

    // Convert to data URL
    const reader = new FileReader()
    reader.onloadend = () => {
      const dataUrl = reader.result
      form.setValue("node.avatar", dataUrl)
    }
    reader.readAsDataURL(file)
  }

  // SMTP validation function
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
        headers: {
          "Content-Type": "application/json",
        },
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

  const handleStepChange = async (e) => {
    // Validate current step
    const fieldsToValidate = getFieldsForStep(currentStep)
    const isValid = await form.trigger(fieldsToValidate)

    if (!isValid) {
      return
    }
    setCurrentStep(e.step)
    if (e.step === installSteps.length) {
      await performInstall()
    }
  }

  const performInstall = async () => {
    setIsInstalling(true)
    const isValid = await form.trigger()
    if (!isValid) {
      return
    }

    await executeInstall()
    setIsInstalling(false)
  }

  const executeInstall = async () => {
    setShowConfirmDialog(false)

    try {
      const { node, settings } = form.getValues()

      // Structure data according to new API format
      const requestData = {
        node,
        settings,
      }

      const response = await fetch("/api/install", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Installation failed")
      }
      setInstallResult({
        title: t("installer.installationSuccessful"),
        description: t("installer.installationSuccessfulDescription"),
        type: "success",
      })
    } catch (error) {
      setInstallResult({
        title: t("installer.installationFailed"),
        description: error.message,
        type: "error",
      })
    } finally {
      setIsInstalling(false)
    }
  }

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
      case 2:
        return []
      default:
        return []
    }
  }

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
  const handleInstallClick = (e) => {
    // Check if mail is not configured and show confirmation dialog
    const { settings } = form.getValues()
    if (!settings.mailTransport || !settings.mailFrom) {
      e.preventDefault()
      setShowConfirmDialog(true)
      return
    }
  }
  const currentStepHasErrors = () => {
    const fieldsForCurrentStep = getFieldsForStep(currentStep)
    return fieldsForCurrentStep.some((field) => {
      const fieldError = field
        .split(".")
        .reduce((obj, key) => obj?.[key], form.formState.errors)
      return !!fieldError
    })
  }
  const handleNextClick = (e) => {
    if (currentStepHasErrors()) {
      e.preventDefault()
      return
    }
  }
  useEffect(() => {
    document.title = "Installer - epress"
  }, [])
  const mailFromRequired =
    mailTransportValid || !!form.watch("settings.mailTransport")

  return (
    <Box>
      <Container maxW="6xl" py={10}>
        <VStack gap={8} align="stretch">
          {/* Header */}
          <Box textAlign="center">
            <VStack gap={2}>
              <Box fontSize="4xl">
                <Link
                  href="https://github.com/epressworld/epress"
                  target="_blank"
                  rel="noopener noreferrer"
                  _hover={{ opacity: 0.8 }}
                >
                  <Image
                    src="/assets/logo-light.svg"
                    alt="epress logo"
                    width={48}
                  />
                </Link>
              </Box>
              <Heading size="2xl">{t("installer.welcome")}</Heading>
              <Text color="gray.600" fontSize="lg">
                {t("installer.welcomeDescription")}
              </Text>
            </VStack>
          </Box>

          {/* Steps Component */}
          <Steps.Root
            step={currentStep}
            onStepChange={handleStepChange}
            count={installSteps.length}
            size="lg"
            colorPalette="orange"
          >
            <Steps.List>
              {installSteps.map((step, index) => (
                <Steps.Item key={index} index={index}>
                  <Steps.Indicator />
                  <Steps.Title>{step.title}</Steps.Title>
                  <Steps.Separator />
                </Steps.Item>
              ))}
            </Steps.List>

            {/* Step 0: Node Configuration */}
            <Steps.Content index={0}>
              <Card.Root mt={8}>
                <Card.Header>
                  <Heading size="lg">{installSteps[0].title}</Heading>
                  <Text color="gray.600">{installSteps[0].description}</Text>
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
                          <Avatar.Fallback name={form.watch("node.title")} />
                          <Avatar.Image
                            src={form.watch("node.avatar") || null}
                            _hover={{ opacity: 0.8 }}
                          />
                        </Avatar.Root>
                      </Box>
                      <Field.HelperText>
                        {t("installer.nodeAvatarHelper")}
                      </Field.HelperText>
                    </Field.Root>

                    <Field.Root
                      required
                      invalid={!!form.formState.errors.node?.address}
                    >
                      <Field.Label>
                        {t("installer.nodeAddress")}
                        <Field.RequiredIndicator />
                      </Field.Label>
                      <Group attached w="full">
                        <Input
                          {...form.register("node.address", {
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
                            const ready =
                              mounted && authenticationStatus !== "loading"
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
                        {form.formState.errors.node?.address?.message}
                      </Field.ErrorText>
                    </Field.Root>

                    <Field.Root
                      required
                      invalid={!!form.formState.errors.node?.url}
                    >
                      <Field.Label>
                        {t("installer.nodeUrl")}
                        <Field.RequiredIndicator />
                      </Field.Label>
                      <Input
                        {...form.register("node.url", {
                          required: t("installer.nodeUrlRequired"),
                          pattern: {
                            value: /^https?:\/\/.+/,
                            message: t("installer.invalidUrl"),
                          },
                        })}
                        placeholder={t("installer.nodeUrlPlaceholder")}
                      />
                      <Field.ErrorText>
                        {form.formState.errors.node?.url?.message}
                      </Field.ErrorText>
                    </Field.Root>

                    <Field.Root
                      required
                      invalid={!!form.formState.errors.node?.title}
                    >
                      <Field.Label>
                        {t("installer.nodeTitle")}
                        <Field.RequiredIndicator />
                      </Field.Label>
                      <Input
                        {...form.register("node.title", {
                          required: t("installer.nodeTitleRequired"),
                        })}
                        placeholder={t("installer.nodeTitlePlaceholder")}
                      />
                      <Field.ErrorText>
                        {form.formState.errors.node?.title?.message}
                      </Field.ErrorText>
                    </Field.Root>

                    <Field.Root
                      required
                      invalid={!!form.formState.errors.node?.description}
                    >
                      <Field.Label>
                        {t("installer.nodeDescription")}
                        <Field.RequiredIndicator />
                      </Field.Label>
                      <Textarea
                        {...form.register("node.description")}
                        placeholder={t("installer.nodeDescriptionPlaceholder")}
                        rows={3}
                      />
                      <Field.ErrorText>
                        {form.formState.errors.node?.description?.message}
                      </Field.ErrorText>
                    </Field.Root>
                  </Stack>
                </Card.Body>
              </Card.Root>
            </Steps.Content>

            {/* Step 1: Advanced Settings */}
            <Steps.Content index={1}>
              <Card.Root mt={8}>
                <Card.Header>
                  <Heading size="lg">{installSteps[1].title}</Heading>
                  <Text color="gray.600">{installSteps[1].description}</Text>
                </Card.Header>
                <Card.Body>
                  <Stack gap={4}>
                    <Field.Root>
                      <Field.Label>
                        {t("installer.defaultLanguage")}
                      </Field.Label>
                      <Select.Root
                        defaultValue={[defaultValues.settings.defaultLanguage]}
                        collection={languageCollection}
                        onValueChange={(details) =>
                          form.setValue(
                            "settings.defaultLanguage",
                            details.value[0],
                          )
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
                          form.setValue(
                            "settings.defaultTheme",
                            details.value[0],
                          )
                        }
                      >
                        <Select.HiddenSelect />
                        <Select.Control>
                          <Select.Trigger>
                            <Select.ValueText
                              placeholder={t("installer.defaultTheme")}
                            />
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
                      <Field.Label>
                        {t("installer.walletConnectOptional")}
                      </Field.Label>
                      <Input
                        {...form.register("settings.walletConnectProjectId")}
                        placeholder={t(
                          "installer.walletConnectProjectIdPlaceholder",
                        )}
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

                    {/* Mail Server Settings Group */}
                    <VStack align="stretch" gap={4}>
                      <Text fontWeight="semibold" fontSize="md">
                        {t("installer.mailServerSettings")}
                      </Text>

                      <Field.Root
                        invalid={
                          !!form.formState.errors.settings?.mailTransport
                        }
                      >
                        <Field.Label>
                          {t("installer.mailTransportOptional")}
                        </Field.Label>
                        <InputGroup
                          endElement={
                            mailTransportValidating ? (
                              <Spinner size="sm" />
                            ) : mailTransportValid === true ? (
                              <FaCheckCircle color="green" size={20} />
                            ) : mailTransportValid === false ? (
                              <LuCircleAlert color="red" size={20} />
                            ) : null
                          }
                        >
                          <Input
                            {...form.register("settings.mailTransport", {
                              validate: validateMailTransport,
                            })}
                            placeholder={t(
                              "installer.mailTransportPlaceholder",
                            )}
                          />
                        </InputGroup>
                        <Field.HelperText>
                          {t("installer.mailTransportHelper")}
                        </Field.HelperText>
                        <Field.ErrorText>
                          {
                            form.formState.errors.settings?.mailTransport
                              ?.message
                          }
                        </Field.ErrorText>
                      </Field.Root>

                      <Field.Root
                        invalid={!!form.formState.errors.settings?.mailFrom}
                      >
                        <Field.Label>
                          {t("installer.mailFromOptional")}
                          <Field.RequiredIndicator />
                        </Field.Label>
                        <Input
                          {...form.register("settings.mailFrom", {
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
                          {form.formState.errors.settings?.mailFrom?.message}
                        </Field.ErrorText>
                      </Field.Root>
                    </VStack>
                  </Stack>
                </Card.Body>
              </Card.Root>
            </Steps.Content>

            {/* Step 2: Review & Install */}
            <Steps.Content index={2}>
              <Card.Root mt={8}>
                <Card.Header>
                  <Heading size="lg">{installSteps[2].title}</Heading>
                  <Text color="gray.600">{installSteps[2].description}</Text>
                </Card.Header>
                <Card.Body>
                  <Stack gap={4}>
                    <Box>
                      <Text fontWeight="bold">
                        {t("installer.nodeAvatar")}:
                      </Text>
                      <Avatar.Root size="2xl" mt={2}>
                        <Avatar.Fallback name={form.watch("node.title")} />
                        <Avatar.Image src={form.watch("node.avatar") || null} />
                      </Avatar.Root>
                      {!form.watch("node.avatar") && (
                        <Text color="gray.500" fontSize="sm" mt={1}>
                          {t("installer.nodeAvatarEmpty")}
                        </Text>
                      )}
                    </Box>
                    <Box>
                      <Text fontWeight="bold">
                        {t("installer.nodeAddress")}
                      </Text>
                      <Text>{form.watch("node.address")}</Text>
                    </Box>
                    <Box>
                      <Text fontWeight="bold">{t("installer.nodeUrl")}:</Text>
                      <Text>{form.watch("node.url")}</Text>
                    </Box>
                    <Box>
                      <Text fontWeight="bold">{t("installer.nodeTitle")}:</Text>
                      <Text>{form.watch("node.title")}</Text>
                    </Box>
                    <Box>
                      <Text fontWeight="bold">
                        {t("installer.nodeDescription")}:
                      </Text>
                      <Text>{form.watch("node.description")}</Text>
                    </Box>
                    <Box>
                      <Text fontWeight="bold">
                        {t("installer.defaultLanguage")}:
                      </Text>
                      <Text>{form.watch("settings.defaultLanguage")}</Text>
                    </Box>
                    <Box>
                      <Text fontWeight="bold">
                        {t("installer.defaultTheme")}:
                      </Text>
                      <Text>{form.watch("settings.defaultTheme")}</Text>
                    </Box>
                    <Box>
                      <Text fontWeight="bold">
                        {t("installer.walletConnectProjectId")}
                      </Text>
                      <Text>
                        {form.watch("settings.walletConnectProjectId") ||
                          "Not set"}
                      </Text>
                    </Box>
                    <Box>
                      <Text fontWeight="bold">
                        {t("installer.mailTransport")}:
                      </Text>
                      <Text>
                        {form.watch("settings.mailTransport") || "Not set"}
                      </Text>
                      {!form.watch("settings.mailTransport") && (
                        <Alert.Root mt={1} status="warning">
                          <Alert.Indicator />
                          <Alert.Content>
                            {t("installer.mailTransportEmptyWarning")}
                          </Alert.Content>
                        </Alert.Root>
                      )}
                    </Box>
                    <Box>
                      <Text fontWeight="bold">{t("installer.mailFrom")}:</Text>
                      <Text>
                        {form.watch("settings.mailFrom") || "Not set"}
                      </Text>
                    </Box>
                  </Stack>
                </Card.Body>
              </Card.Root>
            </Steps.Content>

            <Steps.CompletedContent>
              <Card.Root mt={8}>
                <Card.Body p={16}>
                  {isInstalling && (
                    <VStack gap={4}>
                      <Center>
                        <Heading size="3xl">
                          {t("installer.installing")}
                        </Heading>
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
                  )}
                  {installResult?.type === "success" && (
                    <VStack gap={4}>
                      <Center>
                        <Heading size="3xl">{installResult.title}</Heading>
                      </Center>
                      <Center fontSize="5xl" color="green">
                        <GrInstall />
                      </Center>
                      <Center>
                        <Box>
                          <Text>{installResult.description}</Text>
                        </Box>
                      </Center>
                      <Center>
                        <Button
                          onClick={(_e) => {
                            window.location.href = "/"
                          }}
                          variant={"subtle"}
                          mr={4}
                        >
                          <FaHome /> {t("installer.goToHomePage")}
                        </Button>
                        <Button
                          variant={"subtle"}
                          onClick={(_e) => {
                            window.location.href =
                              "https://github.com/epressworld/awesome-nodes"
                          }}
                          mr={4}
                        >
                          <FaGithub /> {t("installer.goToAwesomeNodes")}
                        </Button>
                      </Center>
                    </VStack>
                  )}
                  {!isInstalling && installResult?.type === "error" && (
                    <VStack gap={4}>
                      <Center>
                        <Heading size="3xl">{installResult.title}</Heading>
                      </Center>
                      <Center fontSize="5xl" color="red">
                        <GrClose />
                      </Center>
                      <Center>
                        <Box>
                          <Text>{installResult.description}</Text>
                        </Box>
                      </Center>
                    </VStack>
                  )}
                </Card.Body>
              </Card.Root>
            </Steps.CompletedContent>

            {/* Navigation Buttons */}
            <Stack direction="row" justify="space-between" mt={4}>
              <Steps.PrevTrigger asChild>
                <Button
                  disabled={
                    currentStep === 0 || installResult?.type === "success"
                  }
                  variant="outline"
                >
                  <GrPrevious />
                  Previous
                </Button>
              </Steps.PrevTrigger>

              {currentStep < installSteps.length - 1 ? (
                <Steps.NextTrigger asChild>
                  <Button
                    colorPalette="orange"
                    onClick={handleNextClick}
                    disabled={mailTransportValidating}
                  >
                    Next <GrNext />
                  </Button>
                </Steps.NextTrigger>
              ) : (
                <Steps.NextTrigger asChild>
                  <Button
                    loading={isInstalling}
                    onClick={handleInstallClick}
                    colorPalette="orange"
                  >
                    Install <GrInstall />
                  </Button>
                </Steps.NextTrigger>
              )}
            </Stack>
          </Steps.Root>
        </VStack>
        {isCheckingStatus && (
          <Box pos="absolute" inset="0" bg="bg/80">
            <Center h="full">
              <Spinner color="orange" size="lg" />
            </Center>
          </Box>
        )}
        <ConfirmDialog
          isOpen={showConfirmDialog}
          onClose={() => setShowConfirmDialog(false)}
          onConfirm={(_e) => {
            setCurrentStep(currentStep + 1)
            performInstall()
          }}
          title={t("installer.confirmInstallWithoutMail")}
          message={t("installer.confirmInstallWithoutMailMessage")}
          confirmText={t("installer.continueInstall")}
          cancelText={t("installer.goBackToConfig")}
          confirmColorPalette="red"
        />
      </Container>
    </Box>
  )
}
