export const runtime = 'nodejs'

import { kv } from '@vercel/kv'

// Shared rate-limit constants — same window as /api/holdings
const RATE_LIMIT         = 5
const RATE_LIMIT_TTL_SECS = 900
const SESSION_TTL_SECS   = 300   // 5-minute one-time-use token

// ---------------------------------------------------------------------------
// Mobile detection
// ---------------------------------------------------------------------------

function isMobileUA(ua: string | null): boolean {
  if (!ua) return false
  return /mobile|android|iphone|ipad|ipod/i.test(ua)
}

// ---------------------------------------------------------------------------
// POST /api/session
//
// Issues a short-lived session token for mobile clients.
// Desktop clients use the inline-password path on PUT /api/holdings instead.
//
// Flow:
//   1. Reject non-mobile User-Agent → 403
//   2. Rate-limit by IP (same 5/15-min window as /api/holdings)
//   3. Validate password → 401 on mismatch
//   4. Generate crypto.randomUUID() token
//   5. Store in KV: session:<token> = 1 with 300s TTL
//   6. Return { token }
//
// The token is consumed (deleted) on first use by PUT /api/holdings.
// After 5 minutes the KV TTL expires it automatically.
// ---------------------------------------------------------------------------

export async function POST(request: Request): Promise<Response> {
  // Mobile gate — server-side UA check so the client cannot bypass it
  const ua = request.headers.get('user-agent')
  if (!isMobileUA(ua)) {
    return new Response('Desktop clients use inline password auth', { status: 403 })
  }

  // Rate limiting via KV (never in-memory — serverless memory resets on cold start)
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    '127.0.0.1'

  const rateLimitKey = `ratelimit:${ip}`
  const count = (await kv.get<number>(rateLimitKey)) ?? 0

  if (count >= RATE_LIMIT) {
    return new Response('Too many requests', { status: 429 })
  }

  await kv.set(rateLimitKey, count + 1, { ex: RATE_LIMIT_TTL_SECS })

  // Parse body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  if (typeof body !== 'object' || body === null || typeof (body as Record<string, unknown>).password !== 'string') {
    return new Response('Invalid request body', { status: 400 })
  }

  const { password } = body as { password: string }

  // Plain text comparison — intentional, per CLAUDE.md
  if (password !== process.env.HOLDINGS_PASSWORD) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Issue one-time token
  const token = crypto.randomUUID()
  await kv.set(`session:${token}`, 1, { ex: SESSION_TTL_SECS })

  return Response.json({ token })
}
