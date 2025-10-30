"use client"

import {
  Box,
  Button,
  HStack,
  IconButton,
  Input,
  Popover,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useState } from "react"
import {
  FiBold,
  FiCode,
  FiHash,
  FiImage,
  FiItalic,
  FiLink,
  FiList,
} from "react-icons/fi"
import { LuFileCode2, LuQuote, LuStrikethrough } from "react-icons/lu"
import { useIntl } from "@/hooks/utils"

export function EditorToolbar({ editor }) {
  const { t } = useIntl()
  const [linkUrl, setLinkUrl] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [codeBlockLanguage, setCodeBlockLanguage] = useState("")
  const [isLinkOpen, setIsLinkOpen] = useState(false)
  const [isImageOpen, setIsImageOpen] = useState(false)
  const [isCodeBlockOpen, setIsCodeBlockOpen] = useState(false)

  if (!editor) return null

  const handleLinkSubmit = () => {
    if (linkUrl.trim()) {
      editor.chain().focus().setLink({ href: linkUrl }).run()
      setLinkUrl("")
      setIsLinkOpen(false)
    }
  }

  const handleLinkEdit = () => {
    const { href } = editor.getAttributes("link")
    setLinkUrl(href || "")
    setIsLinkOpen(true)
  }

  const handleLinkRemove = () => {
    editor.chain().focus().unsetLink().run()
    setIsLinkOpen(false)
  }

  const handleImageSubmit = () => {
    if (imageUrl.trim()) {
      const selectedText = editor.state.doc.textBetween(
        editor.state.selection.from,
        editor.state.selection.to,
      )

      editor
        .chain()
        .focus()
        .setImage({
          src: imageUrl,
          alt: selectedText || "",
        })
        .run()
      setImageUrl("")
      setIsImageOpen(false)
    }
  }

  const handleCodeBlockSubmit = () => {
    editor.chain().focus().toggleCodeBlock().run()
    if (codeBlockLanguage.trim()) {
      setTimeout(() => {
        editor
          .chain()
          .focus()
          .updateAttributes("codeBlock", { language: codeBlockLanguage })
          .run()
      }, 50)
    }
    setCodeBlockLanguage("")
    setIsCodeBlockOpen(false)
  }

  const programmingLanguages = [
    { value: "", label: t("editor.noLanguage") },
    { value: "javascript", label: "JavaScript" },
    { value: "typescript", label: "TypeScript" },
    { value: "python", label: "Python" },
    { value: "java", label: "Java" },
    { value: "cpp", label: "C++" },
    { value: "c", label: "C" },
    { value: "csharp", label: "C#" },
    { value: "php", label: "PHP" },
    { value: "ruby", label: "Ruby" },
    { value: "go", label: "Go" },
    { value: "rust", label: "Rust" },
    { value: "swift", label: "Swift" },
    { value: "kotlin", label: "Kotlin" },
    { value: "html", label: "HTML" },
    { value: "css", label: "CSS" },
    { value: "scss", label: "SCSS" },
    { value: "json", label: "JSON" },
    { value: "xml", label: "XML" },
    { value: "yaml", label: "YAML" },
    { value: "sql", label: "SQL" },
    { value: "bash", label: "Bash" },
    { value: "powershell", label: "PowerShell" },
    { value: "markdown", label: "Markdown" },
  ]

  const allTools = [
    {
      id: "bold",
      icon: <FiBold />,
      label: t("editor.bold"),
      onClick: () => editor.chain().focus().toggleBold().run(),
      isActive: () => editor.isActive("bold"),
      needsPopover: false,
    },
    {
      id: "italic",
      icon: <FiItalic />,
      label: t("editor.italic"),
      onClick: () => editor.chain().focus().toggleItalic().run(),
      isActive: () => editor.isActive("italic"),
      needsPopover: false,
    },
    {
      id: "heading",
      icon: <FiHash />,
      label: t("editor.heading"),
      onClick: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: () => editor.isActive("heading"),
      needsPopover: false,
    },
    {
      id: "code",
      icon: <FiCode />,
      label: t("editor.inlineCode"),
      onClick: () => editor.chain().focus().toggleCode().run(),
      isActive: () => editor.isActive("code"),
      needsPopover: false,
    },
    {
      id: "strike",
      icon: <LuStrikethrough />,
      label: t("editor.strikethrough"),
      onClick: () => editor.chain().focus().toggleStrike().run(),
      isActive: () => editor.isActive("strike"),
      needsPopover: false,
    },
    {
      id: "bulletList",
      icon: <FiList />,
      label: t("editor.bulletList"),
      onClick: () => editor.chain().focus().toggleBulletList().run(),
      isActive: () => editor.isActive("bulletList"),
      needsPopover: false,
    },
    {
      id: "orderedList",
      icon: <FiList />,
      label: t("editor.orderedList"),
      onClick: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: () => editor.isActive("orderedList"),
      needsPopover: false,
    },
    {
      id: "blockquote",
      icon: <LuQuote />,
      label: t("editor.blockquote"),
      onClick: () => editor.chain().focus().toggleBlockquote().run(),
      isActive: () => editor.isActive("blockquote"),
      needsPopover: false,
    },
    {
      id: "link",
      icon: <FiLink />,
      label: t("editor.link"),
      onClick: () => {
        if (editor.isActive("link")) {
          handleLinkEdit()
        } else {
          setIsLinkOpen(true)
        }
      },
      isActive: () => editor.isActive("link"),
      needsPopover: true,
      popoverState: isLinkOpen,
      setPopoverState: setIsLinkOpen,
    },
    {
      id: "codeBlock",
      icon: <LuFileCode2 />,
      label: t("editor.codeBlock"),
      onClick: () => setIsCodeBlockOpen(true),
      isActive: () => editor.isActive("codeBlock"),
      needsPopover: true,
      popoverState: isCodeBlockOpen,
      setPopoverState: setIsCodeBlockOpen,
    },
    {
      id: "image",
      icon: <FiImage />,
      label: t("editor.image"),
      onClick: () => setIsImageOpen(true),
      isActive: () => editor.isActive("image"),
      needsPopover: true,
      popoverState: isImageOpen,
      setPopoverState: setIsImageOpen,
    },
  ]

  return (
    <HStack
      bg="white"
      _dark={{ bg: "gray.800", borderColor: "gray.600" }}
      border="1px"
      borderColor="gray.200"
      p={1}
      borderRadius="md"
      gap={0.5}
      boxShadow="lg"
      flexWrap="nowrap"
      minW="fit-content"
      overflowX="auto"
      overflowY="hidden"
    >
      {allTools.map((tool) => {
        if (tool.needsPopover) {
          return (
            <Popover.Root
              key={tool.id}
              open={tool.popoverState}
              onOpenChange={tool.setPopoverState}
              portalled={false}
            >
              <Popover.Trigger asChild>
                <IconButton
                  size="xs"
                  variant={tool.isActive() ? "solid" : "ghost"}
                  colorPalette={tool.isActive() ? "orange" : "gray"}
                  color={tool.isActive() ? "white" : "gray.800"}
                  _dark={{ color: tool.isActive() ? "white" : "gray.200" }}
                  aria-label={tool.label}
                  onClick={tool.onClick}
                >
                  {tool.icon}
                </IconButton>
              </Popover.Trigger>
              <Popover.Positioner>
                <Popover.Content maxW="sm" zIndex={10000}>
                  <Popover.Arrow />
                  <Popover.Body>
                    {tool.id === "link" && (
                      <VStack gap={3} align="stretch">
                        <Text fontSize="sm" fontWeight="medium">
                          {editor.isActive("link")
                            ? t("editor.editLink")
                            : t("editor.addLink")}
                        </Text>
                        <Input
                          placeholder={t("editor.enterUrl")}
                          value={linkUrl}
                          onChange={(e) => setLinkUrl(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleLinkSubmit()
                            }
                          }}
                          autoFocus
                        />
                        <HStack gap={2} justify="flex-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => tool.setPopoverState(false)}
                          >
                            {t("common.cancel")}
                          </Button>
                          {editor.isActive("link") && (
                            <Button
                              size="sm"
                              variant="ghost"
                              colorPalette="red"
                              onClick={handleLinkRemove}
                            >
                              {t("editor.remove")}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            colorPalette="orange"
                            onClick={handleLinkSubmit}
                          >
                            {editor.isActive("link")
                              ? t("editor.update")
                              : t("common.confirm")}
                          </Button>
                        </HStack>
                      </VStack>
                    )}
                    {tool.id === "codeBlock" && (
                      <VStack gap={3} align="stretch">
                        <Text fontSize="sm" fontWeight="medium">
                          {t("editor.insertCodeBlock")}
                        </Text>
                        <Box
                          as="select"
                          w="full"
                          p={2}
                          border="1px solid"
                          borderColor="gray.300"
                          borderRadius="md"
                          bg="white"
                          _dark={{
                            borderColor: "gray.600",
                            bg: "gray.700",
                            color: "white",
                          }}
                          value={codeBlockLanguage}
                          onChange={(e) => setCodeBlockLanguage(e.target.value)}
                        >
                          <option value="">
                            {t("editor.selectLanguageOptional")}
                          </option>
                          {programmingLanguages.map((lang) => (
                            <option key={lang.value} value={lang.value}>
                              {lang.label}
                            </option>
                          ))}
                        </Box>
                        <HStack gap={2} justify="flex-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => tool.setPopoverState(false)}
                          >
                            {t("common.cancel")}
                          </Button>
                          <Button
                            size="sm"
                            colorPalette="orange"
                            onClick={handleCodeBlockSubmit}
                          >
                            {t("editor.insert")}
                          </Button>
                        </HStack>
                      </VStack>
                    )}
                    {tool.id === "image" && (
                      <VStack gap={3} align="stretch">
                        <Text fontSize="sm" fontWeight="medium">
                          {t("editor.insertImage")}
                        </Text>
                        <Input
                          placeholder={t("editor.enterImageUrl")}
                          value={imageUrl}
                          onChange={(e) => setImageUrl(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleImageSubmit()
                            }
                          }}
                          autoFocus
                        />
                        {(() => {
                          const selectedText = editor.state.doc.textBetween(
                            editor.state.selection.from,
                            editor.state.selection.to,
                          )
                          return selectedText ? (
                            <Text fontSize="xs" color="gray.500">
                              {t("editor.selectedTextAsAlt", {
                                text: selectedText,
                              })}
                            </Text>
                          ) : null
                        })()}
                        <HStack gap={2} justify="flex-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => tool.setPopoverState(false)}
                          >
                            {t("common.cancel")}
                          </Button>
                          <Button
                            size="sm"
                            colorPalette="orange"
                            onClick={handleImageSubmit}
                          >
                            {t("common.confirm")}
                          </Button>
                        </HStack>
                      </VStack>
                    )}
                  </Popover.Body>
                </Popover.Content>
              </Popover.Positioner>
            </Popover.Root>
          )
        }

        return (
          <IconButton
            key={tool.id}
            size="xs"
            variant={tool.isActive() ? "solid" : "ghost"}
            colorPalette={tool.isActive() ? "orange" : "gray"}
            color={tool.isActive() ? "white" : "gray.800"}
            _dark={{ color: tool.isActive() ? "white" : "gray.200" }}
            aria-label={tool.label}
            onClick={tool.onClick}
          >
            {tool.icon}
          </IconButton>
        )
      })}
    </HStack>
  )
}
