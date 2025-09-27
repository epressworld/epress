"use client"
import { PublicationForm, PublicationList } from "../../components/business"
import { useHomePage } from "../../hooks/useHomePage"
import { usePageTitle } from "../../hooks/usePageTitle"
import { useTranslation } from "../../hooks/useTranslation"

export default function HomePage({
  initialPublications = [],
  initialPageInfo = null,
  initialTotal = 0,
}) {
  const { common } = useTranslation()
  const {
    isLoading,
    formResetTrigger,
    isNodeOwner,
    authStatus,
    profile,
    handleEdit,
    handleSetRefetch,
    handleContentChange,
    handleFileSelect,
    handleFileRemove,
    handleSubmit,
  } = useHomePage()

  // 设置页面标题
  usePageTitle(common.pageTitle.home())

  return (
    <>
      {/* 发布表单 - 只有节点所有者且已认证才显示 */}
      {isNodeOwner && authStatus === "AUTHENTICATED" && (
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

      {/* 发布列表 */}
      <PublicationList
        initialPublications={initialPublications}
        initialPageInfo={initialPageInfo}
        initialTotal={initialTotal}
        nodeAddress={profile?.address}
        onEdit={handleEdit}
        onSetRefetch={handleSetRefetch}
        onPublicationCreated={() => {
          // 刷新发布列表
          if (handleSetRefetch) {
            handleSetRefetch()
          }
        }}
        onPublish={handleSubmit} // 复用现有的发布逻辑
      />
    </>
  )
}
