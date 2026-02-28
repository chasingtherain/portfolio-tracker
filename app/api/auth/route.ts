export const runtime = 'nodejs'

// POST /api/auth — validates password and sets a session cookie.
// Plain text comparison, intentional — consistent with HOLDINGS_PASSWORD design.
//
// Cookie lifetime:
//   Mobile (detected by User-Agent): 5 minutes — short window to limit
//   exposure if a phone is picked up by someone else.
//   Desktop: 7 days — normal persistent session.

const DESKTOP_MAX_AGE = 7 * 24 * 60 * 60  // 7 days in seconds
const MOBILE_MAX_AGE  = 5 * 60             // 5 minutes in seconds

function isMobileUA(ua: string | null): boolean {
  if (!ua) return false
  return /mobile|android|iphone|ipad|ipod/i.test(ua)
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  if (typeof body !== 'object' || body === null) {
    return new Response('Invalid request', { status: 400 })
  }

  const { password } = body as Record<string, unknown>

  if (typeof password !== 'string' || password !== process.env.HOLDINGS_PASSWORD) {
    return new Response('Incorrect password', { status: 401 })
  }

  const ua      = request.headers.get('user-agent')
  const maxAge  = isMobileUA(ua) ? MOBILE_MAX_AGE : DESKTOP_MAX_AGE

  // Secure flag only in production — localhost uses HTTP so Secure would block the cookie.
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  const cookie = `portfolio-auth=${process.env.HOLDINGS_PASSWORD}; HttpOnly${secure}; SameSite=Strict; Max-Age=${maxAge}; Path=/`

  return new Response('OK', {
    status: 200,
    headers: { 'Set-Cookie': cookie },
  })
}
