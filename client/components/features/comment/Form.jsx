"use client"

import {
  Box,
  Button,
  HStack,
  Input,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react"
import { FiMessageCircle } from "react-icons/fi"
import { AuthorInfo } from "@/components/ui"
import { useCommentForm } from "@/hooks/form"
import { useIntl } from "@/hooks/utils"

export const CommentForm = ({
  publicationId,
  onCommentCreated,
  onPendingCommentChange,
}) => {
  const { t } = useIntl()

  const {
    commentForm,
    isSubmitting,
    isWaitingForWallet,
    isConfirming,
    isAnonymous,
    visitor,
    isOnline,
    authType,
    isConnected,
    isMailEnabled,
    pendingComment,
    handleAuthTypeChange,
    handleSubmit,
    confirmPendingComment,
  } = useCommentForm(publicationId, onCommentCreated, onPendingCommentChange)

  // 默认认证方式：如果钱包已连接则选择以太坊，否则选择邮箱

  return (
    <Box>
      <Text fontSize="lg" fontWeight="semibold" mb={4}>
        {t("comment.publishComment")}
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
            {/* 认证方式自动选择 - 不再显示选择器 */}
            <Box minW="120px" flex="0 0 auto" display="none">
              <input
                type="hidden"
                value={authType}
                onChange={(e) =>
                  handleAuthTypeChange({ value: e.target.value })
                }
              />
            </Box>

            {/* 昵称输入 */}
            <Box flex="1" minW="120px">
              {!isAnonymous && (
                <AuthorInfo node={visitor.node} isOnline={isOnline} />
              )}
              <Input
                type={isAnonymous ? "text" : "hidden"}
                size="md"
                placeholder={t("common.nicknamePlaceholder")}
                error={commentForm.formState.errors.username?.message}
                {...commentForm.register("username", {
                  required: t("common.nicknameRequired"),
                })}
              />
            </Box>

            {/* 邮箱输入 - 仅在邮箱认证时显示 */}
            {authType === "EMAIL" && isMailEnabled && isAnonymous && (
              <Box flex="1" minW="200px">
                <Input
                  size="md"
                  type="email"
                  placeholder={t("common.emailAddressPlaceholder")}
                  error={commentForm.formState.errors.email?.message}
                  {...commentForm.register("email", {
                    required: t("common.emailAddressRequired"),
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: t("common.emailFormatIncorrect"),
                    },
                  })}
                />
              </Box>
            )}
          </HStack>

          {/* 第二行：评论内容输入 */}
          <Textarea
            placeholder={t("comment.commentPlaceholder")}
            rows={4}
            error={commentForm.formState.errors.body?.message}
            {...commentForm.register("body", {
              required: t("form.commentContentRequired"),
            })}
          />

          {/* 第三行：发布按钮 */}
          <Button
            type="submit"
            colorPalette="orange"
            size="md"
            width="100%"
            loading={isSubmitting || isWaitingForWallet || isConfirming}
            disabled={authType === "ETHEREUM" && !isConnected}
            loadingText={
              isWaitingForWallet
                ? t("common.waitingForWallet")
                : isConfirming
                  ? t("comment.verifyingComment")
                  : t("comment.submitting")
            }
            onClick={(e) => {
              if (authType === "ETHEREUM" && pendingComment) {
                e.preventDefault()
                confirmPendingComment()
              }
            }}
          >
            <FiMessageCircle />
            {authType === "ETHEREUM" && !isConnected
              ? t("common.pleaseConnectWalletButton")
              : isWaitingForWallet
                ? t("common.waitingForWallet")
                : t("comment.submitComment")}
          </Button>
        </VStack>
      </form>
    </Box>
  )
}
