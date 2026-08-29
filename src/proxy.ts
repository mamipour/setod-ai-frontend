import { NextRequest, NextResponse } from "next/server"

const PUBLIC_PATHS = ["/", "/login", "/invite", "/terms", "/privacy"]

// Reachable by anyone, signed in or not  -  landing + legal pages must never bounce.
const UNRESTRICTED_PATHS = ["/", "/invite", "/terms", "/privacy"]

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Exact match for "/" to avoid "/" matching every path via startsWith.
  const matches = (p: string) => p === "/" ? pathname === "/" : pathname === p || pathname.startsWith(p + "/")
  const isPublic = PUBLIC_PATHS.some(matches)
  const isUnrestricted = UNRESTRICTED_PATHS.some(matches)
  const hasToken = req.cookies.has("access_token")

  if (!isPublic && !hasToken) {
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = "/login"
    return NextResponse.redirect(loginUrl)
  }

  if (isPublic && hasToken && !isUnrestricted) {
    const dashUrl = req.nextUrl.clone()
    dashUrl.pathname = "/dashboard"
    return NextResponse.redirect(dashUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png|.*\\.ico|.*\\.webp).*)"],
}
