"use client"

import {
  Box,
  Button,
  HStack,
  Input,
  NativeSelect,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react"
import { FiMessageCircle } from "react-icons/fi"
import { useCommentForm } from "../../../hooks/useCommentForm"
import { useTranslation } from "../../../hooks/useTranslation"

export const CommentForm = ({
  publicationId,
  onCommentCreated,
  onPendingCommentChange,
}) => {
  const { comment, common, form } = useTranslation()

  const {
    commentForm,
    isSubmitting,
    isWaitingForWallet,
    isConfirming,
    authType,
    pendingComment,
    handleAuthTypeChange,
    handleSubmit,
    confirmPendingComment,
  } = useCommentForm(publicationId, onCommentCreated, onPendingCommentChange)

  // 默认认证方式：如果钱包已连接则选择以太坊，否则选择邮箱

  return (
    <Box>
      <Text fontSize="lg" fontWeight="semibold" mb={4}>
        {comment.publishComment()}
      </Text>

      <form onSubmit={commentForm.handleSubmit(handleSubmit)}>
        <VStack gap={4} align="stretch">
          {/* 第一行：认证方式选择、昵称输入、邮箱输入（如果是邮箱认证） */}
          <HStack
            gap={3}
            align="end"
            wrap={{ base: "wrap", md: "nowrap" }}
            justify={{ base: "stretch", md: "flex-start" }}
          >
            {/* 认证方式选择器 - 始终显示，让用户可以选择 */}
            <Box minW="120px" flex="0 0 auto">
              <NativeSelect.Root size="md">
                <NativeSelect.Field
                  value={authType}
                  onChange={(e) =>
                    handleAuthTypeChange({ value: e.target.value })
                  }
                >
                  <option value="EMAIL">{common.emailAuth()}</option>
                  <option value="ETHEREUM">{common.ethereumAuth()}</option>
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Box>

            {/* 昵称输入 */}
            <Box flex="1" minW="120px">
              <Input
                size="md"
                placeholder={common.nicknamePlaceholder()}
                error={commentForm.formState.errors.username?.message}
                {...commentForm.register("username", {
                  required: common.nicknameRequired(),
                })}
              />
            </Box>

            {/* 邮箱输入 - 仅在邮箱认证时显示 */}
            {authType === "EMAIL" && (
              <Box flex="1" minW="200px">
                <Input
                  size="md"
                  type="email"
                  placeholder={common.emailAddressPlaceholder()}
                  error={commentForm.formState.errors.email?.message}
                  {...commentForm.register("email", {
                    required: common.emailAddressRequired(),
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: common.emailFormatIncorrect(),
                    },
                  })}
                />
              </Box>
            )}
          </HStack>

          {/* 第二行：评论内容输入 */}
          <Textarea
            placeholder={comment.commentPlaceholder()}
            rows={4}
            error={commentForm.formState.errors.body?.message}
            {...commentForm.register("body", {
              required: form.commentContentRequired(),
            })}
          />

          {/* 第三行：发布按钮 */}
          <Button
            type="submit"
            colorPalette="orange"
            size="md"
            width="100%"
            loading={isSubmitting || isWaitingForWallet || isConfirming}
            loadingText={
              isWaitingForWallet
                ? common.waitingForWallet()
                : isConfirming
                  ? comment.verifyingComment()
                  : comment.submitting()
            }
            onClick={(e) => {
              if (authType === "ETHEREUM" && pendingComment) {
                e.preventDefault()
                confirmPendingComment()
              }
            }}
          >
            <FiMessageCircle />
            {isWaitingForWallet
              ? common.waitingForWallet()
              : comment.submitComment()}
          </Button>
        </VStack>
      </form>
    </Box>
  )
}
