"use client"
import { PublicationForm, PublicationList } from "../../../components/business"
import { useHomePage } from "../../../hooks/useHomePage"
import { useIntl } from "../../../hooks/useIntl"
import { usePageTitle } from "../../../hooks/usePageTitle"

export default function HomePage({ variables, keyword }) {
  const { t } = useIntl()
  const {
    isLoading,
    formResetTrigger,
    isNodeOwner,
    authStatus,
    profile,
    handleEdit,
    handleContentChange,
    handleFileSelect,
    handleFileRemove,
    handleSubmit,
  } = useHomePage({ variables, keyword })

  // 设置页面标题
  usePageTitle(t("common")("pageTitle.home"))

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
        variables={variables}
        nodeAddress={profile?.address}
        onEdit={handleEdit}
        onPublish={handleSubmit} // 复用现有的发布逻辑
        keyword={keyword}
      />
    </>
  )
}
