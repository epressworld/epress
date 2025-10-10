"use client"
import {
  Button,
  CloseButton,
  Dialog,
  Field,
  HStack,
  Input,
  Portal,
} from "@chakra-ui/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useTranslation } from "../../hooks/useTranslation"

export function SearchDialog({ isOpen, onClose, initialKeyword = "" }) {
  const { common } = useTranslation()
  const router = useRouter()
  const [keyword, setKeyword] = useState(initialKeyword)

  // 当对话框打开时，重置关键词为初始值
  useEffect(() => {
    if (isOpen) {
      setKeyword(initialKeyword)
    }
  }, [isOpen, initialKeyword])

  const handleSearch = () => {
    if (keyword.trim()) {
      // 导航到带有搜索参数的出版物页面
      router.push(`/publications?q=${encodeURIComponent(keyword.trim())}`)
      onClose()
    } else {
      // 如果关键词为空，则清除搜索并返回到出版物页面
      router.push("/publications")
      onClose()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose} closeOnEscape={true}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>{common.search()}</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body>
              <Field.Root>
                <Field.Label>{common.keyword()}</Field.Label>
                <Input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={common.enterKeyword()}
                  autoFocus
                />
              </Field.Root>
            </Dialog.Body>
            <Dialog.Footer>
              <HStack gap={2} justify="end">
                <Button variant="outline" onClick={onClose}>
                  {common.cancel()}
                </Button>
                <Button onClick={handleSearch} colorPalette="orange">
                  {common.search()}
                </Button>
              </HStack>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
