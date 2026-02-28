import { describe, it, expect } from 'vitest'
import { DEMO_PORTFOLIO_STATE } from '../lib/demo-data'

// TypeScript already verifies the shape at compile time.
// These runtime tests catch semantic errors that types cannot:
//   - Wrong mode value, negative totalValue, malformed ISO dates
//   - Positions not sorted by value descending
//   - Allocations out of display order
//   - Trigger array missing entries
//   - pricesPartial mismatch (demo has all prices, so it must be false)

describe('DEMO_PORTFOLIO_STATE — top-level shape', () => {
  it('has mode: demo', () => {
    expect(DEMO_PORTFOLIO_STATE.mode).toBe('demo')
  })

  it('has a positive totalValue', () => {
    expect(DEMO_PORTFOLIO_STATE.totalValue).toBeGreaterThan(0)
  })

  it('has a positive totalPnl', () => {
    expect(DEMO_PORTFOLIO_STATE.totalPnl).not.toBeNull()
    expect(DEMO_PORTFOLIO_STATE.totalPnl as number).toBeGreaterThan(0)
  })

  it('has a positive pnlPct', () => {
    expect(DEMO_PORTFOLIO_STATE.pnlPct).not.toBeNull()
    expect(DEMO_PORTFOLIO_STATE.pnlPct as number).toBeGreaterThan(0)
  })

  it('has a positive target', () => {
    expect(DEMO_PORTFOLIO_STATE.target).toBeGreaterThan(0)
  })

  it('has a negative gapToTarget (totalValue is below target)', () => {
    expect(DEMO_PORTFOLIO_STATE.gapToTarget).toBeLessThan(0)
  })

  it('gapToTarget matches totalValue − target', () => {
    expect(DEMO_PORTFOLIO_STATE.gapToTarget).toBe(
      DEMO_PORTFOLIO_STATE.totalValue - DEMO_PORTFOLIO_STATE.target
    )
  })

  it('progressPct is between 0 and 100', () => {
    expect(DEMO_PORTFOLIO_STATE.progressPct).toBeGreaterThan(0)
    expect(DEMO_PORTFOLIO_STATE.progressPct).toBeLessThanOrEqual(100)
  })

  it('pricesPartial is false (all demo prices are present)', () => {
    expect(DEMO_PORTFOLIO_STATE.pricesPartial).toBe(false)
  })

  it('updatedAt is a valid ISO date string', () => {
    const d = new Date(DEMO_PORTFOLIO_STATE.updatedAt)
    expect(isNaN(d.getTime())).toBe(false)
  })
})

describe('DEMO_PORTFOLIO_STATE — prices', () => {
  const { prices } = DEMO_PORTFOLIO_STATE

  it('has non-null values for all price fields', () => {
    expect(prices.btc).not.toBeNull()
    expect(prices.mstr).not.toBeNull()
    expect(prices.near).not.toBeNull()
    expect(prices.uni).not.toBeNull()
    expect(prices.link).not.toBeNull()
    expect(prices.ondo).not.toBeNull()
    expect(prices.near).not.toBeNull()
    expect(prices.fearGreed).not.toBeNull()
    expect(prices.btcDominance).not.toBeNull()
  })

  it('fetchedAt is a valid ISO date string', () => {
    const d = new Date(prices.fetchedAt)
    expect(isNaN(d.getTime())).toBe(false)
  })

  it('BTC price is in a plausible range for demo ($50K–$500K)', () => {
    expect(prices.btc as number).toBeGreaterThan(50000)
    expect(prices.btc as number).toBeLessThan(500000)
  })

  it('fearGreed is between 0 and 100', () => {
    expect(prices.fearGreed as number).toBeGreaterThanOrEqual(0)
    expect(prices.fearGreed as number).toBeLessThanOrEqual(100)
  })

  it('btcDominance is a percentage (0–100)', () => {
    expect(prices.btcDominance as number).toBeGreaterThan(0)
    expect(prices.btcDominance as number).toBeLessThan(100)
  })
})

describe('DEMO_PORTFOLIO_STATE — positions', () => {
  const { positions } = DEMO_PORTFOLIO_STATE

  it('has 7 positions (6 assets + dry powder)', () => {
    expect(positions).toHaveLength(7)
  })

  it('all positions have priceUnavailable: false', () => {
    expect(positions.every(p => p.priceUnavailable === false)).toBe(true)
  })

  it('all positions have non-null value', () => {
    expect(positions.every(p => p.value !== null)).toBe(true)
  })

  it('positions are sorted by value descending', () => {
    const values = positions.map(p => p.value as number)
    for (let i = 0; i < values.length - 1; i++) {
      expect(values[i]).toBeGreaterThanOrEqual(values[i + 1])
    }
  })

  it('first position is BTC (highest value)', () => {
    expect(positions[0].ticker).toBe('BTC')
  })

  it('includes a USD (dry powder) position', () => {
    expect(positions.some(p => p.ticker === 'USD')).toBe(true)
  })

  it('all positions have numeric allocPct', () => {
    expect(positions.every(p => typeof p.allocPct === 'number')).toBe(true)
  })

  it('allocPct values sum to approximately 100%', () => {
    const sum = positions.reduce((acc, p) => acc + (p.allocPct as number), 0)
    expect(sum).toBeCloseTo(100, 0)
  })

  it('BTC and MSTR positions have positive pnl', () => {
    const btc = positions.find(p => p.ticker === 'BTC')!
    const mstr = positions.find(p => p.ticker === 'MSTR')!
    expect(btc.pnl as number).toBeGreaterThan(0)
    expect(mstr.pnl as number).toBeGreaterThan(0)
  })

  it('dry powder position has null pnl (no cost basis)', () => {
    const usd = positions.find(p => p.ticker === 'USD')!
    expect(usd.pnl).toBeNull()
    expect(usd.pnlPct).toBeNull()
  })
})

describe('DEMO_PORTFOLIO_STATE — allocations', () => {
  const { allocations } = DEMO_PORTFOLIO_STATE

  it('has 7 allocations', () => {
    expect(allocations).toHaveLength(7)
  })

  it('follows the fixed display order: BTC MSTR ONDO LINK UNI NEAR CASH', () => {
    const keys = allocations.map(a => a.key)
    expect(keys).toEqual(['btc', 'mstr', 'ondo', 'link', 'uni', 'near', 'dry'])
  })

  it('all allocations have numeric currentPct', () => {
    expect(allocations.every(a => typeof a.currentPct === 'number')).toBe(true)
  })

  it('all allocations have a color', () => {
    expect(allocations.every(a => typeof a.color === 'string' && a.color.length > 0)).toBe(true)
  })

  it('BTC is overweight (currentPct > targetPct)', () => {
    const btc = allocations.find(a => a.key === 'btc')!
    expect((btc.currentPct as number)).toBeGreaterThan(btc.targetPct)
    expect((btc.gap as number)).toBeGreaterThan(0)
  })

  it('ONDO and LINK are underweight (currentPct < targetPct)', () => {
    const ondo = allocations.find(a => a.key === 'ondo')!
    const link = allocations.find(a => a.key === 'link')!
    expect((ondo.gap as number)).toBeLessThan(0)
    expect((link.gap as number)).toBeLessThan(0)
  })
})

describe('DEMO_PORTFOLIO_STATE — triggers', () => {
  const { triggers } = DEMO_PORTFOLIO_STATE

  it('has exactly 4 triggers', () => {
    expect(triggers).toHaveLength(4)
  })

  it('trigger labels match the expected set', () => {
    const labels = triggers.map(t => t.label)
    expect(labels).toContain('FEAR & GREED')
    expect(labels).toContain('BTC DOMINANCE')
    expect(labels).toContain('NUPL')
    expect(labels).toContain('BTC PRICE ZONE')
  })

  it('all triggers have a valid severity', () => {
    const valid = ['watch', 'near', 'fired', 'warn']
    expect(triggers.every(t => valid.includes(t.severity))).toBe(true)
  })

  it('all triggers have non-empty value, status, and condition', () => {
    for (const t of triggers) {
      expect(t.value.length).toBeGreaterThan(0)
      expect(t.status.length).toBeGreaterThan(0)
      expect(t.condition.length).toBeGreaterThan(0)
    }
  })
})

describe('DEMO_PORTFOLIO_STATE — proceedsSplit', () => {
  const { proceedsSplit } = DEMO_PORTFOLIO_STATE

  it('has a valid zone', () => {
    const valid = ['below_150k', '150k_250k', '250k_350k', 'above_350k']
    expect(valid).toContain(proceedsSplit.zone)
  })

  it('cashPct + btcPct === 100', () => {
    expect(proceedsSplit.cashPct + proceedsSplit.btcPct).toBe(100)
  })

  it('zone matches the demo BTC price ($97,500 → below_150k)', () => {
    expect(proceedsSplit.zone).toBe('below_150k')
  })
})
