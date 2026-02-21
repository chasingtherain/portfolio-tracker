import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock @vercel/kv for the rate-limiting logic (kv.get / kv.set called directly in the route)
vi.mock('@vercel/kv', () => ({
  kv: {
    get: vi.fn(),
    set: vi.fn(),
  },
}))

// Mock lib/kv helpers — keep toClientHoldings real so we can verify the
// security boundary (cost basis stripped) without re-testing the function itself
vi.mock('../lib/kv', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/kv')>()
  return {
    ...actual,
    getHoldings:    vi.fn(),
    setHoldings:    vi.fn(),
    resetChecklist: vi.fn(),
  }
})

import { kv } from '@vercel/kv'
import { GET, PUT } from '../app/api/holdings/route'
import { getHoldings, setHoldings, resetChecklist, DEFAULT_HOLDINGS } from '../lib/kv'
import type { Holdings } from '../lib/types'

const mockKvGet  = vi.mocked(kv.get)
const mockKvSet  = vi.mocked(kv.set)
const mockGetHoldings    = vi.mocked(getHoldings)
const mockSetHoldings    = vi.mocked(setHoldings)
const mockResetChecklist = vi.mocked(resetChecklist)

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const STORED_HOLDINGS: Holdings = {
  btc:       { qty: 3.2,   costBasis: 45000 },
  mstr:      { qty: 200,   costBasis: 180 },
  near:      { qty: 4000,  costBasis: 3.5 },
  uni:       { qty: 800,   costBasis: 8 },
  link:      { qty: 600,   costBasis: 12 },
  ondo:      { qty: 8000,  costBasis: 0.8 },
  eth:       { qty: 2.5,   costBasis: 2200 },
  dryPowder: 12000,
  nupl:      0.55,
  updatedAt: '2025-01-15T09:45:00.000Z',
}

const VALID_PUT_BODY = {
  password: 'testpass',
  btc:       { qty: 3.2,   costBasis: 45000 },
  mstr:      { qty: 200,   costBasis: 180 },
  near:      { qty: 4000,  costBasis: 3.5 },
  uni:       { qty: 800,   costBasis: 8 },
  link:      { qty: 600,   costBasis: 12 },
  ondo:      { qty: 8000,  costBasis: 0.8 },
  eth:       { qty: 2.5,   costBasis: 2200 },
  dryPowder: 12000,
  nupl:      0.55,
}

function makePutRequest(body: unknown, ip = '1.2.3.4'): Request {
  return new Request('http://localhost/api/holdings', {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': ip,
    },
    body: JSON.stringify(body),
  })
}

// ---------------------------------------------------------------------------
// GET /api/holdings
// ---------------------------------------------------------------------------

describe('GET /api/holdings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetHoldings.mockResolvedValue(STORED_HOLDINGS)
  })

  it('returns 200', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it('response does not contain costBasis', async () => {
    const res = await GET()
    const body = await res.text()
    expect(body).not.toContain('costBasis')
    expect(body).not.toContain('cost')
  })

  it('response contains correct qty values', async () => {
    const res = await GET()
    const body = await res.json()
    expect(body.btc.qty).toBe(3.2)
    expect(body.mstr.qty).toBe(200)
    expect(body.dryPowder).toBe(12000)
    expect(body.nupl).toBe(0.55)
  })

  it('calls getHoldings', async () => {
    await GET()
    expect(mockGetHoldings).toHaveBeenCalledOnce()
  })
})

// ---------------------------------------------------------------------------
// PUT /api/holdings — authentication
// ---------------------------------------------------------------------------

describe('PUT /api/holdings — authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('HOLDINGS_PASSWORD', 'testpass')
    mockKvGet.mockResolvedValue(0)     // not rate-limited
    mockKvSet.mockResolvedValue(undefined)
    mockSetHoldings.mockResolvedValue(undefined)
    mockResetChecklist.mockResolvedValue(undefined)
  })
  afterEach(() => vi.unstubAllEnvs())

  it('returns 401 for wrong password', async () => {
    const req = makePutRequest({ ...VALID_PUT_BODY, password: 'wrong' })
    const res = await PUT(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 when password field is absent (body fails validation before auth check)', async () => {
    // validateBody checks typeof b.password === 'string' — undefined is not a string,
    // so the request fails body validation (400) before reaching the auth comparison.
    const { password: _pw, ...noPw } = VALID_PUT_BODY
    const req = makePutRequest(noPw)
    const res = await PUT(req)
    expect(res.status).toBe(400)
  })

  it('returns 200 for correct password', async () => {
    const req = makePutRequest(VALID_PUT_BODY)
    const res = await PUT(req)
    expect(res.status).toBe(200)
  })
})

// ---------------------------------------------------------------------------
// PUT /api/holdings — validation
// ---------------------------------------------------------------------------

describe('PUT /api/holdings — validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('HOLDINGS_PASSWORD', 'testpass')
    mockKvGet.mockResolvedValue(0)
    mockKvSet.mockResolvedValue(undefined)
    mockSetHoldings.mockResolvedValue(undefined)
    mockResetChecklist.mockResolvedValue(undefined)
  })
  afterEach(() => vi.unstubAllEnvs())

  it('returns 400 for invalid JSON', async () => {
    const req = new Request('http://localhost/api/holdings', {
      method: 'PUT',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
      body: 'not json',
    })
    const res = await PUT(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when btc asset is missing', async () => {
    const { btc: _btc, ...noBtc } = VALID_PUT_BODY
    const req = makePutRequest(noBtc)
    const res = await PUT(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when qty is negative', async () => {
    const req = makePutRequest({ ...VALID_PUT_BODY, btc: { qty: -1, costBasis: 45000 } })
    const res = await PUT(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when costBasis is negative', async () => {
    const req = makePutRequest({ ...VALID_PUT_BODY, mstr: { qty: 100, costBasis: -1 } })
    const res = await PUT(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when dryPowder is missing', async () => {
    const req = makePutRequest({ ...VALID_PUT_BODY, dryPowder: undefined })
    const res = await PUT(req)
    expect(res.status).toBe(400)
  })

  it('accepts dryPowder of 0', async () => {
    const req = makePutRequest({ ...VALID_PUT_BODY, dryPowder: 0 })
    const res = await PUT(req)
    expect(res.status).toBe(200)
  })
})

// ---------------------------------------------------------------------------
// PUT /api/holdings — rate limiting
// ---------------------------------------------------------------------------

describe('PUT /api/holdings — rate limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('HOLDINGS_PASSWORD', 'testpass')
    mockKvSet.mockResolvedValue(undefined)
    mockSetHoldings.mockResolvedValue(undefined)
    mockResetChecklist.mockResolvedValue(undefined)
  })
  afterEach(() => vi.unstubAllEnvs())

  it('returns 429 when rate limit is reached (count >= 5)', async () => {
    mockKvGet.mockResolvedValue(5)    // already at limit
    const req = makePutRequest(VALID_PUT_BODY)
    const res = await PUT(req)
    expect(res.status).toBe(429)
  })

  it('allows request when count is 4 (one below limit)', async () => {
    mockKvGet.mockResolvedValue(4)
    const req = makePutRequest(VALID_PUT_BODY)
    const res = await PUT(req)
    expect(res.status).toBe(200)
  })

  it('allows request when KV has no entry for IP (first request)', async () => {
    mockKvGet.mockResolvedValue(null)  // fresh IP
    const req = makePutRequest(VALID_PUT_BODY)
    const res = await PUT(req)
    expect(res.status).toBe(200)
  })

  it('increments the rate limit counter in KV', async () => {
    mockKvGet.mockResolvedValue(2)
    const req = makePutRequest(VALID_PUT_BODY, '5.5.5.5')
    await PUT(req)
    // First set call is the rate limit increment
    const [key, value] = mockKvSet.mock.calls[0] as [string, number, object]
    expect(key).toBe('ratelimit:5.5.5.5')
    expect(value).toBe(3)
  })

  it('does not write holdings when rate limited', async () => {
    mockKvGet.mockResolvedValue(5)
    const req = makePutRequest(VALID_PUT_BODY)
    await PUT(req)
    expect(mockSetHoldings).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// PUT /api/holdings — successful write
// ---------------------------------------------------------------------------

describe('PUT /api/holdings — successful write', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('HOLDINGS_PASSWORD', 'testpass')
    mockKvGet.mockResolvedValue(0)
    mockKvSet.mockResolvedValue(undefined)
    mockSetHoldings.mockResolvedValue(undefined)
    mockResetChecklist.mockResolvedValue(undefined)
  })
  afterEach(() => vi.unstubAllEnvs())

  it('returns { ok: true }', async () => {
    const req = makePutRequest(VALID_PUT_BODY)
    const res = await PUT(req)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it('calls setHoldings with the holdings data', async () => {
    const req = makePutRequest(VALID_PUT_BODY)
    await PUT(req)
    expect(mockSetHoldings).toHaveBeenCalledOnce()
    const [stored] = mockSetHoldings.mock.calls[0] as [Holdings]
    expect(stored.btc.qty).toBe(3.2)
    expect(stored.btc.costBasis).toBe(45000)
    expect(stored.dryPowder).toBe(12000)
  })

  it('sets updatedAt on the server (not from client body)', async () => {
    const req = makePutRequest(VALID_PUT_BODY)
    await PUT(req)
    const [stored] = mockSetHoldings.mock.calls[0] as [Holdings]
    expect(typeof stored.updatedAt).toBe('string')
    // Should be a recent timestamp, not epoch zero
    expect(new Date(stored.updatedAt).getTime()).toBeGreaterThan(Date.now() - 5000)
  })

  it('does not store the password in holdings', async () => {
    const req = makePutRequest(VALID_PUT_BODY)
    await PUT(req)
    const [stored] = mockSetHoldings.mock.calls[0] as [Holdings]
    expect(JSON.stringify(stored)).not.toContain('testpass')
  })

  it('calls resetChecklist after saving holdings', async () => {
    const req = makePutRequest(VALID_PUT_BODY)
    await PUT(req)
    expect(mockResetChecklist).toHaveBeenCalledOnce()
  })
})
