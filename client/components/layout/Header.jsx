"use client"
import {
  Box,
  Button,
  Container,
  Float,
  Heading,
  HStack,
  Link,
  Menu,
  Portal,
  Skeleton,
  Tabs,
  Text,
  useBreakpointValue,
  VStack,
} from "@chakra-ui/react"
import { useWindowScroll } from "@uidotdev/usehooks"
import { motion } from "motion/react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  LuEllipsis,
  LuFileText,
  LuLogIn,
  LuLogOut,
  LuRss,
  LuSearch,
  LuSettings,
  LuUsers,
} from "react-icons/lu"
import { FollowButton } from "@/components/features/connection"
import { SettingsDialog } from "@/components/features/settings"
import { AUTH_STATUS, useAuth } from "@/contexts/AuthContext"
import { usePage } from "@/contexts/PageContext"
import { useIntl } from "@/hooks/utils"
import { ConnectWalletButton, SearchDialog } from "../ui"
import { NodeAvatar } from "../ui/avatar"

export const Header = () => {
  const { authStatus, isNodeOwner, login, loginState, logout } = useAuth()
  const {
    profile = {},
    settings = {},
    loading: nodeLoading,
    error,
    errorDetails,
  } = usePage()
  const { t } = useIntl()
  const searchParams = useSearchParams()
  const currentKeyword = searchParams.get("q") || ""

  // 搜索对话框状态
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const openSearch = () => setIsSearchOpen(true)
  const closeSearch = () => setIsSearchOpen(false)

  // 检测屏幕尺寸，决定是否使用Menu
  const useMenu = useBreakpointValue({
    base: true, // 移动端使用Menu
    sm: false, // 小屏幕及以上使用按钮
  })

  // 使用 useMemo 稳定加载状态计算，避免不必要的重新渲染
  // 只有在真正加载中且没有节点信息时才显示加载状态
  const isLoading = useMemo(
    () => nodeLoading && !profile.title,
    [nodeLoading, profile.title],
  )

  // 监听错误状态，在控制台输出错误信息
  useEffect(() => {
    if (error && errorDetails.hasError) {
      console.error("Header: NodeContext error detected:", {
        error,
        errorDetails,
        profile,
        isNodeOwner,
        authStatus,
      })
    }
  }, [error, errorDetails, profile, isNodeOwner, authStatus])

  const pathname = usePathname()
  const router = useRouter()

  // 滚动监听
  const [{ y }] = useWindowScroll()

  // 使用 useState 管理对话框状态
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const openSettings = () => setIsSettingsOpen(true)
  const closeSettings = () => setIsSettingsOpen(false)

  // 计算 Tabs 栏的显示状态
  const shouldShowTabs = y < 100 // 滚动超过100px时开始隐藏

  // 根据当前路径确定选中的 Tab，使用 useMemo 避免重复计算
  const currentTab = useMemo(() => {
    if (pathname.startsWith("/connections")) {
      return "connections"
    }
    return "content"
  }, [pathname])

  // 渲染按钮组件的函数，使用 useCallback 避免重复创建
  const renderButtons = useCallback(() => {
    const buttons = []

    // 添加ConnectWalletButton
    buttons.push(<ConnectWalletButton key="connect-wallet" />)

    if (!isNodeOwner && settings?.allowFollow) {
      buttons.push(<FollowButton key="follow" size={"xs"} />)
    } else if (isNodeOwner) {
      // 如果是节点所有者，根据状态机显示按钮
      switch (authStatus) {
        case AUTH_STATUS.CONNECTED:
          buttons.push(
            <Button
              key="login"
              size="xs"
              onClick={login}
              loading={loginState?.loading}
              colorPalette="orange"
            >
              <LuLogIn /> {t("auth")("login")}
            </Button>,
          )
          break

        case AUTH_STATUS.AUTHENTICATED:
          if (useMenu) {
            // 小屏幕使用Menu
            buttons.push(
              <Menu.Root key="user-menu">
                <Menu.Trigger asChild>
                  <Button size="xs" variant="subtle">
                    <LuEllipsis />
                  </Button>
                </Menu.Trigger>
                <Portal>
                  <Menu.Positioner>
                    <Menu.Content>
                      <Menu.Item value="settings" onClick={openSettings}>
                        <LuSettings />
                        {t("auth")("settings")}
                      </Menu.Item>
                      <Menu.Item value="logout" onClick={logout}>
                        <LuLogOut />
                        {t("auth")("logout")}
                      </Menu.Item>
                    </Menu.Content>
                  </Menu.Positioner>
                </Portal>
              </Menu.Root>,
            )
          } else {
            // 大屏幕使用独立按钮
            buttons.push(
              <Button
                key="settings"
                size="xs"
                onClick={openSettings}
                variant="subtle"
              >
                <LuSettings /> {t("auth")("settings")}
              </Button>,
            )
            buttons.push(
              <Button key="logout" size="xs" onClick={logout} variant="outline">
                <LuLogOut /> {t("auth")("logout")}
              </Button>,
            )
          }
          break
        default:
          // 钱包未连接或加载中时，只显示ConnectWalletButton
          break
      }
    }

    return <HStack gap={useMenu ? 1 : 2}>{buttons}</HStack>
  }, [isNodeOwner, authStatus, login, logout, openSettings, useMenu])

  return (
    <>
      {/* 搜索对话框 */}
      <SearchDialog
        isOpen={isSearchOpen}
        onClose={closeSearch}
        initialKeyword={currentKeyword}
      />

      {/* Header 主要内容区域 */}
      <Box
        position="sticky"
        top={0}
        zIndex={1000}
        h="80px" // 固定高度
        bgColor={"rgba(247, 250, 252, 0.8)"}
        _dark={{ bgColor: "rgba(26, 32, 44, 0.8)", borderColor: "gray.600" }}
        backdropFilter="blur(10px)"
        borderBottom="1px solid"
        borderColor="gray.200"
        className="header-container"
      >
        <Container maxW="6xl">
          <HStack
            justify="space-between"
            align="center"
            py={4}
            className="header-main-content"
          >
            {/* 左侧：头像和标题信息 */}
            <HStack gap={4} align="center" flex="1" minW={0}>
              <Link href="/" _hover={{ textDecoration: "none" }}>
                <NodeAvatar
                  node={profile}
                  size="lg"
                  className="header-avatar"
                  cursor="pointer"
                />
              </Link>

              <VStack gap={0} align="start" flex="1" minW={0} maxW="100%">
                {isLoading ? (
                  <Skeleton height="24px" width="60%" />
                ) : error ? (
                  <VStack align="start" gap={1} w="full">
                    <Text size="sm" color="red.500" fontWeight="medium">
                      Error loading node data
                    </Text>
                    <Text size="xs" color="red.400" noOfLines={1}>
                      {error.message || "Unknown error"}
                    </Text>
                  </VStack>
                ) : (
                  <HStack gap={2} align="center" w="full">
                    <Link href="/" _hover={{ textDecoration: "none" }}>
                      <Heading
                        size="md"
                        className="header-title"
                        noOfLines={1}
                        cursor="pointer"
                        _hover={{ color: "orange.500" }}
                        transition="color 0.2s"
                      >
                        {profile.title || "Node"}
                      </Heading>
                    </Link>
                    {settings?.enableRSS && (
                      <Link
                        href="/feed"
                        target="_blank"
                        rel="noopener noreferrer"
                        title={t("common")("rssFeed")}
                        color="orange.500"
                        _hover={{ color: "orange.600" }}
                        transition="color 0.2s"
                      >
                        <LuRss size={18} />
                      </Link>
                    )}
                  </HStack>
                )}
                {isLoading ? (
                  <Skeleton height="16px" width="80%" mt="4px" />
                ) : error ? (
                  <Text size="xs" color="red.300" noOfLines={1} w="full">
                    Check console for details
                  </Text>
                ) : (
                  <Text
                    size="sm"
                    color={"gray.600"}
                    _dark={{ color: "gray.300" }}
                    className="header-description"
                    noOfLines={1}
                    w="full"
                    overflow="hidden"
                    textOverflow="ellipsis"
                    whiteSpace="nowrap"
                  >
                    {profile.description || "Node description"}
                  </Text>
                )}
              </VStack>
            </HStack>

            {/* 右侧：操作按钮 */}
            <HStack gap={2} className="header-actions" flexShrink={0}>
              {renderButtons()}
            </HStack>
          </HStack>
        </Container>
      </Box>

      {/* Tabs 栏 - 独立的组件，带滚动动画 */}
      <motion.div
        initial={{ y: 0 }}
        animate={{
          y: shouldShowTabs ? 0 : -60, // 向上移动60px，被Header遮住
        }}
        transition={{
          duration: 0.3,
          ease: "easeInOut",
        }}
        style={{
          position: "sticky",
          top: "80px", // Header的高度，让Tabs栏紧贴Header下方
          zIndex: 999,
          overflow: "hidden",
        }}
      >
        <Box
          bgColor={"rgba(237, 242, 247, 0.6)"}
          borderBottom="1px solid"
          borderColor="gray.200"
          _dark={{
            bgColor: "rgba(45, 55, 72, 0.6)",
            borderColor: "gray.600",
          }}
          className="header-tabs"
        >
          <Container maxW="6xl">
            <Tabs.Root value={currentTab}>
              <Tabs.List>
                <Tabs.Trigger
                  value="content"
                  className="header-tab-button"
                  onClick={() => {
                    // Content tab clicked
                    router.push("/publications")
                  }}
                >
                  <LuFileText />
                  {t("navigation")("content")}
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="connections"
                  className="header-tab-button"
                  onClick={() => {
                    // Connections tab clicked
                    router.push("/connections")
                  }}
                >
                  <LuUsers />
                  {t("navigation")("connections")}
                </Tabs.Trigger>
              </Tabs.List>
            </Tabs.Root>
            <Float placement={"middle-end"} offsetX={{ md: 12, base: 8 }}>
              <Button
                key="search"
                size="xs"
                onClick={openSearch}
                variant="ghost"
              >
                <LuSearch />
              </Button>
            </Float>
          </Container>
        </Box>
      </motion.div>

      {/* 设置对话框 */}
      <SettingsDialog isOpen={isSettingsOpen} onClose={closeSettings} />
    </>
  )
}
