import { useState } from "react"

export function useFileUpload(options = {}) {
  const {
    maxSize = 100 * 1024 * 1024, // 100MB
    accept = "*/*",
    onFileChange,
    onError,
  } = options

  const [selectedFile, setSelectedFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState(null)

  const handleFileSelect = (event) => {
    const file = event.target.files[0]
    if (!file) return

    // 检查文件大小
    if (file.size > maxSize) {
      const errorMessage = `文件大小不能超过${maxSize / 1024 / 1024}MB`
      setError(errorMessage)
      if (onError) {
        onError(new Error(errorMessage))
      }
      return
    }

    setSelectedFile(file)
    setError(null)

    // 如果是图片，创建预览
    if (file.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreview(e.target.result)
      }
      reader.readAsDataURL(file)
    } else {
      setPreview(null)
    }

    // 通知父组件文件选择
    if (onFileChange) {
      onFileChange(file)
    }
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setPreview(null)
    setError(null)

    if (onFileChange) {
      onFileChange(null)
    }
  }

  const reset = () => {
    setSelectedFile(null)
    setPreview(null)
    setError(null)
  }

  return {
    selectedFile,
    preview,
    error,
    handleFileSelect,
    handleRemoveFile,
    reset,
    maxSize,
    accept,
  }
}
