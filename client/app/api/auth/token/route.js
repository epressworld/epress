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

    const res = NextResponse.json({ ok: true })
    res.cookies.set({
      name: "authToken",
      value: token,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24, // 1 day; server also enforces expiry
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
