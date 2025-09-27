"use client"
import { usePagePreload } from "../client/apollo-provider"

export default function PreloadApolloCache({ serverDataMap }) {
  usePagePreload(serverDataMap)
  return null
}
