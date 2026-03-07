import { useMutation } from "@apollo/client/react"
import { sha256 } from "js-sha256"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { useAccount } from "wagmi"
import { toaster } from "@/components/ui/toaster"
import { useAuth } from "@/contexts/AuthContext"
import { usePage } from "@/contexts/PageContext"
import { CREATE_COMMENT } from "@/lib/apollo"
import { commentSignatureTypedData } from "@/utils/helpers"
import { useOnlineVisitors, useWallet } from "../data"
import { useIntl } from "../utils"

export function useCommentForm(publicationId, onCommentCreated) {
  const { profile } = usePage()
  const { visitor } = useAuth()
  const { signEIP712Data } = useWallet()
  const { t } = useIntl()
  const { isAddressOnline } = useOnlineVisitors()

  const { address, isConnected } = useAccount()

  const [isSubmitting, setIsSubmitting] = useState(false)

  const commentForm = useForm({
    defaultValues: {
      body: "",
    },
  })

  const [createComment] = useMutation(CREATE_COMMENT)

  const isOnline = isAddressOnline(address)

  const handleSubmit = async (data) => {
    if (!isConnected || !address) {
      toaster.create({
        description: t("common.pleaseConnectWallet"),
        type: "warning",
      })
      return { success: false, error: new Error("Please connect wallet") }
    }

    if (!profile?.address) {
      throw new Error("Node address not found, please refresh the page")
    }

    setIsSubmitting(true)

    try {
      const commentBodyHash = `0x${sha256(data.body)}`
      const typedData = commentSignatureTypedData(
        profile.address,
        address,
        parseInt(publicationId, 10),
        commentBodyHash,
      )

      const signature = await signEIP712Data(typedData)
      if (!signature) {
        toaster.create({
          description: t("common.signFailed"),
          type: "error",
        })
        return { success: false, error: new Error("Signature failed") }
      }

      const input = {
        publication_id: publicationId,
        body: data.body,
        author_name:
          visitor?.node?.title ||
          `${address.slice(0, 6)}...${address.slice(-6)}`,
        author_address: address,
        signature: signature,
      }

      await createComment({
        variables: { input },
      })

      toaster.create({
        description: t("comment.commentSubmitSuccessEthereum"),
        type: "success",
      })

      commentForm.reset({
        body: "",
      })

      if (onCommentCreated) {
        onCommentCreated()
      }

      return { success: true }
    } catch (error) {
      console.error("Submit comment failed:", error)
      toaster.create({
        description:
          error.message ||
          `${t("common.submitFailed")}, ${t("common.pleaseRetry")}`,
        type: "error",
      })
      return { success: false, error }
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    commentForm,
    isSubmitting,
    visitor,
    isOnline,
    handleSubmit,
  }
}
