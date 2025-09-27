import { NextResponse } from "next/server"

// 将 HttpOnly cookie 中的 authToken 注入为 Authorization 头
export function middleware(request) {
  const token = request.cookies.get("authToken")?.value

  if (!token) {
    return NextResponse.next()
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("authorization", `Bearer ${token}`)

  // 继续后续处理（包括重写到外部 API）时带上新的请求头
  return NextResponse.next({ request: { headers: requestHeaders } })
}

// 仅匹配需要代理到后端的路径，以及 /feed（其可读取 Authorization）
export const config = {
  matcher: ["/api/:path*", "/ewp/:path*", "/feed"],
}
