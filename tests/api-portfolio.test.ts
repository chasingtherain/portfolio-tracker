import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock fetchPrices (external HTTP) and getHoldings (KV) — these are the only
// async I/O dependencies. Calculation functions remain real: this gives us a
// meaningful integration test of the route's assembly logic.

vi.mock('../app/api/prices/route', () => ({
  fetchPrices: vi.fn(),
}))

vi.mock('../lib/kv', async (importOriginal) => {
  // Keep DEFAULT_HOLDINGS and toClientHoldings real; mock only the async KV calls
  const actual = await importOriginal<typeof import('../lib/kv')>()
  return {
    ...actual,
    getHoldings: vi.fn(),
    setHoldings: vi.fn(),
    resetChecklist: vi.fn(),
  }
})

import { GET } from '../app/api/portfolio/route'
import { fetchPrices } from '../app/api/prices/route'
import { getHoldings, DEFAULT_HOLDINGS } from '../lib/kv'
import { DEMO_PORTFOLIO_STATE } from '../lib/demo-data'
import type { Prices, Holdings } from '../lib/types'

const mockFetchPrices = vi.mocked(fetchPrices)
const mockGetHoldings = vi.mocked(getHoldings)

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_PRICES: Prices = {
  btc:          97500,
  mstr:         385,
  link:         17.9,
  ondo:         1.18,
  uni:          12.8,
  near:         5.45,
  eth:          3080,
  fearGreed:    72,
  btcDominance: 56.2,
  fetchedAt:    '2025-01-15T10:30:00.000Z',
}

const MOCK_HOLDINGS: Holdings = {
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

// ---------------------------------------------------------------------------
// Demo mode
// ---------------------------------------------------------------------------

describe('GET /api/portfolio — demo mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('MODE', 'demo')
  })
  afterEach(() => vi.unstubAllEnvs())

  it('returns 200', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it('returns DEMO_PORTFOLIO_STATE exactly', async () => {
    const res = await GET()
    const body = await res.json()
    expect(body).toEqual(DEMO_PORTFOLIO_STATE)
  })

  it('does not call fetchPrices', async () => {
    await GET()
    expect(mockFetchPrices).not.toHaveBeenCalled()
  })

  it('does not call getHoldings', async () => {
    await GET()
    expect(mockGetHoldings).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Live mode
// ---------------------------------------------------------------------------

describe('GET /api/portfolio — live mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('MODE', 'live')
    mockFetchPrices.mockResolvedValue(MOCK_PRICES)
    mockGetHoldings.mockResolvedValue(MOCK_HOLDINGS)
  })
  afterEach(() => vi.unstubAllEnvs())

  it('returns 200', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it('calls fetchPrices and getHoldings', async () => {
    await GET()
    expect(mockFetchPrices).toHaveBeenCalledOnce()
    expect(mockGetHoldings).toHaveBeenCalledOnce()
  })

  it('returns mode: live', async () => {
    const res = await GET()
    const body = await res.json()
    expect(body.mode).toBe('live')
  })

  it('response has all required PortfolioState fields', async () => {
    const res = await GET()
    const body = await res.json()
    expect(typeof body.totalValue).toBe('number')
    expect(typeof body.target).toBe('number')
    expect(typeof body.progressPct).toBe('number')
    expect(Array.isArray(body.positions)).toBe(true)
    expect(Array.isArray(body.allocations)).toBe(true)
    expect(Array.isArray(body.triggers)).toBe(true)
    expect(typeof body.proceedsSplit).toBe('object')
    expect(typeof body.prices).toBe('object')
    expect(typeof body.updatedAt).toBe('string')
  })

  it('positions are sorted by value descending', async () => {
    const res = await GET()
    const { positions } = await res.json()
    const values = positions.map((p: { value: number | null }) => p.value ?? -Infinity)
    for (let i = 0; i < values.length - 1; i++) {
      expect(values[i]).toBeGreaterThanOrEqual(values[i + 1])
    }
  })

  it('allocations follow fixed display order', async () => {
    const res = await GET()
    const { allocations } = await res.json()
    const keys = allocations.map((a: { key: string }) => a.key)
    expect(keys).toEqual(['btc', 'mstr', 'ondo', 'link', 'uni', 'near', 'eth', 'dry'])
  })

  it('triggers has 4 entries', async () => {
    const res = await GET()
    const { triggers } = await res.json()
    expect(triggers).toHaveLength(4)
  })

  it('positions have allocPct filled in (not null)', async () => {
    const res = await GET()
    const { positions } = await res.json()
    const priced = positions.filter((p: { priceUnavailable: boolean }) => !p.priceUnavailable)
    expect(priced.every((p: { allocPct: number | null }) => p.allocPct !== null)).toBe(true)
  })

  it('pricesPartial is false when all prices are present', async () => {
    const res = await GET()
    const body = await res.json()
    expect(body.pricesPartial).toBe(false)
  })

  it('updatedAt comes from holdings.updatedAt', async () => {
    const res = await GET()
    const body = await res.json()
    expect(body.updatedAt).toBe(MOCK_HOLDINGS.updatedAt)
  })
})

// ---------------------------------------------------------------------------
// Live mode — partial prices
// ---------------------------------------------------------------------------

describe('GET /api/portfolio — live mode with null BTC price', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('MODE', 'live')
    mockFetchPrices.mockResolvedValue({ ...MOCK_PRICES, btc: null })
    mockGetHoldings.mockResolvedValue(MOCK_HOLDINGS)
  })
  afterEach(() => vi.unstubAllEnvs())

  it('returns 200 (does not throw on null price)', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it('sets pricesPartial: true', async () => {
    const res = await GET()
    const body = await res.json()
    expect(body.pricesPartial).toBe(true)
  })

  it('BTC position has priceUnavailable: true and null value', async () => {
    const res = await GET()
    const { positions } = await res.json()
    const btc = positions.find((p: { ticker: string }) => p.ticker === 'BTC')
    expect(btc.priceUnavailable).toBe(true)
    expect(btc.value).toBeNull()
  })

  it('totalPnl is null when BTC price is unavailable', async () => {
    const res = await GET()
    const body = await res.json()
    expect(body.totalPnl).toBeNull()
  })

  it('proceedsSplit defaults to below_150k zone when BTC is null', async () => {
    const res = await GET()
    const body = await res.json()
    expect(body.proceedsSplit.zone).toBe('below_150k')
  })
})

// ---------------------------------------------------------------------------
// Live mode with DEFAULT_HOLDINGS (uninitialised state)
// ---------------------------------------------------------------------------

describe('GET /api/portfolio — DEFAULT_HOLDINGS (all zeros)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('MODE', 'live')
    mockFetchPrices.mockResolvedValue(MOCK_PRICES)
    mockGetHoldings.mockResolvedValue(DEFAULT_HOLDINGS)
  })
  afterEach(() => vi.unstubAllEnvs())

  it('returns 200', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it('totalValue is 0 (no holdings)', async () => {
    const res = await GET()
    const body = await res.json()
    expect(body.totalValue).toBe(0)
  })
})
