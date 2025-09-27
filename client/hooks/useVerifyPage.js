import { useMutation } from "@apollo/client/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { toaster } from "../components/ui/toaster"
import { CONFIRM_COMMENT, CONFIRM_COMMENT_DELETION } from "../graphql/mutations"
import { useTranslation } from "./useTranslation"

export function useVerifyPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { common, comment } = useTranslation()
  const token = typeof window !== "undefined" ? searchParams.get("token") : null

  // 状态管理
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [action, setAction] = useState(null)

  // GraphQL mutations
  const [confirmComment] = useMutation(CONFIRM_COMMENT)
  const [confirmCommentDeletion] = useMutation(CONFIRM_COMMENT_DELETION)

  // 解析 token 获取 action
  useEffect(() => {
    if (token) {
      try {
        // 解析 JWT token 的 payload（不验证签名，只获取信息）
        const payload = JSON.parse(atob(token.split(".")[1]))
        setAction(payload.action)
      } catch {
        setError("无效的验证链接")
      }
    } else {
      setError("缺少验证令牌")
    }
  }, [token])

  // 处理验证
  useEffect(() => {
    if (action && token && !isProcessing && !result && !error) {
      handleVerification()
    }
  }, [action, token, isProcessing, result, error])

  const handleVerification = async () => {
    if (!token || !action) return

    setIsProcessing(true)
    setError(null)

    try {
      let response

      if (action === "confirm") {
        // 统一端点：邮箱确认传递 tokenOrSignature（无需 id）
        response = await confirmComment({
          variables: { tokenOrSignature: token },
        })
      } else if (action === "destroy") {
        // 确认删除评论
        response = await confirmCommentDeletion({
          variables: { token },
        })
      } else {
        throw new Error("无效的操作类型")
      }

      if (response.error) {
        throw new Error(response.error.message || "验证失败")
      }

      const commentData =
        response.data[
          action === "confirm" ? "confirmComment" : "confirmCommentDeletion"
        ]
      setResult(commentData)

      // 显示成功消息
      if (action === "confirm") {
        toaster.create({
          description: comment.commentVerifySuccess(),
          type: "success",
        })
      } else {
        toaster.create({
          description: comment.commentDeleteSuccess(),
          type: "success",
        })
      }
    } catch (err) {
      // console.error('验证失败:', err);
      setError(err.message || "验证失败，请重试")

      toaster.create({
        description: err.message || common.pleaseRetry(),
        type: "error",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleViewPublication = (publicationId) => {
    if (publicationId) {
      if (action === "confirm") {
        // 确认评论时，跳转到评论区域
        router.push(`/publications/${publicationId}#comments`)
      } else {
        // 删除评论时，跳转到文章页面
        router.push(`/publications/${publicationId}`)
      }
    }
  }

  const handleGoHome = () => {
    router.push("/publications")
  }

  return {
    // 状态
    token,
    action,
    isProcessing,
    result,
    error,

    // 方法
    handleViewPublication,
    handleGoHome,
  }
}
