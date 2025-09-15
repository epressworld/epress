"use client"

import { useEffect } from "react"
import { usePage } from "../contexts/PageContext"

/**
 * 自定义 hook 用于管理页面标题
 * 格式：{页面标题} - {节点标题} - epress
 */
export const usePageTitle = (pageTitle) => {
  const { profile, loading } = usePage()

  useEffect(() => {
    if (loading) return // 等待节点数据加载完成

    const nodeTitle = profile?.title
    const title = nodeTitle
      ? `${pageTitle} - ${nodeTitle} - epress`
      : `${pageTitle} - epress`

    document.title = title
  }, [pageTitle, profile?.title, loading])

  return {
    nodeTitle: profile?.title,
    isLoading: loading,
  }
}
