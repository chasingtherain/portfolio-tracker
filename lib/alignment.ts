import type { MarketSnapshot } from './decisions.types'

export type Alignment = 'aligned' | 'misaligned' | 'neutral'

export type AlignmentResult = {
  alignment: Alignment
  reason:    string
}

/**
 * Scores a single trading action against the user's strategy rules.
 *
 * Rules are evaluated top to bottom — first match wins.
 * This is the pure strategy oracle: no side effects, no external imports.
 * The same inputs always produce the same output, making it trivially testable.
 */
export function scoreAlignment(
  action:   'buy' | 'sell' | 'rebalance',
  snapshot: MarketSnapshot,
): AlignmentResult {
  const { positionStage, activeTriggers, fearGreed } = snapshot

  // Rule 1: Buying during exit stage is always wrong — you should be selling
  if (action === 'buy' && positionStage === 'exit') {
    return { alignment: 'misaligned', reason: 'Bought during Exit stage' }
  }

  // Rule 2: Buying while distributing is also against the plan
  if (action === 'buy' && positionStage === 'distribute') {
    return { alignment: 'misaligned', reason: 'Bought during Distribute stage' }
  }

  // Rule 3: Selling when the exit ladder has fired — exactly what the plan calls for
  if (action === 'sell' && activeTriggers.includes('exit-ladder')) {
    return { alignment: 'aligned', reason: 'Sold on Exit Ladder trigger' }
  }

  // Rule 4: Buying in extreme fear — classic strategy-aligned accumulation
  if (action === 'buy' && fearGreed < 25) {
    return { alignment: 'aligned', reason: 'Bought in Extreme Fear' }
  }

  // Rule 5: Selling in extreme greed — disciplined profit taking
  if (action === 'sell' && fearGreed > 75) {
    return { alignment: 'aligned', reason: 'Sold in Extreme Greed' }
  }

  // Rule 6: Rebalances are portfolio maintenance, not directional bets
  if (action === 'rebalance') {
    return { alignment: 'neutral', reason: 'Rebalances are always neutral' }
  }

  // Rule 7: No rule matched — no opinion
  return { alignment: 'neutral', reason: 'No applicable rule matched' }
}
