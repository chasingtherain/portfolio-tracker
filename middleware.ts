import { NextRequest, NextResponse } from 'next/server'

// Auth middleware — protects the live dashboard behind a password login.
// Only active when HOLDINGS_PASSWORD is set (i.e. live mode).
// Demo deployment has no HOLDINGS_PASSWORD, so auth is skipped entirely.

export function middleware(request: NextRequest) {
  const password = process.env.HOLDINGS_PASSWORD

  // No password configured — demo mode or local dev without env var. Let everything through.
  if (!password) return NextResponse.next()

  const { pathname } = request.nextUrl

  // Always allow the login page and auth API through — otherwise you can never log in.
  if (pathname === '/login' || pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  // Check for a valid session cookie.
  const session = request.cookies.get('portfolio-auth')
  if (session?.value === password) {
    return NextResponse.next()
  }

  // Not authenticated — redirect to login.
  return NextResponse.redirect(new URL('/login', request.url))
}

export const config = {
  // Run on all routes except Next.js internals and static files.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
