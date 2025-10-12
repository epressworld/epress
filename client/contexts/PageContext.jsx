"use client"

import { createContext, useContext } from "react"

export const PageContext = createContext()

export const usePage = () => {
  const context = useContext(PageContext)
  if (!context) {
    throw new Error("usePage must be used within a PageProvider")
  }
  return context
}
