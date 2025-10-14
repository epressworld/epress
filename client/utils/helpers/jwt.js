import { decode } from "jsonwebtoken"

// 检查token是否过期
export const isTokenExpired = (token) => {
  if (!token) return true

  try {
    const decoded = decode(token)
    if (!decoded || !decoded.exp) return true
    const currentTime = Date.now() / 1000
    return decoded.exp < currentTime
  } catch (error) {
    console.error("Invalid token:", error)
    return true
  }
}

// 获取token中的用户信息
export const getUserFromToken = (token) => {
  if (!token) return null

  try {
    return decode(token)
  } catch (error) {
    console.error("Invalid token:", error)
    return null
  }
}
