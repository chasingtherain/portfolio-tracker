import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@vercel/kv', () => ({
  kv: {
    get: vi.fn(),
    set: vi.fn(),
  },
}))

import { kv } from '@vercel/kv'
import { POST } from '../app/api/session/route'

const mockKvGet = vi.mocked(kv.get)
const mockKvSet = vi.mocked(kv.set)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOBILE_UA  = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
const ANDROID_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Mobile Safari/537.36'

function makePostRequest(body: unknown, ua: string | null = MOBILE_UA, ip = '1.2.3.4'): Request {
  const headers: Record<string, string> = {
    'content-type':    'application/json',
    'x-forwarded-for': ip,
  }
  if (ua !== null) headers['user-agent'] = ua
  return new Request('http://localhost/api/session', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

// ---------------------------------------------------------------------------
// Mobile detection
// ---------------------------------------------------------------------------

describe('POST /api/session — mobile detection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('HOLDINGS_PASSWORD', 'testpass')
    mockKvGet.mockResolvedValue(0)
    mockKvSet.mockResolvedValue(undefined)
  })
  afterEach(() => vi.unstubAllEnvs())

  it('returns 403 for a desktop user-agent', async () => {
    const req = makePostRequest({ password: 'testpass' }, DESKTOP_UA)
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('returns 200 for an iPhone user-agent', async () => {
    const req = makePostRequest({ password: 'testpass' }, MOBILE_UA)
    const res = await POST(req)
    expect(res.status).toBe(200)
  })

  it('returns 200 for an Android user-agent', async () => {
    const req = makePostRequest({ password: 'testpass' }, ANDROID_UA)
    const res = await POST(req)
    expect(res.status).toBe(200)
  })

  it('returns 403 when user-agent header is absent', async () => {
    const req = makePostRequest({ password: 'testpass' }, null)
    const res = await POST(req)
    expect(res.status).toBe(403)
  })
})

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

describe('POST /api/session — authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('HOLDINGS_PASSWORD', 'testpass')
    mockKvGet.mockResolvedValue(0)
    mockKvSet.mockResolvedValue(undefined)
  })
  afterEach(() => vi.unstubAllEnvs())

  it('returns 401 for wrong password', async () => {
    const req = makePostRequest({ password: 'wrong' })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 200 and a token for correct password', async () => {
    const req = makePostRequest({ password: 'testpass' })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(typeof body.token).toBe('string')
    expect(body.token.length).toBeGreaterThan(0)
  })

  it('stores the token in KV with 300s TTL', async () => {
    const req = makePostRequest({ password: 'testpass' })
    await POST(req)
    // Find the session:* set call (the other call is the rate-limit counter)
    const sessionCall = mockKvSet.mock.calls.find(([key]) => String(key).startsWith('session:'))
    expect(sessionCall).toBeDefined()
    const [, value, options] = sessionCall as [string, unknown, { ex: number }]
    expect(value).toBe(1)
    expect(options.ex).toBe(300)
  })

  it('returns 400 for invalid JSON', async () => {
    const req = new Request('http://localhost/api/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '1.2.3.4', 'user-agent': MOBILE_UA },
      body: 'not json',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when password is missing from body', async () => {
    const req = makePostRequest({})
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

describe('POST /api/session — rate limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('HOLDINGS_PASSWORD', 'testpass')
    mockKvSet.mockResolvedValue(undefined)
  })
  afterEach(() => vi.unstubAllEnvs())

  it('returns 429 when rate limit is reached (count >= 5)', async () => {
    mockKvGet.mockResolvedValue(5)
    const req = makePostRequest({ password: 'testpass' })
    const res = await POST(req)
    expect(res.status).toBe(429)
  })

  it('allows request when count is 4 (one below limit)', async () => {
    mockKvGet.mockResolvedValue(4)
    const req = makePostRequest({ password: 'testpass' })
    const res = await POST(req)
    expect(res.status).toBe(200)
  })

  it('allows request on first attempt (no KV entry for IP)', async () => {
    mockKvGet.mockResolvedValue(null)
    const req = makePostRequest({ password: 'testpass' })
    const res = await POST(req)
    expect(res.status).toBe(200)
  })

  it('increments the rate-limit counter in KV', async () => {
    mockKvGet.mockResolvedValue(2)
    const req = makePostRequest({ password: 'testpass' }, MOBILE_UA, '9.9.9.9')
    await POST(req)
    const rateLimitCall = mockKvSet.mock.calls.find(([key]) => String(key).startsWith('ratelimit:'))
    expect(rateLimitCall).toBeDefined()
    const [key, value] = rateLimitCall as [string, number]
    expect(key).toBe('ratelimit:9.9.9.9')
    expect(value).toBe(3)
  })
})
