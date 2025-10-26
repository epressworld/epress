import { NextResponse } from "next/server"

export async function proxy(request) {
  const token = request.cookies.get("authToken")?.value

  // 没有 token 直接放行
  if (!token) {
    return NextResponse.next()
  }

  // 有 token 时添加到 headers
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("authorization", `Bearer ${token}`)

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: "/api/:path*", // 只匹配 /api 开头的所有路径
}
