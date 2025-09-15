"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { translations } from "../utils/translations"

const LanguageContext = createContext()

export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}

export const LanguageProvider = ({ children, defaultLanguage = "en" }) => {
  const [currentLanguage, setCurrentLanguage] = useState(defaultLanguage)
  const [currentTranslations, setCurrentTranslations] = useState(
    translations[defaultLanguage] || translations.en,
  )

  // 从localStorage恢复语言设置
  useEffect(() => {
    const savedLanguage = localStorage.getItem("epress-language")
    if (savedLanguage && (savedLanguage === "en" || savedLanguage === "zh")) {
      setCurrentLanguage(savedLanguage)
      setCurrentTranslations(translations[savedLanguage] || translations.en)
    }
  }, [])

  // 切换语言（仅本地切换，不保存到服务器）
  const switchLanguage = (newLanguage) => {
    if (newLanguage === currentLanguage) return

    // 保存到localStorage
    localStorage.setItem("epress-language", newLanguage)
    setCurrentLanguage(newLanguage)
    setCurrentTranslations(translations[newLanguage] || translations.en)
  }

  // 翻译函数
  const t = (key, params = {}) => {
    const keys = key.split(".")
    let value = currentTranslations

    for (const k of keys) {
      if (value && typeof value === "object") {
        value = value[k]
      } else {
        return key // 如果找不到翻译，返回key本身
      }
    }

    if (typeof value === "string") {
      // 简单的参数替换
      return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
        return params[paramKey] || match
      })
    }

    if (typeof value === "function") {
      // 如果是函数，调用函数并传入参数
      // 如果params是数字，直接传入；如果是对象，传入对象
      return value(params)
    }

    return key
  }

  const value = {
    currentLanguage,
    switchLanguage,
    t,
    translations: currentTranslations,
    isLoading: false, // 现在翻译是同步的，不需要loading状态
    isEnglish: currentLanguage === "en",
    isChinese: currentLanguage === "zh",
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}
