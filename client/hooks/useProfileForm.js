import { useMutation } from "@apollo/client/react"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { toaster } from "../components/ui/toaster"
import { useAuth } from "../contexts/AuthContext"
import { usePage } from "../contexts/PageContext"
import { BROADCAST_PROFILE_UPDATE, UPDATE_PROFILE } from "../graphql/mutations"
import { nodeProfileUpdateTypedData } from "../utils/eip712"
import { useIntl } from "./useIntl"
import { useWallet } from "./useWallet"

export function useProfileForm() {
  const { profile, authStatus, AUTH_STATUS } = useAuth()
  const { refetchPageData } = usePage()
  const { signEIP712Data } = useWallet()
  const { t } = useIntl()

  // 状态管理
  const [isLoading, setIsLoading] = useState(false)
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)

  // React Hook Form 配置
  const form = useForm({
    defaultValues: {
      url: "",
      title: "",
      description: "",
    },
  })

  // GraphQL mutations
  const [updateProfile] = useMutation(UPDATE_PROFILE)
  const [broadcastProfileUpdate] = useMutation(BROADCAST_PROFILE_UPDATE)

  // 初始化表单数据
  useEffect(() => {
    if (profile) {
      form.reset({
        url: profile.url || "",
        title: profile.title || "",
        description: profile.description || "",
      })
    }
  }, [profile, form])

  // 文件处理函数
  const handleAvatarChange = (event) => {
    const file = event.target.files[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onload = (e) => setAvatarPreview(e.target.result)
      reader.readAsDataURL(file)
    }
  }

  // 表单提交处理函数
  const onSubmit = async (data) => {
    if (authStatus !== AUTH_STATUS.AUTHENTICATED) {
      toaster.create({
        description: t("settings")("pleaseLoginFirst"),
        type: "error",
      })
      return
    }

    setIsLoading(true)
    try {
      let updateResult

      // 如果有头像文件，使用FormData方式上传
      if (avatarFile) {
        const formData = new FormData()
        formData.append(
          "operations",
          JSON.stringify({
            query: UPDATE_PROFILE.loc?.source?.body || UPDATE_PROFILE,
            variables: {
              input: {
                title: data.title,
                description: data.description,
                url: data.url,
                avatar: null,
              },
            },
          }),
        )
        formData.append(
          "map",
          JSON.stringify({ 0: ["variables.input.avatar"] }),
        )
        formData.append("0", avatarFile)

        const response = await fetch("/api/graphql", {
          method: "POST",
          body: formData,
        })

        const result = await response.json()
        if (result.errors) {
          throw new Error(result.errors[0].message)
        }
        updateResult = { data: { updateProfile: result.data.updateProfile } }
      } else {
        // 没有头像文件，使用常规GraphQL请求
        updateResult = await updateProfile({
          variables: {
            input: {
              title: data.title,
              description: data.description,
              url: data.url,
            },
          },
        })
      }

      const updatedProfile = updateResult.data.updateProfile

      // 第二步：使用最新的数据生成EIP-712请求用户签名
      const timestamp = Math.floor(Date.now() / 1000)
      const typedData = nodeProfileUpdateTypedData(
        updatedProfile.address,
        updatedProfile.url,
        updatedProfile.title,
        updatedProfile.description,
        updatedProfile.profile_version,
        timestamp,
      )

      // 获取签名
      const signature = await signEIP712Data(typedData)

      // 第三步：提交广播请求
      await broadcastProfileUpdate({
        variables: {
          typedData,
          signature,
        },
      })

      // 第四步：重新获取节点数据
      await refetchPageData()

      toaster.create({
        description: t("settings")("nodeInfoSaved"),
        type: "success",
      })

      return { success: true }
    } catch (error) {
      console.error("保存节点信息失败:", error)
      toaster.create({
        description: error.message || t("settings")("saveFailed"),
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
    avatarFile,
    avatarPreview,
    handleAvatarChange,
    onSubmit,
  }
}
