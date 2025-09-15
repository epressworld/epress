import { useMutation } from "@apollo/client/react"
import { useConnectModal } from "@rainbow-me/rainbowkit"
import { useState } from "react"
import { useAccount } from "wagmi"
import { toaster } from "../components/ui/toaster"
import { useAuth } from "../contexts/AuthContext"
import { CREATE_CONNECTION, DESTROY_CONNECTION } from "../graphql/mutations"
import {
  createConnectionTypedData,
  deleteConnectionTypedData,
} from "../utils/eip712"
import { useTranslation } from "./useTranslation"
import { useWallet } from "./useWallet"

export function useConnection() {
  const { address } = useAccount()
  const { openConnectModal } = useConnectModal()
  const { signEIP712Data } = useWallet()
  const { profile, isFollower, refetchFollowerStatus, isNodeOwner } = useAuth()
  const { connection } = useTranslation()

  const [url, setUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  // 创建和删除连接的mutations
  const [createConnection] = useMutation(CREATE_CONNECTION)
  const [destroyConnection] = useMutation(DESTROY_CONNECTION)

  // 处理按钮点击
  const handleButtonClick = () => {
    if (!address) {
      openConnectModal?.()
      return
    }

    if (isFollower) {
      // 如果已经关注，直接取消关注
      handleUnfollow()
    } else {
      // 如果未关注，打开 Popover 让用户输入 URL
      setIsOpen(true)
    }
  }

  // 处理关注
  const handleFollow = async () => {
    if (!address) {
      openConnectModal?.()
      return
    }

    if (!url.trim()) {
      toaster.create({
        description: connection.enterNodeUrl(),
        type: "warning",
      })
      return
    }

    // 验证URL格式
    try {
      const urlObj = new URL(url)
      if (urlObj.protocol !== "https:" && urlObj.protocol !== "http:") {
        throw new Error(connection.mustBeHttpOrHttps())
      }
    } catch {
      toaster.create({
        description: connection.enterValidUrl(),
        type: "error",
      })
      return
    }

    // 检查是否有当前节点的profile信息
    if (!profile || !profile.address || !profile.url) {
      toaster.create({
        description: connection.cannotGetNodeInfo(),
        type: "error",
      })
      return
    }

    setIsLoading(true)
    try {
      const timestamp = Math.floor(Date.now() / 1000)
      const typedData = createConnectionTypedData(
        profile.address, // followeeAddress (当前节点地址)
        profile.url, // followeeUrl (当前节点URL)
        url, // followerUrl (用户输入的URL)
        timestamp,
      )
      const signature = await signEIP712Data(typedData)

      if (!signature) {
        toaster.create({
          description: connection.signatureFailed(),
          type: "error",
        })
        return
      }

      await createConnection({
        variables: {
          typedData,
          signature: signature,
        },
      })

      toaster.create({
        description: connection.followSuccess(url),
        type: "success",
      })

      // 重新查询关注状态
      refetchFollowerStatus()
      setIsOpen(false)
      setUrl("")
    } catch (error) {
      console.error("关注失败:", error)
      toaster.create({
        description: error.message || connection.followFailed(),
        type: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 处理取消关注
  const handleUnfollow = async () => {
    if (!address) return

    if (!profile || !profile.address) {
      toaster.create({
        description: connection.cannotGetNodeInfo(),
        type: "error",
      })
      return
    }

    setIsLoading(true)
    try {
      const timestamp = Math.floor(Date.now() / 1000)
      const typedData = deleteConnectionTypedData(
        profile.address, // followeeAddress (当前节点地址)
        address, // followerAddress (用户地址)
        timestamp,
      )

      const signature = await signEIP712Data(typedData)

      if (!signature) {
        toaster.create({
          description: connection.signatureFailed(),
          type: "error",
        })
        return
      }

      await destroyConnection({
        variables: {
          typedData,
          signature: signature,
        },
      })

      toaster.create({
        description: connection.unfollowSuccess(),
        type: "success",
      })

      // 重新查询关注状态
      refetchFollowerStatus()
      setIsOpen(false)
    } catch (error) {
      console.error("取消关注失败:", error)
      toaster.create({
        description: error.message || connection.unfollowFailed(),
        type: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return {
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
    handleUnfollow,
  }
}
