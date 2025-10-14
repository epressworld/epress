import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight"
import ImageExtension from "@tiptap/extension-image"
import Placeholder from "@tiptap/extension-placeholder"
import { TableKit } from "@tiptap/extension-table"
import { useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { common, createLowlight } from "lowlight"
import { useEffect, useState } from "react"
import { Markdown } from "tiptap-markdown"
import { useIntl } from "../utils"

const lowlight = createLowlight(common)

export function usePublicationForm({
  initialContent = "",
  initialMode = "post",
  onContentChange,
  maxFileSize = 100 * 1024 * 1024,
  onFileSelect,
  onFileRemove,
  resetTrigger = 0,
  disabled = false,
}) {
  const { t } = useIntl()
  const [mode, setMode] = useState(initialMode)
  const [content, setContent] = useState(initialContent)
  const [fileDescription, setFileDescription] = useState("")
  const [selectedFile, setSelectedFile] = useState(null)

  // TipTap编辑器配置
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
        // 禁用 StarterKit 中的 codeBlock，使用 CodeBlockLowlight 替代
        codeBlock: false,
      }),
      ImageExtension,
      TableKit,
      CodeBlockLowlight.configure({
        lowlight,
      }),
      Placeholder.configure({
        placeholder: t("publication")("writeSomething"),
      }),
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: initialContent,
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const newContent = editor.storage.markdown.getMarkdown()
      setContent(newContent)
      if (onContentChange) {
        onContentChange(newContent, mode, fileDescription, selectedFile)
      }
    },
    editorProps: {
      handleKeyDown: (view, event) => {
        // Tab键切换标题级别
        if (event.key === "Tab" && !event.shiftKey) {
          const { state, dispatch } = view
          const { selection } = state
          const { $from } = selection

          // 检查当前是否在标题中
          const heading = $from.parent.type.name === "heading"
          if (heading) {
            event.preventDefault()
            const currentLevel = $from.parent.attrs.level
            const maxLevel = 6

            if (currentLevel < maxLevel) {
              // 增加标题级别
              const tr = state.tr.setNodeMarkup($from.before(), null, {
                level: currentLevel + 1,
              })
              dispatch(tr)
              return true
            }
          }
        }

        // Shift+Tab键降低标题级别
        if (event.key === "Tab" && event.shiftKey) {
          const { state, dispatch } = view
          const { selection } = state
          const { $from } = selection

          // 检查当前是否在标题中
          const heading = $from.parent.type.name === "heading"
          if (heading) {
            event.preventDefault()
            const currentLevel = $from.parent.attrs.level
            const minLevel = 1

            if (currentLevel > minLevel) {
              // 降低标题级别
              const tr = state.tr.setNodeMarkup($from.before(), null, {
                level: currentLevel - 1,
              })
              dispatch(tr)
              return true
            }
          }
        }

        return false
      },
    },
  })

  // 当初始内容变化时，更新编辑器（仅在post模式下）
  useEffect(() => {
    if (editor && initialMode === "post" && initialContent !== content) {
      editor.commands.setContent(initialContent)
      setContent(initialContent)
    }
  }, [editor, initialContent, initialMode])

  // 当disabled状态变化时，更新编辑器的可编辑状态
  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled)
    }
  }, [editor, disabled])

  // 当resetTrigger变化时，重置表单
  useEffect(() => {
    if (resetTrigger > 0) {
      setMode(initialMode)
      setContent("")
      setFileDescription("")
      setSelectedFile(null)

      if (editor) {
        editor.commands.clearContent()
      }
    }
  }, [resetTrigger, editor, initialMode])

  // 处理文件选择
  const handleFileSelect = ({ files }) => {
    const file = files[0]
    if (file) {
      if (file.size > maxFileSize) {
        if (onFileSelect) {
          onFileSelect(
            null,
            new Error(`文件大小不能超过${maxFileSize / 1024 / 1024}MB`),
          )
        }
        return
      }

      setSelectedFile(file)

      if (onFileSelect) {
        onFileSelect(file)
      }
    }
  }

  // 移除文件
  const handleRemoveFile = (e) => {
    e.preventDefault()
    setSelectedFile(null)
    if (onFileRemove) {
      onFileRemove()
    }
  }

  // 提交内容
  const handleSubmit = () => {
    if (mode === "post" && !content.trim()) {
      console.warn("Post模式需要内容")
      return
    }

    if (mode === "file" && !selectedFile) {
      console.warn("File模式需要选择文件")
      return
    }

    if (mode === "file" && !fileDescription.trim()) {
      console.warn("File模式需要文件描述")
      return
    }

    return {
      mode,
      content: mode === "post" ? content : fileDescription,
      file: mode === "file" ? selectedFile : null,
    }
  }

  return {
    mode,
    setMode,
    content,
    setContent,
    fileDescription,
    setFileDescription,
    selectedFile,
    editor,
    handleFileSelect,
    handleRemoveFile,
    handleSubmit,
  }
}
