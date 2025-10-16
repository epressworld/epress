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

  // 状态管理
  const [isLoading, setIsLoading] = useState(false)
  const [mailTransportValidating, setMailTransportValidating] = useState(false)
  const [mailTransportValid, setMailTransportValid] = useState(null)

  // React Hook Form 配置
  const form = useForm({
    defaultValues: {
      enableRSS: false,
      allowFollow: true,
      allowComment: true,
      defaultLanguage: "en",
      defaultTheme: "light",
      walletConnectProjectId: "",
      mailTransport: "",
      mailFrom: "",
    },
    mode: "onChange",
  })

  // GraphQL变更
  const [updateSettings] = useMutation(UPDATE_SETTINGS)

  // 初始化表单数据
  useEffect(() => {
    if (settings) {
      form.reset({
        enableRSS: settings.enableRSS ? "on" : undefined,
        allowFollow: settings.allowFollow ? "on" : undefined,
        allowComment: settings.allowComment ? "on" : undefined,
        walletConnectProjectId: settings.walletConnectProjectId,
        defaultLanguage: settings.defaultLanguage,
        defaultTheme: settings.defaultTheme,
        mailTransport: settings.mail?.mailTransport,
        mailFrom: settings.mail?.mailFrom,
      })
    }
  }, [settings, form])

  // SMTP validation function
  const validateMailTransport = async (value) => {
    if (!value || value.trim() === "") {
      setMailTransportValid(null)
      return true // Optional field
    }

    setMailTransportValidating(true)
    setMailTransportValid(null)

    try {
      const response = await fetch("/api/smtp_check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mailTransport: value }),
      })

      const data = await response.json()

      if (data.valid) {
        setMailTransportValid(true)
        return true
      } else {
        setMailTransportValid(false)
        return data.error || t("settings.mailTransportInvalid")
      }
    } catch (_error) {
      setMailTransportValid(false)
      return t("settings.mailTransportInvalid")
    } finally {
      setMailTransportValidating(false)
    }
  }

  // 表单提交处理函数
  const onSubmit = async (data) => {
    setIsLoading(true)
    try {
      await updateSettings({
        variables: {
          input: {
            defaultLanguage: data.defaultLanguage,
            defaultTheme: data.defaultTheme,
            walletConnectProjectId: data.walletConnectProjectId,
            mailTransport: data.mailTransport,
            mailFrom: data.mailFrom,
            enableRSS: data.enableRSS === "on" || data.enableRSS === true,
            allowFollow: data.allowFollow === "on" || data.allowFollow === true,
            allowComment:
              data.allowComment === "on" || data.allowComment === true,
          },
        },
      })

      // 重新获取节点数据
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
    validateMailTransport,
    mailTransportValidating,
    mailTransportValid,
  }
}
