import { useMutation } from "@apollo/client/react"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { toaster } from "@/components/ui/toaster"
import { usePage } from "@/contexts/PageContext"
import { UPDATE_SETTINGS } from "@/lib/apollo"
import { useIntl } from "../utils"

export function useSettingsForm() {
  const { t } = useIntl()
  const { refetchPageData, settings, settingsLoading } = usePage()

  const [isLoading, setIsLoading] = useState(false)

  const form = useForm({
    defaultValues: {
      enableRSS: false,
      allowFollow: true,
      allowComment: true,
      defaultLanguage: "en",
      defaultTheme: "light",
      walletConnectProjectId: "",
      pwaAppName: "",
    },
    mode: "onChange",
  })

  const [updateSettings] = useMutation(UPDATE_SETTINGS)

  useEffect(() => {
    if (settings) {
      form.reset({
        enableRSS: settings.enableRSS ? "on" : undefined,
        allowFollow: settings.allowFollow ? "on" : undefined,
        allowComment: settings.allowComment ? "on" : undefined,
        walletConnectProjectId: settings.walletConnectProjectId,
        defaultLanguage: settings.defaultLanguage,
        defaultTheme: settings.defaultTheme,
        pwaAppName: settings.pwaAppName || "",
      })
    }
  }, [settings, form])

  const onSubmit = async (data) => {
    setIsLoading(true)
    try {
      await updateSettings({
        variables: {
          input: {
            defaultLanguage: data.defaultLanguage,
            defaultTheme: data.defaultTheme,
            walletConnectProjectId: data.walletConnectProjectId,
            pwaAppName: data.pwaAppName,
            enableRSS: data.enableRSS === "on" || data.enableRSS === true,
            allowFollow: data.allowFollow === "on" || data.allowFollow === true,
            allowComment:
              data.allowComment === "on" || data.allowComment === true,
          },
        },
      })

      await refetchPageData()

      toaster.create({
        description: t("settings.settingsSaved"),
        type: "success",
      })

      return { success: true }
    } catch (error) {
      console.error("保存设置失败:", error)
      toaster.create({
        description: error.message || t("settings.saveFailed"),
        type: "error",
      })
      return { success: false, error }
    } finally {
      setIsLoading(false)
    }
  }

  return {
    form,
    isLoading,
    settingsLoading,
    onSubmit,
  }
}
