import { describe, it, expect } from 'vitest'
import { scoreAlignment } from './alignment'
import type { MarketSnapshot } from './decisions.types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSnapshot(overrides: Partial<MarketSnapshot> = {}): MarketSnapshot {
  return {
    btcPrice:       95_000,
    fearGreed:      50,
    btcDominance:   58,
    nupl:           0.55,
    btcPriceZone:   'ACCUMULATE PHASE',
    positionStage:  'accumulate',
    activeTriggers: [],
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Rule 1: buy + exit stage → misaligned
// ---------------------------------------------------------------------------

describe('Rule 1: buy during exit stage', () => {
  it('is misaligned', () => {
    const result = scoreAlignment('buy', makeSnapshot({ positionStage: 'exit' }))
    expect(result.alignment).toBe('misaligned')
    expect(result.reason).toBe('Bought during Exit stage')
  })

  it('fires even when fear & greed is low (rule 1 takes priority over rule 4)', () => {
    const result = scoreAlignment('buy', makeSnapshot({ positionStage: 'exit', fearGreed: 10 }))
    expect(result.alignment).toBe('misaligned')
  })

  it('fires even when exit-ladder is in activeTriggers (rule 1 wins over rule 3 for buy)', () => {
    const result = scoreAlignment('buy', makeSnapshot({
      positionStage:  'exit',
      activeTriggers: ['exit-ladder'],
    }))
    expect(result.alignment).toBe('misaligned')
  })
})

// ---------------------------------------------------------------------------
// Rule 2: buy + distribute stage → misaligned
// ---------------------------------------------------------------------------

describe('Rule 2: buy during distribute stage', () => {
  it('is misaligned', () => {
    const result = scoreAlignment('buy', makeSnapshot({ positionStage: 'distribute' }))
    expect(result.alignment).toBe('misaligned')
    expect(result.reason).toBe('Bought during Distribute stage')
  })

  it('fires even with extreme fear (rule 2 takes priority over rule 4)', () => {
    const result = scoreAlignment('buy', makeSnapshot({ positionStage: 'distribute', fearGreed: 5 }))
    expect(result.alignment).toBe('misaligned')
  })
})

// ---------------------------------------------------------------------------
// Rule 3: sell + exit-ladder active → aligned
// ---------------------------------------------------------------------------

describe('Rule 3: sell on exit-ladder trigger', () => {
  it('is aligned', () => {
    const result = scoreAlignment('sell', makeSnapshot({ activeTriggers: ['exit-ladder'] }))
    expect(result.alignment).toBe('aligned')
    expect(result.reason).toBe('Sold on Exit Ladder trigger')
  })

  it('fires when exit-ladder is present alongside other triggers', () => {
    const result = scoreAlignment('sell', makeSnapshot({
      activeTriggers: ['fg-t3-euphoria', 'exit-ladder', 'nupl-fired'],
    }))
    expect(result.alignment).toBe('aligned')
  })

  it('does NOT fire when activeTriggers is empty', () => {
    const result = scoreAlignment('sell', makeSnapshot({ activeTriggers: [] }))
    expect(result.alignment).not.toBe('aligned')
  })

  it('does NOT fire when exit-ladder is absent', () => {
    const result = scoreAlignment('sell', makeSnapshot({ activeTriggers: ['fg-t3-euphoria'] }))
    expect(result.alignment).not.toBe('aligned')
  })

  it('does NOT apply to buy actions', () => {
    const result = scoreAlignment('buy', makeSnapshot({ activeTriggers: ['exit-ladder'] }))
    // buy + accumulate + exit-ladder present → falls through to rule 4 or neutral
    expect(result.alignment).not.toBe('aligned') // fearGreed is 50, so neutral
  })
})

// ---------------------------------------------------------------------------
// Rule 4: buy + fearGreed < 25 → aligned
// ---------------------------------------------------------------------------

describe('Rule 4: buy in extreme fear', () => {
  it('is aligned at fearGreed = 24', () => {
    const result = scoreAlignment('buy', makeSnapshot({ fearGreed: 24 }))
    expect(result.alignment).toBe('aligned')
    expect(result.reason).toBe('Bought in Extreme Fear')
  })

  it('is aligned at fearGreed = 0 (boundary minimum)', () => {
    const result = scoreAlignment('buy', makeSnapshot({ fearGreed: 0 }))
    expect(result.alignment).toBe('aligned')
  })

  it('does NOT fire at fearGreed = 25 (boundary — exclusive)', () => {
    const result = scoreAlignment('buy', makeSnapshot({ fearGreed: 25 }))
    expect(result.alignment).not.toBe('aligned')
  })

  it('does NOT apply to sell actions', () => {
    const result = scoreAlignment('sell', makeSnapshot({ fearGreed: 10 }))
    expect(result.alignment).not.toBe('aligned')
  })
})

// ---------------------------------------------------------------------------
// Rule 5: sell + fearGreed > 75 → aligned
// ---------------------------------------------------------------------------

describe('Rule 5: sell in extreme greed', () => {
  it('is aligned at fearGreed = 76', () => {
    const result = scoreAlignment('sell', makeSnapshot({ fearGreed: 76 }))
    expect(result.alignment).toBe('aligned')
    expect(result.reason).toBe('Sold in Extreme Greed')
  })

  it('is aligned at fearGreed = 100 (boundary maximum)', () => {
    const result = scoreAlignment('sell', makeSnapshot({ fearGreed: 100 }))
    expect(result.alignment).toBe('aligned')
  })

  it('does NOT fire at fearGreed = 75 (boundary — exclusive)', () => {
    const result = scoreAlignment('sell', makeSnapshot({ fearGreed: 75 }))
    expect(result.alignment).not.toBe('aligned')
  })

  it('does NOT apply to buy actions', () => {
    const result = scoreAlignment('buy', makeSnapshot({ fearGreed: 90 }))
    // buy + accumulate + fearGreed 90 → neutral (no rule matches)
    expect(result.alignment).toBe('neutral')
  })
})

// ---------------------------------------------------------------------------
// Rule 6: rebalance → always neutral
// ---------------------------------------------------------------------------

describe('Rule 6: rebalance is always neutral', () => {
  it('is neutral regardless of stage', () => {
    expect(scoreAlignment('rebalance', makeSnapshot({ positionStage: 'exit' })).alignment).toBe('neutral')
    expect(scoreAlignment('rebalance', makeSnapshot({ positionStage: 'accumulate' })).alignment).toBe('neutral')
  })

  it('is neutral regardless of fear & greed', () => {
    expect(scoreAlignment('rebalance', makeSnapshot({ fearGreed: 0 })).alignment).toBe('neutral')
    expect(scoreAlignment('rebalance', makeSnapshot({ fearGreed: 100 })).alignment).toBe('neutral')
  })

  it('is neutral even when exit-ladder is active', () => {
    const result = scoreAlignment('rebalance', makeSnapshot({ activeTriggers: ['exit-ladder'] }))
    expect(result.alignment).toBe('neutral')
    expect(result.reason).toBe('Rebalances are always neutral')
  })
})

// ---------------------------------------------------------------------------
// Rule 7: no rule matched → neutral with fallback reason
// ---------------------------------------------------------------------------

describe('Rule 7: no rule matched', () => {
  it('returns neutral with fallback reason for a buy in neutral conditions', () => {
    const result = scoreAlignment('buy', makeSnapshot({
      positionStage:  'accumulate',
      fearGreed:      50,
      activeTriggers: [],
    }))
    expect(result.alignment).toBe('neutral')
    expect(result.reason).toBe('No applicable rule matched')
  })

  it('returns neutral for a sell with no triggers and neutral fear & greed', () => {
    const result = scoreAlignment('sell', makeSnapshot({
      fearGreed:      50,
      activeTriggers: [],
    }))
    expect(result.alignment).toBe('neutral')
    expect(result.reason).toBe('No applicable rule matched')
  })
})

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('Edge cases', () => {
  it('handles empty activeTriggers array without throwing', () => {
    expect(() =>
      scoreAlignment('sell', makeSnapshot({ activeTriggers: [] }))
    ).not.toThrow()
  })

  it('handles activeTriggers with many entries', () => {
    const result = scoreAlignment('sell', makeSnapshot({
      activeTriggers: ['fg-t3-euphoria', 'nupl-fired', 'dom-altseason', 'exit-ladder'],
      fearGreed:      90,
    }))
    // Rule 3 fires first (exit-ladder present + sell)
    expect(result.alignment).toBe('aligned')
    expect(result.reason).toBe('Sold on Exit Ladder trigger')
  })

  it('boundary: fearGreed = 25 for buy → no rule 4 match → neutral', () => {
    const result = scoreAlignment('buy', makeSnapshot({
      positionStage: 'accumulate',
      fearGreed:     25,
    }))
    expect(result.alignment).toBe('neutral')
  })

  it('boundary: fearGreed = 75 for sell → no rule 5 match → neutral', () => {
    const result = scoreAlignment('sell', makeSnapshot({
      fearGreed:      75,
      activeTriggers: [],
    }))
    expect(result.alignment).toBe('neutral')
  })

  it('reduce stage + buy + extreme fear → rule 4 fires (reduce is not misaligned for buy)', () => {
    const result = scoreAlignment('buy', makeSnapshot({
      positionStage: 'reduce',
      fearGreed:     10,
    }))
    expect(result.alignment).toBe('aligned')
    expect(result.reason).toBe('Bought in Extreme Fear')
  })
})
