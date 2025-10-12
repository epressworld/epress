import { useMutation, useQuery } from "@apollo/client/react"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { toaster } from "../components/ui/toaster"
import { usePage } from "../contexts/PageContext"
import { UPDATE_SETTINGS } from "../graphql/mutations"
import { GET_SETTINGS } from "../graphql/queries"
import { useTranslation } from "./useTranslation"

export function useSettingsForm() {
  const { settings } = useTranslation()
  const { refetchPageData } = usePage()
  const { data: response = {}, loading: settingsLoading } =
    useQuery(GET_SETTINGS)

  const { settings: settingsData } = response
  // 状态管理
  const [isLoading, setIsLoading] = useState(false)

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
  })

  // GraphQL变更
  const [updateSettings] = useMutation(UPDATE_SETTINGS)

  // 初始化表单数据
  useEffect(() => {
    if (settingsData) {
      form.reset({
        enableRSS: settingsData.enableRSS ? "on" : undefined,
        allowFollow: settingsData.allowFollow ? "on" : undefined,
        allowComment: settingsData.allowComment ? "on" : undefined,
        walletConnectProjectId: settingsData.walletConnectProjectId,
        defaultLanguage: settingsData.defaultLanguage,
        defaultTheme: settingsData.defaultTheme,
        mailTransport: settingsData.mailTransport,
        mailFrom: settingsData.mailFrom,
      })
    }
  }, [settingsData, form])

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
        description: settings.settingsSaved(),
        type: "success",
      })

      return { success: true }
    } catch (error) {
      console.error("保存设置失败:", error)
      toaster.create({
        description: error.message || settings.saveFailed(),
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
