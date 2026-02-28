export type Alignment = 'aligned' | 'misaligned' | 'neutral'

export type MarketSnapshot = {
  btcPrice:      number
  fearGreed:     number          // 0-100
  btcDominance:  number          // percentage
  nupl:          number
  btcPriceZone:  string
  positionStage: 'accumulate' | 'distribute' | 'reduce' | 'exit'
  activeTriggers: string[]       // IDs of triggers currently fired (severity === 'fired')
}

export type DecisionEntry = {
  id:              string        // crypto.randomUUID()
  timestamp:       number        // Unix ms
  asset:           string
  action:          'buy' | 'sell' | 'rebalance'
  amountBefore:    number        // USD value
  amountAfter:     number        // USD value
  snapshot:        MarketSnapshot
  alignment:       Alignment
  alignmentReason: string
  notes?:          string
}
