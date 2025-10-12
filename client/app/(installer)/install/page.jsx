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
  Link,
  Progress,
  Select,
  Spinner,
  Stack,
  Steps,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { FaGithub, FaHome } from "react-icons/fa"
import { FaEthereum } from "react-icons/fa6"
import { GrClose, GrInstall, GrNext, GrPrevious } from "react-icons/gr"
import { useAccount } from "wagmi"

const installSteps = [
  {
    title: "Node Configuration",
    description: "Configure your epress node profile",
  },
  {
    title: "Advanced Settings",
    description: "Optional mail, WalletConnect and other settings",
  },
  {
    title: "Review & Install",
    description: "Review your configuration and complete installation",
  },
]

const getOrigin = () => {
  if (typeof window !== "undefined") {
    return window.location.origin
  }
  return ""
}

export default function InstallPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [isCheckingStatus, setIsCheckingStatus] = useState(true)
  const [isInstalling, setIsInstalling] = useState(false)
  const [installResult, setInstallResult] = useState(null)
  const { address } = useAccount()
  const fileInputRef = useRef(null)

  const defaultValues = {
    node: {
      address: "",
      url: "",
      title: "My ePress Node",
      description: "Personal publishing node",
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

  const form = useForm({ defaultValues })

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
      alert("Please select an image file")
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert("Image size should be less than 2MB")
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

  const handleStepChange = async (e) => {
    // Validate current step
    const fieldsToValidate = getFieldsForStep(currentStep)
    const isValid = await form.trigger(fieldsToValidate)

    if (!isValid) {
      return
    }
    setCurrentStep(e.step)
    if (e.step === installSteps.length) {
      performInstall()
    }
  }

  const performInstall = async () => {
    const isValid = await form.trigger()
    if (!isValid) {
      return
    }
    setIsInstalling(true)

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
        title: "Installation Successful",
        description: "Your epress node has been configured successfully!",
        type: "success",
      })
    } catch (error) {
      setInstallResult({
        title: "Installation Failed",
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
        return []
      case 2:
        return []
      default:
        return []
    }
  }

  const languageCollection = createListCollection({
    items: [
      { label: "English", value: "en" },
      { label: "中文", value: "zh" },
    ],
  })

  const themeCollection = createListCollection({
    items: [
      { label: "Light", value: "light" },
      { label: "Dark", value: "dark" },
    ],
  })

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
              <Heading size="2xl">Welcome to epress</Heading>
              <Text color="gray.600" fontSize="lg">
                {installSteps[currentStep]?.description ||
                  "Let's set up your epress node"}
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
                      <Field.Label>Node Avatar</Field.Label>
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
                        Click the avatar to upload an image (max 2MB)
                      </Field.HelperText>
                    </Field.Root>

                    <Field.Root
                      required
                      invalid={!!form.formState.errors.node?.address}
                    >
                      <Field.Label>
                        Node Address
                        <Field.RequiredIndicator />
                      </Field.Label>
                      <Group attached w="full">
                        <Input
                          {...form.register("node.address", {
                            required: "Node address is required",
                            pattern: {
                              value: /^0x[a-fA-F0-9]{40}$/,
                              message: "Invalid Ethereum address format",
                            },
                          })}
                          placeholder="0x..."
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
                        Node URL
                        <Field.RequiredIndicator />
                      </Field.Label>
                      <Input
                        {...form.register("node.url", {
                          required: "Node URL is required",
                          pattern: {
                            value: /^https?:\/\/.+/,
                            message: "Invalid URL format",
                          },
                        })}
                        placeholder="https://your-domain.blog"
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
                        Node Title
                        <Field.RequiredIndicator />
                      </Field.Label>
                      <Input
                        {...form.register("node.title", {
                          required: "Node title is required",
                        })}
                        placeholder="My ePress Node"
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
                        Node Description
                        <Field.RequiredIndicator />
                      </Field.Label>
                      <Textarea
                        {...form.register("node.description")}
                        placeholder="Personal publishing node"
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
                      <Field.Label>Default Language</Field.Label>
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
                              placeholder={"Default Language"}
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
                      <Field.Label>Default Theme</Field.Label>
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
                            <Select.ValueText placeholder={"Default Theme"} />
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
                        WalletConnect Project ID (Optional)
                      </Field.Label>
                      <Input
                        {...form.register("settings.walletConnectProjectId")}
                        placeholder="Enter your WalletConnect project ID"
                      />
                      <Field.HelperText>
                        Enter your unique Project ID from Wallet Connect to
                        enable secure wallet connections for your application.
                        get it free from{" "}
                        <Link target="_blank" href="https://reown.com">
                          Reown.com
                        </Link>
                      </Field.HelperText>
                      <Field.ErrorText />
                    </Field.Root>
                    <Field.Root>
                      <Field.Label>Mail Transport (Optional)</Field.Label>
                      <Input
                        {...form.register("settings.mailTransport")}
                        placeholder="smtp://user:pass@smtp.example.com"
                      />
                      <Field.HelperText>
                        SMTP connection string
                      </Field.HelperText>
                    </Field.Root>
                    <Field.Root>
                      <Field.Label>Mail From Address (Optional)</Field.Label>
                      <Input
                        {...form.register("settings.mailFrom")}
                        placeholder="no-reply@example.com"
                        type="email"
                      />
                      <Field.ErrorText />
                    </Field.Root>
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
                      <Text fontWeight="bold">Node Avatar:</Text>
                      <Avatar.Root size="2xl" mt={2}>
                        <Avatar.Fallback name={form.watch("node.title")} />
                        <Avatar.Image src={form.watch("node.avatar") || null} />
                      </Avatar.Root>
                      {!form.watch("node.avatar") && (
                        <Text color="gray.500" fontSize="sm" mt={1}>
                          No avatar uploaded
                        </Text>
                      )}
                    </Box>
                    <Box>
                      <Text fontWeight="bold">Node Address:</Text>
                      <Text>{form.watch("node.address")}</Text>
                    </Box>
                    <Box>
                      <Text fontWeight="bold">Node URL:</Text>
                      <Text>{form.watch("node.url")}</Text>
                    </Box>
                    <Box>
                      <Text fontWeight="bold">Node Title:</Text>
                      <Text>{form.watch("node.title")}</Text>
                    </Box>
                    <Box>
                      <Text fontWeight="bold">Node Description:</Text>
                      <Text>{form.watch("node.description")}</Text>
                    </Box>
                    <Box>
                      <Text fontWeight="bold">Default Language:</Text>
                      <Text>{form.watch("settings.defaultLanguage")}</Text>
                    </Box>
                    <Box>
                      <Text fontWeight="bold">Default Theme:</Text>
                      <Text>{form.watch("settings.defaultTheme")}</Text>
                    </Box>
                    <Box>
                      <Text fontWeight="bold">WalletConnect Project ID:</Text>
                      <Text>
                        {form.watch("settings.walletConnectProjectId") ||
                          "Not set"}
                      </Text>
                    </Box>
                    <Box>
                      <Text fontWeight="bold">Mail Transport:</Text>
                      <Text>
                        {form.watch("settings.mailTransport") || "Not set"}
                      </Text>
                      {!form.watch("settings.mailTransport") && (
                        <Alert.Root mt={1} status="warning">
                          <Alert.Indicator />
                          <Alert.Content>
                            Warning: Email sending functionality will be
                            unavailable if not configured.
                          </Alert.Content>
                        </Alert.Root>
                      )}
                    </Box>
                    <Box>
                      <Text fontWeight="bold">Mail From:</Text>
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
                        <Heading size="3xl">Installing...</Heading>
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
                          <Text>Please wait...</Text>
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
                          <FaHome /> Home
                        </Button>
                        <Button
                          variant={"subtle"}
                          onClick={(_e) => {
                            window.location.href =
                              "https://github.com/epressworld/awesome-nodes"
                          }}
                          mr={4}
                        >
                          <FaGithub /> Awesome Nodes
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
                  <Button colorPalette="orange">
                    Next <GrNext />
                  </Button>
                </Steps.NextTrigger>
              ) : (
                <Steps.NextTrigger asChild>
                  <Button loading={isInstalling} colorPalette="orange">
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
      </Container>
    </Box>
  )
}
