export interface AssetHolding {
  qty: number
  costBasis: number // per unit avg cost — server-side only, never sent to client
}

// Full holdings — used server-side only (KV storage + calculations)
export interface Holdings {
  btc: AssetHolding
  mstr: AssetHolding
  near: AssetHolding
  uni: AssetHolding
  link: AssetHolding
  ondo: AssetHolding
  eth: AssetHolding
  dryPowder: number
  nupl: number // manual input — no reliable free API exists
  updatedAt: string // ISO timestamp
}

// Client-safe holdings — quantities only, no cost basis
// Used to pre-populate EditHoldingsPanel fields
export interface ClientHoldings {
  btc: { qty: number }
  mstr: { qty: number }
  near: { qty: number }
  uni: { qty: number }
  link: { qty: number }
  ondo: { qty: number }
  eth: { qty: number }
  dryPowder: number
  nupl: number
  updatedAt: string
}

export interface Prices {
  btc: number | null
  mstr: number | null
  link: number | null
  ondo: number | null
  uni: number | null
  near: number | null
  eth: number | null
  fearGreed: number | null
  btcDominance: number | null
  fetchedAt: string
}

export interface Position {
  label: string
  ticker: string
  value: number | null // null when price unavailable — excluded from totalValue
  pnl: number | null // null when price unavailable
  pnlPct: number | null // null when price unavailable
  allocPct: number | null // null when price unavailable
  priceUnavailable: boolean // true when source API returned null for this asset
}

export interface Allocation {
  key: string
  label: string
  value: number | null
  currentPct: number | null // null when price unavailable
  targetPct: number
  gap: number | null // positive = overweight, negative = underweight; null when price unavailable
  color: string
}

export type TriggerSeverity = 'watch' | 'near' | 'fired' | 'warn'

export interface TriggerState {
  label: string
  value: string
  status: string
  severity: TriggerSeverity
  condition: string
}

export type BtcPriceZone =
  | 'below_150k'
  | '150k_250k'
  | '250k_350k'
  | 'above_350k'

export interface ProceedsSplit {
  zone: BtcPriceZone
  zoneLabel: string
  cashPct: number
  btcPct: number
}

// PortfolioState is the full computed response from /api/portfolio.
// It contains NO raw cost basis figures — only derived values safe for the client.
export interface PortfolioState {
  mode: 'demo' | 'live'
  totalValue: number // sum of positions where price is available only
  totalPnl: number | null // null if BTC or MSTR price is unavailable
  pnlPct: number | null // null if BTC or MSTR price is unavailable
  target: number
  gapToTarget: number
  progressPct: number
  positions: Position[]
  allocations: Allocation[]
  triggers: TriggerState[]
  proceedsSplit: ProceedsSplit
  prices: Prices
  updatedAt: string // from holdings.updatedAt
  pricesPartial: boolean // true if any price source returned null
}
