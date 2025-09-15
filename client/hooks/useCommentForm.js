import { useMutation } from "@apollo/client/react"
import { useConnectModal } from "@rainbow-me/rainbowkit"
import { sha256 } from "js-sha256"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { useAccount } from "wagmi"
import { toaster } from "../components/ui/toaster"
import { usePage } from "../contexts/PageContext"
import { CREATE_COMMENT } from "../graphql/mutations"
import { commentSignatureTypedData } from "../utils/eip712"
import { useTranslation } from "./useTranslation"
import { useWallet } from "./useWallet"

export function useCommentForm(publicationId, onCommentCreated) {
  const { profile } = usePage()
  const { signEIP712Data } = useWallet()
  const { comment, common } = useTranslation()
  const { openConnectModal } = useConnectModal()

  // 直接使用wagmi的hooks获取最新状态
  const { address, isConnected } = useAccount()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isWaitingForWallet, setIsWaitingForWallet] = useState(false)
  const [walletConnectionTimeout, setWalletConnectionTimeout] = useState(null)
  const [authType, setAuthType] = useState("EMAIL") // 默认值，稍后根据连接状态更新

  // 使用react-hook-form
  const commentForm = useForm({
    defaultValues: {
      username: "",
      email: "",
      body: "",
      authType: isConnected ? "ETHEREUM" : "EMAIL",
    },
  })

  // GraphQL mutations
  const [createComment] = useMutation(CREATE_COMMENT)

  // 监听钱包连接状态变化，设置默认认证方式
  useEffect(() => {
    if (isConnected) {
      setAuthType("ETHEREUM")
      commentForm.setValue("authType", "ETHEREUM")
    } else {
      setAuthType("EMAIL")
      commentForm.setValue("authType", "EMAIL")
    }
  }, [isConnected]) // 监听 isConnected 变化

  // 监听钱包连接状态，清除等待状态
  useEffect(() => {
    if (isConnected && isWaitingForWallet) {
      setIsWaitingForWallet(false)
      // 清除超时定时器
      if (walletConnectionTimeout) {
        clearTimeout(walletConnectionTimeout)
        setWalletConnectionTimeout(null)
      }
    }
  }, [isConnected, isWaitingForWallet, walletConnectionTimeout])

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (walletConnectionTimeout) {
        clearTimeout(walletConnectionTimeout)
      }
    }
  }, [walletConnectionTimeout])

  // 处理认证方式切换
  const handleAuthTypeChange = (e) => {
    const newAuthType = e.value
    setAuthType(newAuthType)
    commentForm.setValue("authType", newAuthType)

    // 如果选择以太坊认证但钱包未连接，立即触发钱包连接
    if (newAuthType === "ETHEREUM" && !isConnected) {
      setIsWaitingForWallet(true)
      openConnectModal?.()
      toaster.create({
        description: common.pleaseConnectWallet(),
        type: "info",
      })

      // 设置超时，如果30秒内没有连接成功，自动回退到邮箱认证
      const timeout = setTimeout(() => {
        if (!isConnected) {
          setIsWaitingForWallet(false)
          commentForm.setValue("authType", "EMAIL")
          toaster.create({
            description: "钱包连接超时，已切换到邮箱认证",
            type: "warning",
          })
        }
      }, 30000) // 30秒超时

      setWalletConnectionTimeout(timeout)
    } else if (newAuthType === "EMAIL") {
      // 如果切换到邮箱认证，清除等待状态和超时
      setIsWaitingForWallet(false)
      if (walletConnectionTimeout) {
        clearTimeout(walletConnectionTimeout)
        setWalletConnectionTimeout(null)
      }
    }
  }

  // 表单提交处理
  const handleSubmit = async (data) => {
    setIsSubmitting(true)

    try {
      const input = {
        publication_id: publicationId,
        body: data.body,
        commenter_username: data.username,
        auth_type: data.authType,
      }

      // 根据认证类型添加相应字段
      if (data.authType === "EMAIL") {
        input.commenter_email = data.email
      } else if (data.authType === "ETHEREUM") {
        if (!address) {
          // 如果选择以太坊认证但钱包未连接，提示用户先连接钱包
          toaster.create({
            description: common.pleaseConnectWallet(),
            type: "warning",
          })
          return { success: false, error: new Error("请先连接钱包") }
        }
        if (!profile?.address) {
          throw new Error("节点地址未获取到，请刷新页面重试")
        }

        // 生成评论内容的哈希
        const commentBodyHash = `0x${sha256(data.body)}`

        // 创建EIP-712类型化数据
        const typedData = commentSignatureTypedData(
          profile.address, // 节点地址
          address, // 评论者地址
          parseInt(publicationId, 10), // 发布ID
          commentBodyHash, // 评论内容哈希
        )

        // 使用钱包签名
        const signature = await signEIP712Data(typedData)

        input.commenter_address = address
        input.signature = signature
      }

      await createComment({
        variables: { input },
      })

      // 根据认证类型显示不同的成功消息
      if (data.authType === "EMAIL") {
        toaster.create({
          description: comment.commentSubmitSuccess(),
          type: "success",
        })
      } else {
        toaster.create({
          description: comment.commentSubmitSuccessShort(),
          type: "success",
        })
      }

      // 重置表单
      commentForm.reset({
        username: "",
        email: "",
        body: "",
        authType: isConnected ? "ETHEREUM" : "EMAIL", // 根据当前钱包状态设置默认值
      })

      // 通知父组件刷新评论列表
      if (onCommentCreated) {
        onCommentCreated()
      }

      return { success: true }
    } catch (error) {
      console.error("提交评论失败:", error)
      toaster.create({
        description:
          error.message || `${common.submitFailed()}, ${common.pleaseRetry()}`,
        type: "error",
      })
      return { success: false, error }
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    commentForm,
    isSubmitting,
    isWaitingForWallet,
    authType,
    isConnected,
    handleAuthTypeChange,
    handleSubmit,
  }
}
