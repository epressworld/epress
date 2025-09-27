import { useMutation, useQuery } from "@apollo/client/react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { toaster } from "../components/ui/toaster"
import { AUTH_STATUS, useAuth } from "../contexts/AuthContext"
import {
  DESTROY_PUBLICATION,
  SIGN_PUBLICATION,
  UPDATE_PUBLICATION,
} from "../graphql/mutations"
import { FETCH } from "../graphql/queries"
import { statementOfSourceTypedData } from "../utils/eip712"
import { useTranslation } from "./useTranslation"
import { useWallet } from "./useWallet"

export function usePublicationDetail() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const publicationId = params.id
  const isEditMode = searchParams.get("edit") === "true"

  const { authStatus, isNodeOwner } = useAuth()
  const { signEIP712Data } = useWallet()
  const { common } = useTranslation()

  // 对话框状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false)
  const [signatureInfo, setSignatureInfo] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // GraphQL mutations
  const [signPublication] = useMutation(SIGN_PUBLICATION)
  const [destroyPublication] = useMutation(DESTROY_PUBLICATION)
  const [updatePublication] = useMutation(UPDATE_PUBLICATION)

  // 获取Publication详情
  const {
    data: publicationData,
    loading: publicationLoading,
    error: publicationError,
    refetch: refetchPublication,
  } = useQuery(FETCH, {
    variables: {
      type: "PUBLICATION",
      id: publicationId,
    },
    fetchPolicy: "cache-and-network",
  })

  const publication = publicationData?.fetch

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
      console.log(publication, "===================")
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
          description: common.fileUploadNotImplemented(),
          type: "warning",
        })
        return
      }

      await updatePublication({
        variables: { input },
        onCompleted: () => {
          toaster.create({
            title: "保存成功",
            description: common.contentUpdateSuccess(),
            type: "success",
          })
          // 刷新数据
          refetchPublication()
          // 退出编辑模式
          router.push(`/publications/${publicationId}`)
        },
        onError: (error) => {
          console.error("更新失败:", error)
          toaster.create({
            title: "保存失败",
            description: error.message || common.contentUpdateError(),
            type: "error",
          })
        },
      })
    } catch (error) {
      console.error("保存编辑时发生错误:", error)
      toaster.create({
        title: "保存失败",
        description: common.saveEditError(),
        type: "error",
      })
    }
  }

  // 签名Publication
  const handleSignPublication = async (publication) => {
    if (authStatus !== AUTH_STATUS.AUTHENTICATED || !isNodeOwner) {
      toaster.create({
        description: common.onlyNodeOwnerCanSign(),
        type: "error",
      })
      return
    }

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

      toaster.create({
        description: common.signSuccess(),
        type: "success",
      })

      // 重新获取数据
      refetchPublication()
    } catch (error) {
      console.error("签名失败:", error)
      toaster.create({
        description: error.message || common.pleaseRetry(),
        type: "error",
      })
    }
  }

  // 打开删除确认对话框
  const handleDeleteClick = () => {
    if (authStatus !== AUTH_STATUS.AUTHENTICATED || !isNodeOwner) {
      toaster.create({
        description: common.onlyNodeOwnerCanDelete(),
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
        description: common.deleteSuccess(),
        type: "success",
      })

      // 重定向到主页
      if (typeof window !== "undefined") {
        window.location.href = "/publications"
      }
    } catch (error) {
      console.error("删除失败:", error)
      toaster.create({
        description: error.message || common.pleaseRetry(),
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
    refetchPublication()
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
  }
}
