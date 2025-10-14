import { useMutation, useSuspenseQuery } from "@apollo/client/react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { toaster } from "@/components/ui/toaster"
import { AUTH_STATUS, useAuth } from "@/contexts/AuthContext"
import {
  CREATE_PUBLICATION,
  DESTROY_PUBLICATION,
  FETCH,
  SIGN_PUBLICATION,
  UPDATE_PUBLICATION,
} from "@/lib/apollo"
import { statementOfSourceTypedData } from "@/utils/helpers"
import { useIntl } from "../utils"
import { useWallet } from "."

export function usePublicationItem(options = {}) {
  const { variables } = options
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const publicationId = params.id
  const isEditMode = searchParams.get("edit") === "true"

  const { authStatus, isNodeOwner } = useAuth()
  const { signEIP712Data } = useWallet()
  const { t } = useIntl()

  // 对话框状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false)
  const [signatureInfo, setSignatureInfo] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [loading, setLoading] = useState(false)

  // GraphQL mutations
  const [signPublication] = useMutation(SIGN_PUBLICATION)
  const [destroyPublication] = useMutation(DESTROY_PUBLICATION)
  const [updatePublication] = useMutation(UPDATE_PUBLICATION)
  const [createPublication] = useMutation(CREATE_PUBLICATION)

  // 获取Publication详情
  const {
    data: publicationData,
    error: publicationError,
    refetch: refetchPublication,
  } = useSuspenseQuery(FETCH, {
    variables,
    fetchPolicy: "cache-and-network",
    nextFetchPolicy: "cache-and-network",
  })

  const publication = publicationData?.fetch || null
  const publicationLoading = loading && !publicationData

  // 处理编辑
  const handleEdit = (publication) => {
    router.push(`/publications/${publication.id}?edit=true`)
  }

  // 取消编辑
  const handleCancelEdit = () => {
    router.push(`/publications/${publicationId}`)
  }

  // 保存编辑
  const handleSaveEdit = async (editData) => {
    try {
      const { id, content, file } = editData

      // 构建更新输入 - 服务器端只接受 id 和 body
      const input = {
        id: id,
        body: content, // 直接传递 body 内容
      }
      if (publication.content.type === "FILE") {
        delete input.body
        input.description = content
      }

      // 如果有新文件，需要先上传文件
      if (file) {
        // TODO: 实现文件上传逻辑
        // 这里需要调用文件上传API
        toaster.create({
          title: "功能限制",
          description: t("common")("fileUploadNotImplemented"),
          type: "warning",
        })
        return
      }

      await updatePublication({
        variables: { input },
        onCompleted: () => {
          toaster.create({
            title: "保存成功",
            description: t("common")("contentUpdateSuccess"),
            type: "success",
          })
          // 刷新数据
          setLoading(true)
          refetchPublication().finally(() => setLoading(false))
          // 退出编辑模式
          router.push(`/publications/${publicationId}`)
        },
        onError: (error) => {
          console.error("更新失败:", error)
          toaster.create({
            title: "保存失败",
            description: error.message || t("common")("contentUpdateError"),
            type: "error",
          })
        },
      })
    } catch (error) {
      console.error("保存编辑时发生错误:", error)
      toaster.create({
        title: "保存失败",
        description: t("common")("saveEditError"),
        type: "error",
      })
    }
  }

  // 签名Publication
  const handleSignPublication = async (publication) => {
    if (authStatus !== AUTH_STATUS.AUTHENTICATED || !isNodeOwner) {
      toaster.create({
        description: t("common")("onlyNodeOwnerCanSign"),
        type: "error",
      })
      return
    }
    const toasterId = `signing-${publication.id}`
    toaster.loading({
      id: toasterId,
      description: "Signing...",
    })
    try {
      // 创建EIP-712签名数据
      const typedData = statementOfSourceTypedData(
        publication.content.content_hash,
        publication.author.address,
        Math.floor(new Date(publication.created_at).getTime() / 1000), // 使用 publication 的创建时间
      )
      // 使用钱包签名
      const signature = await signEIP712Data(typedData)

      // 提交签名到服务器
      await signPublication({
        variables: {
          id: publication.id,
          signature,
        },
      })

      toaster.update(toasterId, {
        description: t("common")("signSuccess"),
        type: "success",
      })

      // 重新获取数据
      setLoading(true)
      refetchPublication().finally(() => setLoading(false))
    } catch (error) {
      console.error("签名失败:", error)
      toaster.update(toasterId, {
        description: error.message || t("common")("pleaseRetry"),
        type: "error",
      })
    }
  }

  // 打开删除确认对话框
  const handleDeleteClick = () => {
    if (authStatus !== AUTH_STATUS.AUTHENTICATED || !isNodeOwner) {
      toaster.create({
        description: t("common")("onlyNodeOwnerCanDelete"),
        type: "error",
      })
      return
    }

    setDeleteDialogOpen(true)
  }

  // 确认删除Publication
  const handleConfirmDelete = async () => {
    if (!publication) return

    setIsDeleting(true)
    try {
      await destroyPublication({
        variables: {
          id: publication.id,
        },
      })

      toaster.create({
        description: t("common")("deleteSuccess"),
        type: "success",
      })

      // 重定向到主页
      if (typeof window !== "undefined") {
        window.location.href = "/publications"
      }
    } catch (error) {
      console.error("删除失败:", error)
      toaster.create({
        description: error.message || t("common")("pleaseRetry"),
        type: "error",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // 显示签名信息
  const handleShowSignature = (publication) => {
    const info = `内容哈希: ${publication.content.content_hash}
签名: ${publication.signature}`
    setSignatureInfo(info)
    setSignatureDialogOpen(true)
  }

  // 刷新评论列表和publication数据
  const handleCommentCreated = () => {
    setRefreshKey((prev) => prev + 1)
    // 重新获取publication数据以更新评论总数
    setLoading(true)
    refetchPublication().finally(() => setLoading(false))
  }

  // 处理引用发布（仅文本发布）
  const handlePublish = async (formData) => {
    if (authStatus !== AUTH_STATUS.AUTHENTICATED || !isNodeOwner) {
      toaster.create({
        description: t("common")("onlyNodeOwnerCanPublish"),
        type: "error",
      })
      return
    }

    try {
      let mode = formData.mode
      if (typeof mode === "object" && mode !== null) {
        mode = mode.value || mode.toString() || "post"
      }
      mode = String(mode || "post")

      const input = {
        type: mode.toUpperCase(),
        body: formData.content,
      }

      const { data } = await createPublication({
        variables: { input },
      })

      const newId = data?.createPublication?.id
      toaster.create({
        description: t("common")("publishSuccess"),
        type: "success",
      })

      if (newId) {
        router.push(`/publications/${newId}`)
      }
    } catch (error) {
      console.error("发布失败:", error)
      toaster.create({
        description: error.message || t("common")("pleaseRetry"),
        type: "error",
      })
    }
  }

  return {
    // 状态
    publicationId,
    isEditMode,
    publication,
    publicationLoading,
    publicationError,
    deleteDialogOpen,
    signatureDialogOpen,
    signatureInfo,
    isDeleting,
    refreshKey,
    authStatus,
    isNodeOwner,

    // 方法
    handleEdit,
    handleCancelEdit,
    handleSaveEdit,
    handleSignPublication,
    handleDeleteClick,
    handleConfirmDelete,
    handleShowSignature,
    handleCommentCreated,
    setDeleteDialogOpen,
    setSignatureDialogOpen,
    handlePublish,
  }
}
