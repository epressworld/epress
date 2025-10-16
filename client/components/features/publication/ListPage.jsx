"use client"
import {
  PublicationForm,
  PublicationList,
} from "@/components/features/publication"
import { usePublicationList } from "@/hooks/data"
import { useIntl, usePageTitle } from "@/hooks/utils"

/**
 * Publications page component
 * Displays publication list and form for creating new publications
 */
export function PublicationListPage({ variables, keyword }) {
  const { t } = useIntl()
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
  } = usePublicationList({ variables, keyword })

  // Set page title
  usePageTitle(t("common.pageTitle.home"))

  return (
    <>
      {/* Publication form - only show when authenticated (only node owner can authenticate) */}
      {authStatus === "AUTHENTICATED" && (
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

      {/* Publication list */}
      <PublicationList
        variables={variables}
        nodeAddress={profile?.address}
        onEdit={handleEdit}
        onPublish={handleSubmit}
        keyword={keyword}
      />
    </>
  )
}
