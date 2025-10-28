"use client"
import { Box } from "@chakra-ui/react"
import { useRef } from "react"
import {
  PublicationForm,
  PublicationList,
} from "@/components/features/publication"
import { PullToRefresh } from "@/components/ui"
import { usePublicationList } from "@/hooks/data"
import { useIntl, usePageTitle, usePullToRefresh } from "@/hooks/utils"

export function PublicationListPage({ variables, keyword }) {
  const { t } = useIntl()

  const listTriggerRef = useRef(null)

  const {
    isLoading,
    formResetTrigger,
    authStatus,
    profile,
    handleEdit,
    handleContentChange,
    handleFileSelect,
    handleFileRemove,
    handleSubmit,
    handleRefresh,
  } = usePublicationList({ variables, keyword })

  // 4. 调用新的 Hook
  const { isRefreshing, pullPosition, isPulling } = usePullToRefresh({
    onRefresh: handleRefresh,
    isDisabled: isLoading,
    triggerRef: listTriggerRef,
    // 你可以在此覆盖 Hook 中的默认阈值
    // refreshThreshold: 180,
  })

  usePageTitle(t("common.pageTitle.home"))
  const isAuthenticated = authStatus === "AUTHENTICATED"

  return (
    <>
      {/* Pull to refresh indicator - 移动到列表上方 */}
      {/* 5. 传递 state 到 "哑" 组件 */}
      <PullToRefresh
        isRefreshing={isRefreshing}
        pullPosition={pullPosition}
        isPulling={isPulling}
      />

      {/* Publication form */}
      {isAuthenticated && (
        <PublicationForm
          onContentChange={handleContentChange}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          disabled={isLoading}
          onFileSelect={handleFileSelect}
          onFileRemove={handleFileRemove}
          resetTrigger={formResetTrigger}
        />
      )}

      {/* 6. 将 Ref 附加到列表或其包装器上 */}
      <Box ref={listTriggerRef}>
        <PublicationList
          variables={variables}
          nodeAddress={profile?.address}
          onEdit={handleEdit}
          onPublish={handleSubmit}
          keyword={keyword}
        />
      </Box>
    </>
  )
}
