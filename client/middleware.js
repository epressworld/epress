import { NextResponse } from "next/server"

/**
 * Middleware to handle installation status and auth token injection
 */
export async function middleware(request) {
  // Inject auth token if present
  const token = request.cookies.get("authToken")?.value
  if (token) {
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set("authorization", `Bearer ${token}`)
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  return NextResponse.next()
}

// Match all routes except static files and Next.js internals
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json).*)",
  ],
}
