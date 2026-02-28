import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.mock is hoisted above all imports by Vitest's transform — the factory runs
// before kv.ts ever tries to import @vercel/kv, so the mock is in place when
// kv.ts is first evaluated.
vi.mock('@vercel/kv', () => ({
  kv: {
    get: vi.fn(),
    set: vi.fn(),
  },
}))

import { kv } from '@vercel/kv'
import {
  toClientHoldings,
  getHoldings,
  setHoldings,
  getChecklist,
  setChecklist,
  resetChecklist,
  DEFAULT_HOLDINGS,
} from '../lib/kv'
import type { Holdings } from '../lib/types'

const mockGet = vi.mocked(kv.get)
const mockSet = vi.mocked(kv.set)

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

const FULL_HOLDINGS: Holdings = {
  btc:       { qty: 1.5, costBasis: 40000 },
  mstr:      { qty: 100, costBasis: 200 },
  near:      { qty: 5000, costBasis: 3 },
  uni:       { qty: 500, costBasis: 7 },
  link:      { qty: 300, costBasis: 10 },
  ondo:      { qty: 10000, costBasis: 0.5 },
  dryPowder: 5000,
  nupl:      0.55,
  updatedAt: '2024-01-15T10:00:00.000Z',
}

// ---------------------------------------------------------------------------
// toClientHoldings — pure function, no mocking needed
// ---------------------------------------------------------------------------

describe('toClientHoldings', () => {
  it('preserves all quantity fields', () => {
    const client = toClientHoldings(FULL_HOLDINGS)
    expect(client.btc.qty).toBe(1.5)
    expect(client.mstr.qty).toBe(100)
    expect(client.near.qty).toBe(5000)
    expect(client.uni.qty).toBe(500)
    expect(client.link.qty).toBe(300)
    expect(client.ondo.qty).toBe(10000)
  })

  it('preserves dryPowder, nupl, and updatedAt', () => {
    const client = toClientHoldings(FULL_HOLDINGS)
    expect(client.dryPowder).toBe(5000)
    expect(client.nupl).toBe(0.55)
    expect(client.updatedAt).toBe('2024-01-15T10:00:00.000Z')
  })

  it('strips costBasis from every asset', () => {
    const client = toClientHoldings(FULL_HOLDINGS)
    expect('costBasis' in client.btc).toBe(false)
    expect('costBasis' in client.mstr).toBe(false)
    expect('costBasis' in client.near).toBe(false)
    expect('costBasis' in client.uni).toBe(false)
    expect('costBasis' in client.link).toBe(false)
    expect('costBasis' in client.ondo).toBe(false)
  })

  it('contains no cost or Cost string anywhere in its JSON', () => {
    const json = JSON.stringify(toClientHoldings(FULL_HOLDINGS))
    expect(json).not.toContain('cost')
    expect(json).not.toContain('Cost')
  })

  it('each asset object has exactly one key (qty)', () => {
    const client = toClientHoldings(FULL_HOLDINGS)
    expect(Object.keys(client.btc)).toEqual(['qty'])
    expect(Object.keys(client.mstr)).toEqual(['qty'])
    expect(Object.keys(client.ondo)).toEqual(['qty'])
  })
})

// ---------------------------------------------------------------------------
// getHoldings
// ---------------------------------------------------------------------------

describe('getHoldings', () => {
  beforeEach(() => vi.resetAllMocks())

  it('returns DEFAULT_HOLDINGS when KV has no entry', async () => {
    mockGet.mockResolvedValue(null)
    const result = await getHoldings()
    expect(result).toEqual(DEFAULT_HOLDINGS)
  })

  it('returns the stored holdings when KV has data', async () => {
    mockGet.mockResolvedValue(FULL_HOLDINGS)
    const result = await getHoldings()
    expect(result).toEqual(FULL_HOLDINGS)
  })

  it('queries KV with the correct key', async () => {
    mockGet.mockResolvedValue(null)
    await getHoldings()
    expect(mockGet).toHaveBeenCalledWith('holdings')
  })
})

// ---------------------------------------------------------------------------
// setHoldings
// ---------------------------------------------------------------------------

describe('setHoldings', () => {
  beforeEach(() => vi.resetAllMocks())

  it('calls kv.set with the holdings key and the full holdings object', async () => {
    mockSet.mockResolvedValue(undefined)
    await setHoldings(FULL_HOLDINGS)
    expect(mockSet).toHaveBeenCalledWith('holdings', FULL_HOLDINGS)
  })

  it('stores cost basis (server-side, never sent to client)', async () => {
    mockSet.mockResolvedValue(undefined)
    await setHoldings(FULL_HOLDINGS)
    const [, stored] = mockSet.mock.calls[0] as [string, Holdings]
    expect(stored.btc.costBasis).toBe(40000)
  })
})

// ---------------------------------------------------------------------------
// DEFAULT_HOLDINGS
// ---------------------------------------------------------------------------

describe('DEFAULT_HOLDINGS', () => {
  it('has zero quantities for all assets', () => {
    expect(DEFAULT_HOLDINGS.btc.qty).toBe(0)
    expect(DEFAULT_HOLDINGS.mstr.qty).toBe(0)
    expect(DEFAULT_HOLDINGS.near.qty).toBe(0)
    expect(DEFAULT_HOLDINGS.uni.qty).toBe(0)
    expect(DEFAULT_HOLDINGS.link.qty).toBe(0)
    expect(DEFAULT_HOLDINGS.ondo.qty).toBe(0)
    expect(DEFAULT_HOLDINGS.dryPowder).toBe(0)
  })

  it('uses epoch zero as the updatedAt sentinel', () => {
    expect(DEFAULT_HOLDINGS.updatedAt).toBe(new Date(0).toISOString())
  })
})

// ---------------------------------------------------------------------------
// getChecklist
// ---------------------------------------------------------------------------

describe('getChecklist', () => {
  beforeEach(() => vi.resetAllMocks())

  it('returns 8 false values when KV has no entry', async () => {
    mockGet.mockResolvedValue(null)
    const result = await getChecklist()
    expect(result).toHaveLength(8)
    expect(result.every(v => v === false)).toBe(true)
  })

  it('returns the stored state when KV has valid data', async () => {
    const stored = [true, false, true, false, false, false, true, false]
    mockGet.mockResolvedValue(stored)
    const result = await getChecklist()
    expect(result).toEqual(stored)
  })

  it('falls back to all-false when stored array has wrong length', async () => {
    mockGet.mockResolvedValue([true, false, true]) // 3 items, not 8
    const result = await getChecklist()
    expect(result).toHaveLength(8)
    expect(result.every(v => v === false)).toBe(true)
  })

  it('queries KV with the correct key', async () => {
    mockGet.mockResolvedValue(null)
    await getChecklist()
    expect(mockGet).toHaveBeenCalledWith('checklist')
  })
})

// ---------------------------------------------------------------------------
// setChecklist
// ---------------------------------------------------------------------------

describe('setChecklist', () => {
  beforeEach(() => vi.resetAllMocks())

  it('calls kv.set with the checklist key and state', async () => {
    mockSet.mockResolvedValue(undefined)
    const state = [true, false, false, true, false, false, false, false]
    await setChecklist(state)
    expect(mockSet).toHaveBeenCalledWith('checklist', state)
  })
})

// ---------------------------------------------------------------------------
// resetChecklist
// ---------------------------------------------------------------------------

describe('resetChecklist', () => {
  beforeEach(() => vi.resetAllMocks())

  it('writes 8 false values to KV', async () => {
    mockSet.mockResolvedValue(undefined)
    await resetChecklist()
    const [key, value] = mockSet.mock.calls[0] as [string, boolean[]]
    expect(key).toBe('checklist')
    expect(value).toHaveLength(8)
    expect(value.every(v => v === false)).toBe(true)
  })
})
