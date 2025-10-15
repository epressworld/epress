"use client"
import {
  Button,
  HStack,
  Input,
  Popover,
  Portal,
  VStack,
} from "@chakra-ui/react"
import { FaPlus } from "react-icons/fa"
import { useConnection } from "@/hooks/data"
import { useIntl } from "@/hooks/utils"
import { FollowAction } from "./FollowAction"
import { UnfollowAction } from "./UnfollowAction"

export const FollowButton = ({ ...props }) => {
  const { t } = useIntl()

  const {
    address,
    isFollower,
    isNodeOwner,
    url,
    setUrl,
    isLoading,
    isOpen,
    setIsOpen,
    handleButtonClick,
    handleFollow,
  } = useConnection()

  const handleCancel = () => {
    setIsOpen(false)
    setUrl("")
  }

  // 如果是节点所有者，不显示关注按钮
  if (isNodeOwner) {
    return null
  }

  // 如果钱包未连接
  if (!address) {
    return <FollowAction onClick={handleButtonClick} {...props} />
  }

  // 统一的关注/取消关注按钮
  return (
    <Popover.Root open={isOpen && !isFollower} onOpenChange={setIsOpen}>
      <Popover.Trigger asChild>
        {isFollower ? (
          <UnfollowAction
            onClick={handleButtonClick}
            isLoading={isLoading}
            {...props}
          />
        ) : (
          <Button
            colorPalette="orange"
            {...props}
            onClick={handleButtonClick}
            loading={isLoading}
            loadingText={t("connection.following")}
          >
            <FaPlus />
            {t("connection.follow")}
          </Button>
        )}
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content>
            <Popover.Arrow />
            <Popover.Body p={4}>
              <VStack gap={4} align="stretch">
                <Input
                  placeholder={t("connection.enterNodeUrl")}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && url.trim()) {
                      handleFollow()
                    }
                  }}
                />
                <HStack justify="flex-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCancel}
                    disabled={isLoading}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleFollow}
                    loading={isLoading}
                    disabled={!url.trim()}
                  >
                    {t("connection.follow")}
                  </Button>
                </HStack>
              </VStack>
            </Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  )
}
