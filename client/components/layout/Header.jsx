"use client"
import {
  Box,
  Button,
  Circle,
  Container,
  Float,
  Heading,
  HStack,
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
import { useOnlineVisitors } from "@/hooks/data"
import { useIntl } from "@/hooks/utils"
import { ConnectWalletButton, Link, NodeAvatar, SearchDialog } from "../ui"

// 1. 节点信息组件 (左侧)
// 负责显示头像、标题、描述，并处理加载和错误状态
const HeaderNodeInfo = ({
  profile,
  settings,
  isLoading,
  error,
  isAddressOnline,
  t,
}) => {
  return (
    <HStack gap={4} align="center" flex="1" minW={0}>
      <Box position="relative">
        <NodeAvatar
          node={profile}
          size="lg"
          className="header-avatar"
          cursor="pointer"
        />
        {/* 节点所有者在线状态指示器 */}
        {profile.address && isAddressOnline(profile.address) && (
          <Float placement="bottom-end" offsetX="1" offsetY="1">
            <Circle
              bg="green.500"
              size="12px"
              outline="0.2em solid"
              outlineColor="bg"
            />
          </Float>
        )}
      </Box>

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
                title={t("common.rssFeed")}
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
  )
}

// 2. 操作按钮组件 (右侧)
// 负责显示连接钱包、关注、登录、登出、设置等按钮
// 保持了与原版 renderButtons 完全一致的逻辑，以确保 'isNodeOwner' 和 'authStatus' 的渲染行为不变
const HeaderActions = ({
  authStatus,
  isNodeOwner,
  login,
  loginState,
  logout,
  settings,
  openSettings,
  useMenu,
  t,
}) => {
  const buttons = []

  // 添加ConnectWalletButton
  buttons.push(<ConnectWalletButton key="connect-wallet" />)

  // 根据认证状态显示按钮(只有节点所有者需要登录)
  switch (authStatus) {
    case AUTH_STATUS.UNAUTHENTICATED:
      // 未认证时,显示登录按钮(需要钱包连接)
      // isNodeOwner 异步加载为 true 后，此按钮才会显示，符合原逻辑
      if (isNodeOwner) {
        buttons.push(
          <Button
            key="login"
            size="xs"
            onClick={login}
            loading={loginState?.loading}
            colorPalette="orange"
          >
            <LuLogIn /> {t("auth.login")}
          </Button>,
        )
      } else {
        if (settings?.allowFollow) {
          buttons.push(<FollowButton key="follow" size={"xs"} />)
        }
      }
      break

    case AUTH_STATUS.AUTHENTICATED:
      // 已认证时,显示设置和登出按钮
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
                    {t("auth.settings")}
                  </Menu.Item>
                  <Menu.Item value="logout" onClick={logout}>
                    <LuLogOut />
                    {t("auth.logout")}
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
            <LuSettings /> {t("auth.settings")}
          </Button>,
        )
        buttons.push(
          <Button key="logout" size="xs" onClick={logout} variant="outline">
            <LuLogOut /> {t("auth.logout")}
          </Button>,
        )
      }
      break

    default:
      // 加载中时且不是节点所有者，显示FollowButton
      if (settings?.allowFollow && !isNodeOwner) {
        buttons.push(<FollowButton key="follow" size={"xs"} />)
      }
      break
  }

  return (
    <HStack gap={useMenu ? 1 : 2} className="header-actions" flexShrink={0}>
      {buttons}
    </HStack>
  )
}

// 3. 导航Tabs组件
// 负责显示 "内容" 和 "连接" 标签页，以及搜索按钮，并处理滚动隐藏动画
const HeaderTabs = ({ shouldShowTabs, currentTab, router, t, openSearch }) => {
  // 标签点击处理
  const handleTabClick = useCallback(
    (path) => {
      router.push(path)
    },
    [router],
  )

  return (
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
            <Tabs.List borderBottom={0}>
              <Tabs.Trigger
                value="content"
                className="header-tab-button"
                onClick={() => handleTabClick("/publications")}
              >
                <LuFileText />
                {t("navigation.content")}
              </Tabs.Trigger>
              <Tabs.Trigger
                value="connections"
                className="header-tab-button"
                onClick={() => handleTabClick("/connections")}
              >
                <LuUsers />
                {t("navigation.connections")}
              </Tabs.Trigger>
            </Tabs.List>
          </Tabs.Root>
          <Float placement={"middle-end"} offsetX={{ md: 12, base: 8 }}>
            <Button key="search" size="xs" onClick={openSearch} variant="ghost">
              <LuSearch />
            </Button>
          </Float>
        </Container>
      </Box>
    </motion.div>
  )
}

// 4. 主 Header 组件
// 负责状态管理、数据获取和协调子组件
export const Header = () => {
  // --- Hooks: 数据获取 ---
  const {
    authStatus,
    isNodeOwner,
    isWalletConnected,
    login,
    loginState,
    logout,
  } = useAuth()
  const {
    profile = {},
    settings = {},
    loading: nodeLoading,
    error,
    errorDetails,
  } = usePage()
  const { t } = useIntl()
  const { isAddressOnline } = useOnlineVisitors()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const [{ y: scrollY }] = useWindowScroll()

  // --- State: 对话框状态 ---
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const openSearch = useCallback(() => setIsSearchOpen(true), [])
  const closeSearch = useCallback(() => setIsSearchOpen(false), [])

  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const openSettings = useCallback(() => setIsSettingsOpen(true), [])
  const closeSettings = useCallback(() => setIsSettingsOpen(false), [])

  // --- Memos: 衍生状态计算 ---

  // 搜索关键词
  const currentKeyword = searchParams.get("q") || ""

  // 响应式断点
  const useMenu = useBreakpointValue({
    base: true, // 移动端使用Menu
    sm: false, // 小屏幕及以上使用按钮
  })

  // 节点加载状态 (避免在已有数据时仍显示加载)
  const isLoading = useMemo(
    () => nodeLoading && !profile.title,
    [nodeLoading, profile.title],
  )

  // 滚动状态 (控制Tabs显隐)
  const shouldShowTabs = scrollY < 100 // 滚动超过100px时开始隐藏

  // 当前激活的Tab
  const currentTab = useMemo(() => {
    if (pathname.startsWith("/connections")) {
      return "connections"
    }
    return "content"
  }, [pathname])

  // --- Effect: 错误日志 ---
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

  // --- Render ---
  return (
    <>
      {/* 搜索对话框 (Portal) */}
      <SearchDialog
        isOpen={isSearchOpen}
        onClose={closeSearch}
        initialKeyword={currentKeyword}
      />

      {/* 顶部主 Header 栏 */}
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
            {/* 左侧：节点信息 */}
            <HeaderNodeInfo
              profile={profile}
              settings={settings}
              isLoading={isLoading}
              error={error}
              errorDetails={errorDetails}
              isAddressOnline={isAddressOnline}
              t={t}
            />

            {/* 右侧：操作按钮 */}
            <HeaderActions
              authStatus={authStatus}
              isNodeOwner={isNodeOwner}
              isWalletConnected={isWalletConnected}
              login={login}
              loginState={loginState}
              logout={logout}
              settings={settings}
              openSettings={openSettings}
              useMenu={useMenu}
              t={t}
            />
          </HStack>
        </Container>
      </Box>

      {/* 导航 Tabs 栏 (带动画) */}
      <HeaderTabs
        shouldShowTabs={shouldShowTabs}
        currentTab={currentTab}
        router={router}
        t={t}
        openSearch={openSearch}
      />

      {/* 设置对话框 (Portal) */}
      <SettingsDialog isOpen={isSettingsOpen} onClose={closeSettings} />
    </>
  )
}
