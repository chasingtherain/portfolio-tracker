import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { POST } from '../app/api/auth/route'

const MOBILE_UA  = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
const ANDROID_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Mobile Safari/537.36'
const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

function makePostRequest(body: unknown, ua: string | null = DESKTOP_UA): Request {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (ua !== null) headers['user-agent'] = ua
  return new Request('http://localhost/api/auth', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

function parseCookieMaxAge(setCookie: string): number {
  const match = setCookie.match(/Max-Age=(\d+)/)
  return match ? parseInt(match[1], 10) : -1
}

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

describe('POST /api/auth — authentication', () => {
  beforeEach(() => vi.stubEnv('HOLDINGS_PASSWORD', 'testpass'))
  afterEach(() => vi.unstubAllEnvs())

  it('returns 200 for correct password', async () => {
    const res = await POST(makePostRequest({ password: 'testpass' }))
    expect(res.status).toBe(200)
  })

  it('returns 401 for wrong password', async () => {
    const res = await POST(makePostRequest({ password: 'wrong' }))
    expect(res.status).toBe(401)
  })

  it('returns 401 when password is missing', async () => {
    const res = await POST(makePostRequest({}))
    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid JSON', async () => {
    const req = new Request('http://localhost/api/auth', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not json',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})

// ---------------------------------------------------------------------------
// Cookie lifetime — desktop
// ---------------------------------------------------------------------------

describe('POST /api/auth — desktop cookie lifetime', () => {
  beforeEach(() => vi.stubEnv('HOLDINGS_PASSWORD', 'testpass'))
  afterEach(() => vi.unstubAllEnvs())

  it('sets a 7-day cookie for a desktop user-agent', async () => {
    const res = await POST(makePostRequest({ password: 'testpass' }, DESKTOP_UA))
    const cookie = res.headers.get('set-cookie') ?? ''
    expect(parseCookieMaxAge(cookie)).toBe(7 * 24 * 60 * 60)
  })

  it('sets a 7-day cookie when user-agent is absent', async () => {
    const res = await POST(makePostRequest({ password: 'testpass' }, null))
    const cookie = res.headers.get('set-cookie') ?? ''
    expect(parseCookieMaxAge(cookie)).toBe(7 * 24 * 60 * 60)
  })
})

// ---------------------------------------------------------------------------
// Cookie lifetime — mobile
// ---------------------------------------------------------------------------

describe('POST /api/auth — mobile cookie lifetime', () => {
  beforeEach(() => vi.stubEnv('HOLDINGS_PASSWORD', 'testpass'))
  afterEach(() => vi.unstubAllEnvs())

  it('sets a 5-minute cookie for an iPhone user-agent', async () => {
    const res = await POST(makePostRequest({ password: 'testpass' }, MOBILE_UA))
    const cookie = res.headers.get('set-cookie') ?? ''
    expect(parseCookieMaxAge(cookie)).toBe(5 * 60)
  })

  it('sets a 5-minute cookie for an Android user-agent', async () => {
    const res = await POST(makePostRequest({ password: 'testpass' }, ANDROID_UA))
    const cookie = res.headers.get('set-cookie') ?? ''
    expect(parseCookieMaxAge(cookie)).toBe(5 * 60)
  })

  it('sets the correct cookie name on mobile', async () => {
    const res = await POST(makePostRequest({ password: 'testpass' }, MOBILE_UA))
    const cookie = res.headers.get('set-cookie') ?? ''
    expect(cookie).toContain('portfolio-auth=')
  })

  it('includes HttpOnly on the mobile cookie', async () => {
    const res = await POST(makePostRequest({ password: 'testpass' }, MOBILE_UA))
    const cookie = res.headers.get('set-cookie') ?? ''
    expect(cookie).toContain('HttpOnly')
  })
})
