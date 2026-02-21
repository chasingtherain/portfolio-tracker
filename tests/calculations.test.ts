import { describe, it, expect } from 'vitest'
import {
  calcPositionPnl,
  calcAllocationPct,
  calcAllocationGap,
  calcTotalValue,
  calcProgressToTarget,
  calcGapToTarget,
  calcTotalPnl,
  calcProceedsSplit,
  evalFearGreed,
  evalBtcDominance,
  evalNupl,
  evalBtcPriceZone,
  calcAllTriggers,
  buildPositions,
  buildAllocations,
} from '@/lib/calculations'
import type { Holdings, Prices, Position } from '@/lib/types'

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------

const mockHoldings: Holdings = {
  btc:  { qty: 3.1421, costBasis: 41174.40 },
  mstr: { qty: 120,    costBasis: 270 },
  near: { qty: 10960,  costBasis: 4.007 },
  uni:  { qty: 2400,   costBasis: 7.2923 },
  link: { qty: 84.6,   costBasis: 8.6884 },
  ondo: { qty: 0,      costBasis: 0.27 },
  eth:  { qty: 0.37,   costBasis: 2000 },
  dryPowder: 5000,
  nupl: 0.35,
  updatedAt: '2026-02-21T00:00:00Z',
}

const mockPrices: Prices = {
  btc:          67420,
  mstr:         320,
  near:         3.5,
  uni:          10,
  link:         18,
  ondo:         1.0,
  eth:          2800,
  fearGreed:    45,
  btcDominance: 58.4,
  fetchedAt:    '2026-02-21T17:30:00Z',
}

// ---------------------------------------------------------------------------
// calcPositionPnl
// ---------------------------------------------------------------------------

describe('calcPositionPnl', () => {
  it('calculates profit correctly', () => {
    const { pnl, pnlPct } = calcPositionPnl(10000, 8000)
    expect(pnl).toBe(2000)
    expect(pnlPct).toBeCloseTo(25)
  })

  it('calculates loss correctly', () => {
    const { pnl, pnlPct } = calcPositionPnl(8000, 10000)
    expect(pnl).toBe(-2000)
    expect(pnlPct).toBeCloseTo(-20)
  })

  it('returns 0 pnlPct when cost basis is zero', () => {
    const { pnl, pnlPct } = calcPositionPnl(0, 0)
    expect(pnl).toBe(0)
    expect(pnlPct).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// calcAllocationPct
// ---------------------------------------------------------------------------

describe('calcAllocationPct', () => {
  it('calculates percentage correctly', () => {
    expect(calcAllocationPct(50000, 200000)).toBeCloseTo(25)
  })

  it('returns 0 when position value is 0', () => {
    expect(calcAllocationPct(0, 200000)).toBe(0)
  })

  it('returns 0 when total value is 0 (avoids division by zero)', () => {
    expect(calcAllocationPct(50000, 0)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// calcAllocationGap
// ---------------------------------------------------------------------------

describe('calcAllocationGap', () => {
  it('returns positive gap when overweight', () => {
    expect(calcAllocationGap(81.3, 60)).toBeCloseTo(21.3)
  })

  it('returns negative gap when underweight', () => {
    expect(calcAllocationGap(5, 7)).toBeCloseTo(-2)
  })

  it('returns 0 when exactly on target', () => {
    expect(calcAllocationGap(60, 60)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// calcTotalValue
// ---------------------------------------------------------------------------

describe('calcTotalValue', () => {
  it('sums all non-null position values', () => {
    const positions: Position[] = [
      { label: 'A', ticker: 'A', value: 100, pnl: 0, pnlPct: 0, allocPct: null, priceUnavailable: false },
      { label: 'B', ticker: 'B', value: 200, pnl: 0, pnlPct: 0, allocPct: null, priceUnavailable: false },
    ]
    expect(calcTotalValue(positions)).toBe(300)
  })

  it('excludes null-value positions from the sum', () => {
    const positions: Position[] = [
      { label: 'A', ticker: 'A', value: 100,  pnl: 0,   pnlPct: 0,   allocPct: null, priceUnavailable: false },
      { label: 'B', ticker: 'B', value: null, pnl: null, pnlPct: null, allocPct: null, priceUnavailable: true },
    ]
    expect(calcTotalValue(positions)).toBe(100)
  })
})

// ---------------------------------------------------------------------------
// calcProgressToTarget / calcGapToTarget
// ---------------------------------------------------------------------------

describe('calcProgressToTarget', () => {
  it('calculates progress as a percentage', () => {
    expect(calcProgressToTarget(300000, 1500000)).toBeCloseTo(20)
  })

  it('caps at 100% when value exceeds target', () => {
    expect(calcProgressToTarget(2000000, 1500000)).toBe(100)
  })

  it('returns 0 when target is 0', () => {
    expect(calcProgressToTarget(500000, 0)).toBe(0)
  })
})

describe('calcGapToTarget', () => {
  it('returns negative gap when below target', () => {
    expect(calcGapToTarget(300000, 1500000)).toBe(-1200000)
  })

  it('returns positive gap when above target', () => {
    expect(calcGapToTarget(2000000, 1500000)).toBe(500000)
  })
})

// ---------------------------------------------------------------------------
// calcTotalPnl
// ---------------------------------------------------------------------------

describe('calcTotalPnl', () => {
  it('returns null when BTC price is unavailable', () => {
    const prices = { ...mockPrices, btc: null }
    const { totalPnl, pnlPct } = calcTotalPnl(mockHoldings, prices)
    expect(totalPnl).toBeNull()
    expect(pnlPct).toBeNull()
  })

  it('returns null when MSTR price is unavailable', () => {
    const prices = { ...mockPrices, mstr: null }
    const { totalPnl, pnlPct } = calcTotalPnl(mockHoldings, prices)
    expect(totalPnl).toBeNull()
    expect(pnlPct).toBeNull()
  })

  it('calculates total pnl when all major prices are available', () => {
    const { totalPnl, pnlPct } = calcTotalPnl(mockHoldings, mockPrices)
    expect(totalPnl).not.toBeNull()
    expect(pnlPct).not.toBeNull()
    // BTC is a large profit (bought at ~$41k, now $67k) so total should be positive
    expect(totalPnl!).toBeGreaterThan(0)
  })

  it('still returns a result when a minor asset price is null', () => {
    const prices = { ...mockPrices, near: null }
    const { totalPnl } = calcTotalPnl(mockHoldings, prices)
    // NEAR is excluded but BTC + MSTR are available → result is not null
    expect(totalPnl).not.toBeNull()
  })
})

// ---------------------------------------------------------------------------
// calcProceedsSplit
// ---------------------------------------------------------------------------

describe('calcProceedsSplit', () => {
  it('returns below_150k zone correctly', () => {
    const result = calcProceedsSplit(67420)
    expect(result.zone).toBe('below_150k')
    expect(result.cashPct).toBe(30)
    expect(result.btcPct).toBe(70)
  })

  it('returns 150k_250k zone correctly', () => {
    const result = calcProceedsSplit(200000)
    expect(result.zone).toBe('150k_250k')
    expect(result.cashPct).toBe(50)
    expect(result.btcPct).toBe(50)
  })

  it('returns 250k_350k zone correctly', () => {
    const result = calcProceedsSplit(300000)
    expect(result.zone).toBe('250k_350k')
    expect(result.cashPct).toBe(70)
    expect(result.btcPct).toBe(30)
  })

  it('returns above_350k zone correctly', () => {
    const result = calcProceedsSplit(400000)
    expect(result.zone).toBe('above_350k')
    expect(result.cashPct).toBe(90)
    expect(result.btcPct).toBe(10)
  })

  it('handles exact boundary at $150k (should be 150k_250k zone)', () => {
    const result = calcProceedsSplit(150000)
    expect(result.zone).toBe('150k_250k')
  })
})

// ---------------------------------------------------------------------------
// evalFearGreed
// ---------------------------------------------------------------------------

describe('evalFearGreed', () => {
  it('returns warn severity for null', () => {
    const result = evalFearGreed(null)
    expect(result.severity).toBe('warn')
    expect(result.value).toBe('—')
  })

  it('returns watch for values below 65', () => {
    expect(evalFearGreed(45).severity).toBe('watch')
    expect(evalFearGreed(0).severity).toBe('watch')
    expect(evalFearGreed(64).severity).toBe('watch')
  })

  it('returns near for values 65–79', () => {
    expect(evalFearGreed(65).severity).toBe('near')
    expect(evalFearGreed(79).severity).toBe('near')
  })

  it('returns fired for values 80–84 (T1/T2 zone)', () => {
    expect(evalFearGreed(80).severity).toBe('fired')
    expect(evalFearGreed(84).severity).toBe('fired')
  })

  it('returns fired for values ≥ 85 (T3 zone)', () => {
    expect(evalFearGreed(85).severity).toBe('fired')
    expect(evalFearGreed(100).severity).toBe('fired')
  })

  it('includes the raw value as a string', () => {
    expect(evalFearGreed(72).value).toBe('72')
  })
})

// ---------------------------------------------------------------------------
// evalBtcDominance
// ---------------------------------------------------------------------------

describe('evalBtcDominance', () => {
  it('returns warn severity for null', () => {
    expect(evalBtcDominance(null).severity).toBe('warn')
  })

  it('returns watch when dominance is above 55%', () => {
    expect(evalBtcDominance(58.4).severity).toBe('watch')
    expect(evalBtcDominance(56).severity).toBe('watch')
  })

  it('returns near when dominance is 52–55%', () => {
    expect(evalBtcDominance(52).severity).toBe('near')
    expect(evalBtcDominance(55).severity).toBe('near')
    expect(evalBtcDominance(53.5).severity).toBe('near')
  })

  it('returns fired when dominance is below 52%', () => {
    expect(evalBtcDominance(51).severity).toBe('fired')
    expect(evalBtcDominance(40).severity).toBe('fired')
  })
})

// ---------------------------------------------------------------------------
// evalNupl
// ---------------------------------------------------------------------------

describe('evalNupl', () => {
  it('returns watch when NUPL is below 0.6', () => {
    expect(evalNupl(0.35).severity).toBe('watch')
    expect(evalNupl(0).severity).toBe('watch')
    expect(evalNupl(0.59).severity).toBe('watch')
  })

  it('returns near when NUPL is 0.60–0.74', () => {
    expect(evalNupl(0.6).severity).toBe('near')
    expect(evalNupl(0.74).severity).toBe('near')
  })

  it('returns fired when NUPL is ≥ 0.75', () => {
    expect(evalNupl(0.75).severity).toBe('fired')
    expect(evalNupl(0.9).severity).toBe('fired')
  })
})

// ---------------------------------------------------------------------------
// evalBtcPriceZone
// ---------------------------------------------------------------------------

describe('evalBtcPriceZone', () => {
  it('returns warn severity for null', () => {
    expect(evalBtcPriceZone(null).severity).toBe('warn')
  })

  it('returns watch below $100K (accumulate phase)', () => {
    expect(evalBtcPriceZone(67420).severity).toBe('watch')
    expect(evalBtcPriceZone(99999).severity).toBe('watch')
  })

  it('returns near at $100K–$200K (hold phase)', () => {
    expect(evalBtcPriceZone(100000).severity).toBe('near')
    expect(evalBtcPriceZone(150000).severity).toBe('near')
    expect(evalBtcPriceZone(199999).severity).toBe('near')
  })

  it('returns fired at or above $200K (exit ladder active)', () => {
    expect(evalBtcPriceZone(200000).severity).toBe('fired')
    expect(evalBtcPriceZone(350000).severity).toBe('fired')
  })
})

// ---------------------------------------------------------------------------
// calcAllTriggers
// ---------------------------------------------------------------------------

describe('calcAllTriggers', () => {
  it('returns exactly 4 triggers', () => {
    const triggers = calcAllTriggers(mockPrices, 0.35)
    expect(triggers).toHaveLength(4)
  })

  it('triggers are in correct order: F&G, BTC Dom, NUPL, BTC Zone', () => {
    const triggers = calcAllTriggers(mockPrices, 0.35)
    expect(triggers[0].label).toBe('FEAR & GREED')
    expect(triggers[1].label).toBe('BTC DOMINANCE')
    expect(triggers[2].label).toBe('NUPL')
    expect(triggers[3].label).toBe('BTC PRICE ZONE')
  })

  it('all triggers are watch with base fixtures (nothing firing)', () => {
    const triggers = calcAllTriggers(mockPrices, 0.35)
    triggers.forEach(t => expect(t.severity).toBe('watch'))
  })
})

// ---------------------------------------------------------------------------
// buildPositions
// ---------------------------------------------------------------------------

describe('buildPositions', () => {
  it('returns 8 positions (7 crypto + dry powder)', () => {
    const positions = buildPositions(mockHoldings, mockPrices)
    expect(positions).toHaveLength(8)
  })

  it('positions are sorted by value descending', () => {
    const positions = buildPositions(mockHoldings, mockPrices)
    const values = positions
      .filter(p => p.value !== null)
      .map(p => p.value as number)
    for (let i = 0; i < values.length - 1; i++) {
      expect(values[i]).toBeGreaterThanOrEqual(values[i + 1])
    }
  })

  it('BTC position has correct value and P&L', () => {
    const positions = buildPositions(mockHoldings, mockPrices)
    const btc = positions.find(p => p.ticker === 'BTC')!
    expect(btc.value).toBeCloseTo(3.1421 * 67420, 0)
    expect(btc.pnl).toBeCloseTo(3.1421 * 67420 - 3.1421 * 41174.40, 0)
    expect(btc.priceUnavailable).toBe(false)
  })

  it('marks position as priceUnavailable when price is null', () => {
    const prices = { ...mockPrices, near: null }
    const positions = buildPositions(mockHoldings, prices)
    const near = positions.find(p => p.ticker === 'NEAR')!
    expect(near.value).toBeNull()
    expect(near.pnl).toBeNull()
    expect(near.priceUnavailable).toBe(true)
  })

  it('null-value positions are sorted to the end', () => {
    const prices = { ...mockPrices, near: null }
    const positions = buildPositions(mockHoldings, prices)
    const nullIndex = positions.findIndex(p => p.value === null)
    const lastNonNullIndex = positions.reduce(
      (acc, p, i) => (p.value !== null ? i : acc), -1
    )
    expect(nullIndex).toBeGreaterThan(lastNonNullIndex)
  })

  it('dry powder position has no P&L', () => {
    const positions = buildPositions(mockHoldings, mockPrices)
    const dry = positions.find(p => p.ticker === 'USD')!
    expect(dry.value).toBe(5000)
    expect(dry.pnl).toBeNull()
    expect(dry.priceUnavailable).toBe(false)
  })

  it('allocPct is null on all positions (set by API route later)', () => {
    const positions = buildPositions(mockHoldings, mockPrices)
    positions.forEach(p => expect(p.allocPct).toBeNull())
  })
})

// ---------------------------------------------------------------------------
// buildAllocations
// ---------------------------------------------------------------------------

describe('buildAllocations', () => {
  it('returns one allocation entry per asset in fixed display order', () => {
    const positions = buildPositions(mockHoldings, mockPrices)
    const totalValue = positions.reduce((s, p) => s + (p.value ?? 0), 0)
    const allocations = buildAllocations(positions, totalValue)
    expect(allocations).toHaveLength(8)
    expect(allocations[0].key).toBe('btc')
    expect(allocations[1].key).toBe('mstr')
    expect(allocations[7].key).toBe('dry')
  })

  it('BTC currentPct is computed from value / totalValue', () => {
    const positions = buildPositions(mockHoldings, mockPrices)
    const totalValue = positions.reduce((s, p) => s + (p.value ?? 0), 0)
    const allocations = buildAllocations(positions, totalValue)
    const btc = allocations.find(a => a.key === 'btc')!
    const btcValue = positions.find(p => p.ticker === 'BTC')!.value!
    expect(btc.currentPct).toBeCloseTo((btcValue / totalValue) * 100, 1)
  })

  it('ONDO has 7% target allocation', () => {
    const positions = buildPositions(mockHoldings, mockPrices)
    const totalValue = positions.reduce((s, p) => s + (p.value ?? 0), 0)
    const allocations = buildAllocations(positions, totalValue)
    const ondo = allocations.find(a => a.key === 'ondo')!
    expect(ondo.targetPct).toBe(7)
  })

  it('sets currentPct and gap to null when price is unavailable', () => {
    const prices = { ...mockPrices, near: null }
    const positions = buildPositions(mockHoldings, prices)
    const totalValue = positions.reduce((s, p) => s + (p.value ?? 0), 0)
    const allocations = buildAllocations(positions, totalValue)
    const near = allocations.find(a => a.key === 'near')!
    expect(near.currentPct).toBeNull()
    expect(near.gap).toBeNull()
  })
})
