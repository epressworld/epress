"use client"
import { Alert, Button } from "@chakra-ui/react"
import { useRouter } from "next/navigation"
import { useIntl } from "../../hooks/useIntl"

export function SearchResultAlert({ keyword, count }) {
  const { t } = useIntl()
  const router = useRouter()

  if (!keyword) return null

  const handleClearSearch = () => {
    router.push("/publications")
  }

  return (
    <Alert.Root status="info" variant="subtle">
      <Alert.Indicator />
      <Alert.Content color="fg">
        <Alert.Title>{t("common")("searchResults")}</Alert.Title>
        <Alert.Description>
          {t("common")("searchResultsCount", { keyword, count })}
        </Alert.Description>
      </Alert.Content>
      <Button
        size="sm"
        variant="ghost"
        colorPalette="blue"
        onClick={handleClearSearch}
      >
        {t("common")("clearSearch")}
      </Button>
    </Alert.Root>
  )
}
