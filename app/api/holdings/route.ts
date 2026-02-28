export const runtime = 'nodejs'

import { kv } from '@vercel/kv'
import type { Holdings } from '@/lib/types'
import { getHoldings, setHoldings, toClientHoldings, resetChecklist } from '@/lib/kv'

type AuthField = { password: string } | { token: string }

// 5 write attempts per 15-minute window per IP.
// Appropriate for a single-user personal tool.
const RATE_LIMIT = 5
const RATE_LIMIT_TTL_SECS = 900

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function isNonNegativeFinite(v: unknown): v is number {
  return typeof v === 'number' && isFinite(v) && v >= 0
}

function isAssetHolding(v: unknown): v is { qty: number; costBasis: number } {
  if (typeof v !== 'object' || v === null) return false
  const obj = v as Record<string, unknown>
  return isNonNegativeFinite(obj.qty) && isNonNegativeFinite(obj.costBasis)
}

function validateBody(
  body: unknown
): body is AuthField & Omit<Holdings, 'updatedAt'> {
  if (typeof body !== 'object' || body === null) return false
  const b = body as Record<string, unknown>

  // Exactly one of password or token must be present — not both, not neither.
  const hasPassword = typeof b.password === 'string'
  const hasToken    = typeof b.token    === 'string'
  if (hasPassword === hasToken) return false

  return (
    isAssetHolding(b.btc) &&
    isAssetHolding(b.mstr) &&
    isAssetHolding(b.near) &&
    isAssetHolding(b.uni) &&
    isAssetHolding(b.link) &&
    isAssetHolding(b.ondo) &&
    isNonNegativeFinite(b.dryPowder) &&
    typeof b.nupl === 'number' && isFinite(b.nupl)
  )
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export async function GET(): Promise<Response> {
  const holdings = await getHoldings()
  // toClientHoldings strips costBasis — the security boundary
  return Response.json(toClientHoldings(holdings))
}

export async function PUT(request: Request): Promise<Response> {
  // Rate limiting via KV — never in-memory (serverless memory resets on cold start)
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    '127.0.0.1'

  const rateLimitKey = `ratelimit:${ip}`
  const count = (await kv.get<number>(rateLimitKey)) ?? 0

  if (count >= RATE_LIMIT) {
    return new Response('Too many requests', { status: 429 })
  }

  // Increment counter and (re)set the TTL window
  await kv.set(rateLimitKey, count + 1, { ex: RATE_LIMIT_TTL_SECS })

  // Parse body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  if (!validateBody(body)) {
    return new Response('Invalid request body', { status: 400 })
  }

  // Authenticate — two paths depending on whether this is a mobile (token) or desktop (password) request
  if ('token' in body) {
    // Mobile path: validate the one-time session token issued by POST /api/session.
    // Deleting the key immediately makes it single-use — a second request with the
    // same token will find nothing in KV and get a 401.
    const tokenKey = `session:${body.token}`
    const exists = await kv.get(tokenKey)
    if (!exists) {
      return new Response('Session expired or already used', { status: 401 })
    }
    await kv.del(tokenKey)
  } else {
    // Desktop path — intentionally plain text per CLAUDE.md:
    // "Password comparison is intentionally plain text. Do not add bcrypt."
    if (body.password !== process.env.HOLDINGS_PASSWORD) {
      return new Response('Unauthorized', { status: 401 })
    }
  }

  // Build Holdings explicitly — avoids spreading auth fields (password or token)
  // into the stored object. updatedAt is stamped server-side; clients can't forge it.
  const holdings: Holdings = {
    btc:       body.btc,
    mstr:      body.mstr,
    near:      body.near,
    uni:       body.uni,
    link:      body.link,
    ondo:      body.ondo,
    dryPowder: body.dryPowder,
    nupl:      body.nupl,
    updatedAt: new Date().toISOString(),
  }

  await setHoldings(holdings)

  // Reset the checklist — a new holdings write starts a new decision cycle
  await resetChecklist()

  return Response.json({ ok: true })
}
