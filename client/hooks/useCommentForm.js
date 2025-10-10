import { useMutation } from "@apollo/client/react"
import { useConnectModal } from "@rainbow-me/rainbowkit"
import { sha256 } from "js-sha256"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { useAccount } from "wagmi"
import { toaster } from "../components/ui/toaster"
import { usePage } from "../contexts/PageContext"
import { CONFIRM_COMMENT, CREATE_COMMENT } from "../graphql/mutations"
import { commentSignatureTypedData } from "../utils/eip712"
import { useTranslation } from "./useTranslation"
import { useWallet } from "./useWallet"

export function useCommentForm(
  publicationId,
  onCommentCreated,
  onPendingChange,
) {
  const { profile } = usePage()
  const { signEIP712Data } = useWallet()
  const { comment, common, connection } = useTranslation()
  const { openConnectModal } = useConnectModal()

  // 直接使用wagmi的hooks获取最新状态
  const { address, isConnected } = useAccount()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isWaitingForWallet, setIsWaitingForWallet] = useState(false)
  const [walletConnectionTimeout, setWalletConnectionTimeout] = useState(null)
  const [authType, setAuthType] = useState("EMAIL") // 默认值，稍后根据连接状态更新
  const [isConfirming, setIsConfirming] = useState(false)
  const [pendingComment, setPendingComment] = useState(null) // { id, body, publicationId, commenterAddress }

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
  const [confirmComment] = useMutation(CONFIRM_COMMENT)

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
        author_name: data.username,
        auth_type: data.authType,
      }

      // 根据认证类型添加相应字段
      if (data.authType === "EMAIL") {
        input.author_id = data.email
      } else if (data.authType === "ETHEREUM") {
        // 两步流程：先创建为待确认评论，然后再触发钱包签名进行确认
        if (!address) {
          toaster.create({
            description: common.pleaseConnectWallet(),
            type: "warning",
          })
          return { success: false, error: new Error("请先连接钱包") }
        }
        if (!profile?.address) {
          throw new Error("节点地址未获取到，请刷新页面重试")
        }

        input.author_id = address
      }

      const createResp = await createComment({
        variables: { input },
      })

      const created = createResp?.data?.createComment

      // 根据认证类型显示不同的成功消息
      if (data.authType === "EMAIL") {
        toaster.create({
          description: comment.commentSubmitSuccess(),
          type: "success",
        })
      } else {
        // 以太坊：已创建为待确认，随后触发签名流程
        // 构造待确认上下文
        const ctx = {
          id: created?.id,
          body: created?.body || data.body,
          publicationId: parseInt(publicationId, 10),
          authorId: address,
          authorName: created?.author_name || data.username,
          status: created?.status || "PENDING",
          createdAt: created?.created_at,
          authType: "ETHEREUM",
        }
        // 保存待确认上下文，供后续签名重试按钮使用
        setPendingComment(ctx)
        // 通知外部待确认状态变更（用于列表显示和重试）
        if (onPendingChange) {
          onPendingChange(ctx, async () => {
            await confirmPendingComment({ skipToast: false, context: ctx })
          })
        }

        // 立即尝试进行签名确认（避免使用尚未更新的状态，直接传入上下文）
        await confirmPendingComment({ skipToast: false, context: ctx })
      }

      // 重置表单
      commentForm.reset({
        username: "",
        email: "",
        body: "",
        authType: isConnected ? "ETHEREUM" : "EMAIL", // 根据当前钱包状态设置默认值
      })

      // 邮箱认证：创建后立即刷新一次；以太坊认证：确认后再刷新
      if (onCommentCreated && data.authType === "EMAIL") {
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

  // 重新触发钱包签名并确认待确认评论
  const confirmPendingComment = async ({ skipToast, context } = {}) => {
    const ctx = context || pendingComment
    if (!ctx) return
    if (!profile?.address) {
      toaster.create({
        description: connection.cannotGetNodeInfo(),
        type: "error",
      })
      return
    }
    if (!ctx.authorId) {
      toaster.create({
        description: common.pleaseConnectWallet(),
        type: "warning",
      })
      openConnectModal?.()
      return
    }

    try {
      setIsConfirming(true)

      // 生成评论内容哈希并构造EIP-712数据
      const commentBodyHash = `0x${sha256(ctx.body)}`
      const timestampSec = Math.floor(new Date(ctx.createdAt).getTime() / 1000)
      const typedData = commentSignatureTypedData(
        profile.address,
        ctx.authorId,
        ctx.publicationId,
        commentBodyHash,
        timestampSec,
      )

      const signature = await signEIP712Data(typedData)
      if (!signature) {
        toaster.create({ description: common.signFailed(), type: "error" })
        return
      }

      // 调用确认评论的Mutation
      const _resp = await confirmComment({
        variables: { id: ctx.id, tokenOrSignature: signature },
      })

      if (!skipToast) {
        toaster.create({
          description: comment.commentSubmitSuccess(),
          type: "success",
        })
      }

      // 清除待确认状态
      setPendingComment(null)
      if (onPendingChange) {
        onPendingChange(null, null)
      }

      // 再次刷新评论列表（确认后刷新）
      if (onCommentCreated) {
        onCommentCreated()
      }
    } catch (error) {
      console.error("确认评论签名失败:", error)
      toaster.create({
        description: error.message || common.pleaseRetry(),
        type: "error",
      })
    } finally {
      setIsConfirming(false)
    }
  }

  return {
    commentForm,
    isSubmitting,
    isWaitingForWallet,
    isConfirming,
    authType,
    isConnected,
    handleAuthTypeChange,
    handleSubmit,
    pendingComment,
    confirmPendingComment,
  }
}
