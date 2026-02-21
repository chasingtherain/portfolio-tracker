import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the global fetch — the prices route uses it for all four external APIs
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import { fetchPrices, GET } from '../app/api/prices/route'

// ---------------------------------------------------------------------------
// Helpers — stub responses for each external API
// ---------------------------------------------------------------------------

function mockCgPrices(overrides: Partial<Record<string, { usd: number }>> = {}) {
  return {
    bitcoin:        { usd: 97500 },
    chainlink:      { usd: 17.9 },
    'ondo-finance': { usd: 1.18 },
    uniswap:        { usd: 12.8 },
    'near-protocol':{ usd: 5.45 },
    ethereum:       { usd: 3080 },
    ...overrides,
  }
}

function mockCgGlobal(btcPct = 56.2) {
  return { data: { market_cap_percentage: { btc: btcPct } } }
}

function mockFinnhub(c = 385) {
  return { c, d: 2.5, dp: 0.65, h: 390, l: 380, o: 382, pc: 382.5 }
}

function mockAltMe(value = '72') {
  return { data: [{ value, value_classification: 'Greed', timestamp: '1705312800' }] }
}

function makeResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } })
}

function setupAllSucceed() {
  mockFetch
    .mockResolvedValueOnce(makeResponse(mockCgPrices()))      // CoinGecko prices
    .mockResolvedValueOnce(makeResponse(mockCgGlobal()))       // CoinGecko global
    .mockResolvedValueOnce(makeResponse(mockFinnhub()))        // Finnhub
    .mockResolvedValueOnce(makeResponse(mockAltMe()))          // Alternative.me
}

// ---------------------------------------------------------------------------
// fetchPrices — happy path
// ---------------------------------------------------------------------------

describe('fetchPrices — all sources succeed', () => {
  beforeEach(() => { vi.clearAllMocks(); setupAllSucceed() })

  it('returns all expected price fields', async () => {
    const p = await fetchPrices()
    expect(p.btc).toBe(97500)
    expect(p.mstr).toBe(385)
    expect(p.link).toBe(17.9)
    expect(p.ondo).toBe(1.18)
    expect(p.uni).toBe(12.8)
    expect(p.near).toBe(5.45)
    expect(p.eth).toBe(3080)
    expect(p.fearGreed).toBe(72)
    expect(p.btcDominance).toBe(56.2)
  })

  it('fetchedAt is a valid ISO timestamp', async () => {
    const p = await fetchPrices()
    expect(new Date(p.fetchedAt).getTime()).toBeGreaterThan(0)
  })

  it('makes exactly 4 fetch calls', async () => {
    await fetchPrices()
    expect(mockFetch).toHaveBeenCalledTimes(4)
  })
})

// ---------------------------------------------------------------------------
// fetchPrices — individual source failures return null for that source
// ---------------------------------------------------------------------------

describe('fetchPrices — CoinGecko prices fails', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch
      .mockRejectedValueOnce(new Error('CoinGecko down'))
      .mockResolvedValueOnce(makeResponse(mockCgGlobal()))
      .mockResolvedValueOnce(makeResponse(mockFinnhub()))
      .mockResolvedValueOnce(makeResponse(mockAltMe()))
  })

  it('returns null for btc, link, ondo, uni, near, eth', async () => {
    const p = await fetchPrices()
    expect(p.btc).toBeNull()
    expect(p.link).toBeNull()
    expect(p.ondo).toBeNull()
    expect(p.uni).toBeNull()
    expect(p.near).toBeNull()
    expect(p.eth).toBeNull()
  })

  it('still returns mstr and fearGreed from the other sources', async () => {
    const p = await fetchPrices()
    expect(p.mstr).toBe(385)
    expect(p.fearGreed).toBe(72)
    expect(p.btcDominance).toBe(56.2)
  })
})

describe('fetchPrices — Finnhub fails', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch
      .mockResolvedValueOnce(makeResponse(mockCgPrices()))
      .mockResolvedValueOnce(makeResponse(mockCgGlobal()))
      .mockRejectedValueOnce(new Error('Finnhub down'))
      .mockResolvedValueOnce(makeResponse(mockAltMe()))
  })

  it('returns null for mstr only', async () => {
    const p = await fetchPrices()
    expect(p.mstr).toBeNull()
    expect(p.btc).toBe(97500)
    expect(p.fearGreed).toBe(72)
  })
})

describe('fetchPrices — Finnhub returns 0 (invalid symbol)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch
      .mockResolvedValueOnce(makeResponse(mockCgPrices()))
      .mockResolvedValueOnce(makeResponse(mockCgGlobal()))
      .mockResolvedValueOnce(makeResponse(mockFinnhub(0)))    // c: 0
      .mockResolvedValueOnce(makeResponse(mockAltMe()))
  })

  it('treats Finnhub c=0 as unavailable (returns null)', async () => {
    const p = await fetchPrices()
    expect(p.mstr).toBeNull()
  })
})

describe('fetchPrices — Alternative.me fails', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch
      .mockResolvedValueOnce(makeResponse(mockCgPrices()))
      .mockResolvedValueOnce(makeResponse(mockCgGlobal()))
      .mockResolvedValueOnce(makeResponse(mockFinnhub()))
      .mockRejectedValueOnce(new Error('Alt.me down'))
  })

  it('returns null for fearGreed only', async () => {
    const p = await fetchPrices()
    expect(p.fearGreed).toBeNull()
    expect(p.btc).toBe(97500)
    expect(p.mstr).toBe(385)
  })
})

describe('fetchPrices — CoinGecko global fails', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch
      .mockResolvedValueOnce(makeResponse(mockCgPrices()))
      .mockRejectedValueOnce(new Error('CG global down'))
      .mockResolvedValueOnce(makeResponse(mockFinnhub()))
      .mockResolvedValueOnce(makeResponse(mockAltMe()))
  })

  it('returns null for btcDominance only', async () => {
    const p = await fetchPrices()
    expect(p.btcDominance).toBeNull()
    expect(p.btc).toBe(97500)
  })
})

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

describe('GET /api/prices', () => {
  beforeEach(() => { vi.clearAllMocks(); setupAllSucceed() })
  afterEach(() => vi.unstubAllEnvs())

  it('returns 200', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it('response body matches Prices shape', async () => {
    const res = await GET()
    const body = await res.json()
    expect(typeof body.btc).toBe('number')
    expect(typeof body.mstr).toBe('number')
    expect(typeof body.fetchedAt).toBe('string')
    expect(new Date(body.fetchedAt).getTime()).toBeGreaterThan(0)
  })
})
