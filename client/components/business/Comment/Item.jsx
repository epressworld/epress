"use client"

import { useMutation } from "@apollo/client/react"
import {
  Avatar,
  Badge,
  Box,
  Button,
  Field,
  HStack,
  IconButton,
  Input,
  Link,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { FiTrash2 } from "react-icons/fi"
import { TbSignature } from "react-icons/tb"
import { AUTH_STATUS, useAuth } from "../../../contexts/AuthContext"
import { usePage } from "../../../contexts/PageContext"
import { DESTROY_COMMENT } from "../../../graphql/mutations"
import { useIntl } from "../../../hooks/useIntl"
import { useWallet } from "../../../hooks/useWallet"
import { deleteCommentTypedData } from "../../../utils/eip712"
import { ConfirmDialog, InfoDialog } from "../../ui"
import { toaster } from "../../ui/toaster"

export const CommentItem = ({
  comment,
  onCommentDeleted,
  isLocalPending = false,
  onRetrySignature,
}) => {
  const { authStatus, isNodeOwner } = useAuth()
  const { profile } = usePage()
  const { signEIP712Data } = useWallet()
  const [destroyComment] = useMutation(DESTROY_COMMENT)

  // i18n
  const { t, formatRelativeTime } = useIntl()

  // 对话框状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // 邮箱删除表单
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: "",
    },
  })

  // 处理删除点击
  const handleDeleteClick = () => {
    // 已登录的节点所有者直接删除，不需要验证
    if (authStatus === AUTH_STATUS.AUTHENTICATED && isNodeOwner) {
      setDeleteDialogOpen(true)
    } else {
      // 普通用户需要通过相应的验证方式
      if (comment.auth_type === "EMAIL") {
        setEmailDialogOpen(true)
      } else if (comment.auth_type === "ETHEREUM") {
        setDeleteDialogOpen(true)
      }
    }
  }

  // 确认删除（以太坊认证）
  const handleConfirmDelete = async () => {
    setIsDeleting(true)
    try {
      // 已登录的节点所有者可以直接删除，不需要签名
      if (authStatus === AUTH_STATUS.AUTHENTICATED && isNodeOwner) {
        await destroyComment({
          variables: {
            id: comment.id,
          },
        })
      } else {
        // 普通用户需要通过签名验证
        if (!profile?.address) {
          toaster.create({
            description: t("common")("nodeAddressNotAvailable"),
            type: "error",
          })
          return
        }

        // 使用profile查询获取的节点地址
        const nodeAddress = profile.address

        // 创建EIP-712类型化数据
        const typedData = deleteCommentTypedData(
          nodeAddress, // 节点地址
          parseInt(comment.id, 10), // 评论ID
          comment.author_id, // 评论者地址
        )

        // 使用钱包签名
        const signature = await signEIP712Data(typedData)

        await destroyComment({
          variables: {
            id: comment.id,
            signature: signature,
          },
        })
      }

      toaster.create({
        description: t("comment")("commentDeleteSuccess"),
        type: "success",
      })

      setDeleteDialogOpen(false)
      if (onCommentDeleted) {
        onCommentDeleted()
      }
    } catch (error) {
      console.error("删除评论失败:", error)
      toaster.create({
        description:
          error.message ||
          `${t("common")("deleteFailed")}, ${t("common")("pleaseRetry")}`,
        type: "error",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // 确认删除（邮箱认证）
  const handleEmailDelete = async (data) => {
    setIsDeleting(true)
    try {
      // 已登录的节点所有者可以直接删除，不需要邮箱验证
      if (authStatus === AUTH_STATUS.AUTHENTICATED && isNodeOwner) {
        await destroyComment({
          variables: {
            id: comment.id,
          },
        })

        toaster.create({
          description: t("comment")("commentDeleteSuccess"),
          type: "success",
        })
      } else {
        // 普通用户需要通过邮箱验证
        await destroyComment({
          variables: {
            id: comment.id,
            email: data.email,
          },
        })

        toaster.create({
          description: t("common")("deleteRequestSent"),
          type: "success",
        })
      }

      setEmailDialogOpen(false)
      reset()

      if (onCommentDeleted) {
        onCommentDeleted()
      }
    } catch (error) {
      console.error("删除评论失败:", error)
      toaster.create({
        description:
          error.message ||
          `${t("common")("deleteFailed")}, ${t("common")("pleaseRetry")}`,
        type: "error",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // 渲染用户信息
  const renderUserInfo = () => {
    if (comment.auth_type === "EMAIL") {
      return (
        <HStack gap={2}>
          <Avatar.Root size="sm">
            <Avatar.Fallback name={comment.author_name} />
          </Avatar.Root>
          <Text fontWeight="medium">{comment.author_name}</Text>
        </HStack>
      )
    } else if (comment.auth_type === "ETHEREUM") {
      // 检查是否是已知节点（通过commenter字段判断）
      const isKnownNode = comment.commenter?.url

      if (isKnownNode) {
        return (
          <HStack gap={2}>
            <Avatar.Root size="sm">
              <Avatar.Image
                src={
                  comment.commenter.url
                    ? `${comment.commenter.url}/ewp/avatar`
                    : undefined
                }
                alt={comment.commenter.title || comment.author_name}
              />
              <Avatar.Fallback
                name={comment.author_name || comment.commenter.title}
              />
            </Avatar.Root>
            <VStack gap={0} align="start">
              <Link
                href={comment.commenter.url}
                target="_blank"
                rel="noopener noreferrer"
                color="orange.500"
                fontWeight="medium"
                _hover={{ color: "orange.600" }}
              >
                {comment.author_name || comment.commenter.title}
              </Link>
              <Text fontSize="xs" color="gray.500" fontFamily="mono">
                {comment.author_id}
              </Text>
            </VStack>
          </HStack>
        )
      } else {
        return (
          <HStack gap={2}>
            <Avatar.Root size="sm">
              <Avatar.Fallback name={comment.author_name} />
            </Avatar.Root>
            <VStack gap={0} align="start">
              <Text fontWeight="medium">{comment.author_name}</Text>
              <Text fontSize="sm" color="gray.500" fontFamily="mono">
                {comment.author_id}
              </Text>
            </VStack>
          </HStack>
        )
      }
    }
    return null
  }

  return (
    <>
      <Box
        border="1px"
        borderColor="gray.100"
        borderRadius="md"
        className="group"
      >
        <VStack align="stretch">
          {/* 用户信息和操作按钮 */}
          <HStack justify="space-between" align="center">
            <HStack gap={3}>{renderUserInfo()}</HStack>

            {/* 悬停显示：本地待确认显示重试，其他显示删除 */}
            <Box
              opacity={0}
              pointerEvents="none"
              _groupHover={{ opacity: 1, pointerEvents: "auto" }}
              transition="opacity 0.2s ease-in-out"
            >
              {isLocalPending && onRetrySignature ? (
                <IconButton
                  size="sm"
                  variant="ghost"
                  colorPalette="orange"
                  aria-label={t("common")("reSign")}
                  title={t("common")("reSign")}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onRetrySignature()
                  }}
                >
                  <TbSignature />
                </IconButton>
              ) : (
                <IconButton
                  size="sm"
                  variant="ghost"
                  colorPalette="red"
                  onClick={handleDeleteClick}
                >
                  <FiTrash2 />
                </IconButton>
              )}
            </Box>
          </HStack>

          {/* 评论内容 */}
          <Text>{comment.body}</Text>

          {/* 时间和状态 */}
          <HStack gap={2} align="center" justify="space-between">
            <Text color="gray.500" fontSize="sm">
              {formatRelativeTime(comment.created_at)}
            </Text>

            {/* 评论状态（所有用户可见） */}
            <HStack gap={2} align="center">
              <Badge
                size="sm"
                colorPalette={
                  comment.status === "CONFIRMED" ? "green" : "orange"
                }
                variant="subtle"
              >
                {comment.status === "CONFIRMED"
                  ? t("status")("confirmed")
                  : t("status")("pending")}
              </Badge>
            </HStack>
          </HStack>
        </VStack>
      </Box>

      {/* 删除确认对话框（以太坊认证） */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title={t("dialog")("confirmDelete")}
        message={t("dialog")("deleteMessage")}
        confirmText={t("dialog")("confirmDeleteText")}
        cancelText={t("common")("cancel")}
        confirmColorPalette="red"
        isLoading={isDeleting}
      />

      {/* 邮箱输入对话框（邮箱认证） */}
      <InfoDialog
        isOpen={emailDialogOpen}
        onClose={() => {
          setEmailDialogOpen(false)
          reset()
        }}
        title={t("dialog")("confirmEmailDelete")}
        content={
          <form onSubmit={handleSubmit(handleEmailDelete)}>
            <VStack gap={4} align="stretch">
              <Text>{t("dialog")("emailDeleteMessage")}</Text>
              <Field.Root>
                <Field.Label>{t("dialog")("emailAddress")}</Field.Label>
                <Input
                  type="email"
                  {...register("email", {
                    required: t("dialog")("enterEmailAddress"),
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: t("dialog")("enterValidEmail"),
                    },
                  })}
                  placeholder={t("dialog")("emailPlaceholder")}
                />
                {errors.email && (
                  <Field.ErrorText>{errors.email.message}</Field.ErrorText>
                )}
              </Field.Root>
              <HStack justify="end" gap={2}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEmailDialogOpen(false)
                    reset()
                  }}
                >
                  {t("common")("cancel")}
                </Button>
                <Button type="submit" colorPalette="red" loading={isDeleting}>
                  {t("dialog")("confirmDeleteText")}
                </Button>
              </HStack>
            </VStack>
          </form>
        }
        showCloseButton={false}
        isPreformatted={false}
      />
    </>
  )
}
