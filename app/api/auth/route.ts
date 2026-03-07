export const runtime = 'nodejs'

// POST /api/auth — validates password and sets a session cookie.
// Plain text comparison, intentional — consistent with HOLDINGS_PASSWORD design.
//
// Cookie lifetime:
//   Mobile (detected by User-Agent): 5 minutes — short window to limit
//   exposure if a phone is picked up by someone else.
//   Desktop: 5 minutes — same short window as mobile.
//
// Optional mode:
//   AUTH_SESSION_ON_CLOSE=true → issue a session cookie (no Max-Age),
//   so users must re-authenticate after fully quitting the browser/app.

const DESKTOP_MAX_AGE = 5 * 60             // 5 minutes in seconds
const MOBILE_MAX_AGE  = 5 * 60             // 5 minutes in seconds

function isMobileUA(ua: string | null): boolean {
  if (!ua) return false
  return /mobile|android|iphone|ipad|ipod/i.test(ua)
}

function shouldUseSessionCookie(): boolean {
  const value = process.env.AUTH_SESSION_ON_CLOSE?.trim().toLowerCase()
  return value === '1' || value === 'true' || value === 'yes' || value === 'on'
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
  const secure = process.env.NODE_ENV === 'production'
  const cookieParts = [
    `portfolio-auth=${process.env.HOLDINGS_PASSWORD}`,
    'HttpOnly',
    secure ? 'Secure' : null,
    'SameSite=Strict',
    'Path=/',
  ]

  if (!shouldUseSessionCookie()) {
    cookieParts.push(`Max-Age=${maxAge}`)
  }

  const cookie = cookieParts.filter(Boolean).join('; ')

  return new Response('OK', {
    status: 200,
    headers: { 'Set-Cookie': cookie },
  })
}
