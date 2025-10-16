import { decode } from "jsonwebtoken"
import { NextResponse } from "next/server"

export async function POST(request) {
  try {
    const { token } = await request.json()
    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { ok: false, error: "Invalid token" },
        { status: 400 },
      )
    }

    // 解析JWT token获取过期时间
    let maxAge = 60 * 60 * 24 // 默认1天
    try {
      const decoded = decode(token)
      if (decoded?.exp) {
        const currentTime = Math.floor(Date.now() / 1000)
        const remainingTime = decoded.exp - currentTime
        // 如果token还有效,使用剩余时间;否则使用默认值
        if (remainingTime > 0) {
          maxAge = remainingTime
        }
      }
    } catch (error) {
      console.error("Failed to decode JWT token:", error)
      // 解析失败时使用默认值
    }

    const res = NextResponse.json({ ok: true })
    res.cookies.set({
      name: "authToken",
      value: token,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge, // 使用从JWT解析的过期时间
    })
    return res
  } catch {
    return NextResponse.json(
      { ok: false, error: "Failed to set cookie" },
      { status: 500 },
    )
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set({
    name: "authToken",
    value: "",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  })
  return res
}

// 返回是否存在 HttpOnly authToken，用于客户端检测登录状态
export async function GET(request) {
  try {
    const cookieHeader = request.headers.get("cookie") || ""
    const match = cookieHeader.match(/(?:^|;\s*)authToken=([^;]+)/)
    const token = match ? decodeURIComponent(match[1]) : null

    return NextResponse.json({ authenticated: Boolean(token) }, { status: 200 })
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 200 })
  }
}
