import { useApolloClient, useMutation } from "@apollo/client/react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toaster } from "@/components/ui/toaster"
import { AUTH_STATUS, useAuth } from "@/contexts/AuthContext"
import { usePage } from "@/contexts/PageContext"
import { useIntl } from "@/hooks/utils"
import { CREATE_PUBLICATION, SEARCH_PUBLICATIONS } from "@/lib/apollo"

export function usePublicationList({ variables, keyword: _keyword }) {
  const client = useApolloClient()
  const router = useRouter()
  const { authStatus, isNodeOwner } = useAuth()
  const { profile } = usePage()
  const { t } = useIntl()

  // 状态管理
  const [isLoading, setIsLoading] = useState(false)
  const [formResetTrigger, setFormResetTrigger] = useState(0)

  // GraphQL mutations
  const [createPublication] = useMutation(CREATE_PUBLICATION)

  // 处理编辑
  const handleEdit = (publication) => {
    router.push(`/publications/${publication.id}?edit=true`)
  }

  // 处理内容变化
  const handleContentChange = () => {
    // 可以在这里处理内容变化，比如保存草稿等
  }

  // 处理文件选择
  const handleFileSelect = (_file, error) => {
    if (error) {
      toaster.create({
        description: error.message,
        type: "error",
      })
    }
  }

  // 处理文件移除
  const handleFileRemove = () => {
    // 文件移除处理
  }

  // 处理提交
  const handleSubmit = async (formData) => {
    // 只有认证用户才能发布(只有节点所有者可以认证)
    if (authStatus !== AUTH_STATUS.AUTHENTICATED) {
      toaster.create({
        description: t("common.onlyNodeOwnerCanPublish"),
        type: "error",
      })
      return
    }

    setIsLoading(true)
    try {
      // 确保mode是字符串，处理可能的对象情况
      let mode = formData.mode
      if (typeof mode === "object" && mode !== null) {
        mode = mode.value || mode.toString() || "post"
      }
      mode = String(mode || "post")

      const input = {
        type: mode.toUpperCase(),
        body: formData.content,
      }

      // 如果有文件，需要特殊处理
      if (formData.file) {
        // 对于文件上传，使用FormData格式
        const formDataToSend = new FormData()
        formDataToSend.append(
          "operations",
          JSON.stringify({
            query: CREATE_PUBLICATION.loc?.source?.body || CREATE_PUBLICATION,
            variables: {
              input: {
                type: mode.toUpperCase(),
                description: formData.content,
                file: null,
              },
            },
          }),
        )
        formDataToSend.append(
          "map",
          JSON.stringify({ 0: ["variables.input.file"] }),
        )
        formDataToSend.append("0", formData.file)

        // 使用fetch直接发送multipart请求
        const response = await fetch("/api/graphql", {
          method: "POST",
          body: formDataToSend,
        })

        const result = await response.json()

        if (result.errors) {
          throw new Error(result.errors[0].message)
        }

        if (!result.data?.createPublication) {
          throw new Error("发布失败")
        }

        // 文件上传成功后，手动更新缓存
        const newPublication = result.data.createPublication
        if (newPublication) {
          client.cache.updateQuery(
            {
              query: SEARCH_PUBLICATIONS,
              variables,
            },
            (data) => {
              if (!data) return
              return {
                search: {
                  ...data.search,
                  edges: [
                    {
                      node: {
                        __typename: "Publication",
                        ...newPublication,
                        author: {
                          __typename: "Node",
                          ...newPublication.author,
                        },
                        content: {
                          __typename: "Content",
                          ...newPublication.content,
                        },
                      },
                      cursor: Buffer.from(newPublication.id).toString("base64"),
                      __typename: "SearchItemEdge",
                    },
                    ...data.search.edges,
                  ],
                },
              }
            },
          )
        }
      } else {
        // 普通文本发布，使用常规GraphQL请求
        await createPublication({
          variables: { input },
          refetchQueries: [
            {
              query: SEARCH_PUBLICATIONS,
              variables,
            },
          ],
          awaitRefetchQueries: true,
        })
      }

      toaster.create({
        description: t("common.publishSuccess"),
        type: "success",
      })

      // 触发表单重置
      setFormResetTrigger((prev) => prev + 1)
    } catch (error) {
      console.error("发布失败:", error)
      toaster.create({
        description: error.message || t("common.pleaseRetry"),
        type: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return {
    // 状态
    isLoading,
    formResetTrigger,
    isNodeOwner,
    authStatus,
    profile,

    // 方法
    handleEdit,
    handleContentChange,
    handleFileSelect,
    handleFileRemove,
    handleSubmit,
  }
}
