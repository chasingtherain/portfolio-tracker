export const runtime = 'nodejs'

// POST /api/auth — validates password and sets a 7-day session cookie.
// Plain text comparison, intentional — consistent with HOLDINGS_PASSWORD design.

const SESSION_MAX_AGE = 7 * 24 * 60 * 60 // 7 days in seconds

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

  // Secure flag only in production — localhost uses HTTP so Secure would block the cookie.
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  const cookie = `portfolio-auth=${process.env.HOLDINGS_PASSWORD}; HttpOnly${secure}; SameSite=Strict; Max-Age=${SESSION_MAX_AGE}; Path=/`

  return new Response('OK', {
    status: 200,
    headers: { 'Set-Cookie': cookie },
  })
}
