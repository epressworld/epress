"use client"
import { Button, Popover, Portal } from "@chakra-ui/react"
import { FaPlus } from "react-icons/fa"
import { useConnection } from "../../../hooks/useConnection"
import { useTranslation } from "../../../hooks/useTranslation"
import { NodeUrlInput } from "../../ui"
import { FollowAction, UnfollowAction } from ".."

const FollowButton = ({ ...props }) => {
  const { connection } = useTranslation()

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
            loadingText={connection.following()}
          >
            <FaPlus />
            {connection.follow()}
          </Button>
        )}
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content>
            <Popover.Arrow />
            <Popover.Body p={4}>
              <NodeUrlInput
                url={url}
                setUrl={setUrl}
                onFollow={handleFollow}
                onCancel={handleCancel}
                isLoading={isLoading}
              />
            </Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  )
}

export default FollowButton
