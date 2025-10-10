"use client"
import { Alert, Button } from "@chakra-ui/react"
import { useRouter } from "next/navigation"
import { useTranslation } from "../../hooks/useTranslation"

export function SearchResultAlert({ keyword, count }) {
  const { common, t } = useTranslation()
  const router = useRouter()

  if (!keyword) return null

  const handleClearSearch = () => {
    router.push("/publications")
  }

  return (
    <Alert.Root status="info" variant="subtle">
      <Alert.Indicator />
      <Alert.Content color="fg">
        <Alert.Title>{t("common.searchResults")}</Alert.Title>
        <Alert.Description>
          {t("common.searchResultsCount", { keyword, count })}
        </Alert.Description>
      </Alert.Content>
      <Button
        size="sm"
        variant="ghost"
        colorPalette="blue"
        onClick={handleClearSearch}
      >
        {common.clearSearch()}
      </Button>
    </Alert.Root>
  )
}
