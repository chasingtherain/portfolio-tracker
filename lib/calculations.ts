import type {
  Holdings,
  Prices,
  Position,
  Allocation,
  TriggerState,
  ProceedsSplit,
  BtcPriceZone,
} from './types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TARGET_ALLOCATIONS: Record<string, number> = {
  btc:  60,
  mstr: 15,
  ondo:  7,
  link:  7,
  uni:   7,
  dry:   4,
  near:  0,
}

const ASSET_COLORS: Record<string, string> = {
  btc:  'var(--orange)',
  mstr: '#3b82f6',
  ondo: '#a855f7',
  link: '#06b6d4',
  uni:  '#ec4899',
  near: 'var(--text-dim)',
  dry:  'var(--text-muted)',
}

const ALLOCATION_LABELS: Record<string, string> = {
  btc:  'BTC',
  mstr: 'MSTR',
  ondo: 'ONDO',
  link: 'LINK',
  uni:  'UNI',
  near: 'NEAR',
  dry:  'CASH',
}

// Ordered list for allocation display (not sorted by value like positions)
const ALLOCATION_ORDER = ['btc', 'mstr', 'ondo', 'link', 'uni', 'near', 'dry']

// ---------------------------------------------------------------------------
// Basic calculations
// ---------------------------------------------------------------------------

/**
 * P&L for a single position.
 * costBasis here is the TOTAL cost (qty × perUnitCost), not the per-unit price.
 */
export function calcPositionPnl(
  currentValue: number,
  costBasis: number,
): { pnl: number; pnlPct: number } {
  const pnl = currentValue - costBasis
  const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0
  return { pnl, pnlPct }
}

export function calcAllocationPct(positionValue: number, totalValue: number): number {
  if (totalValue === 0) return 0
  return (positionValue / totalValue) * 100
}

export function calcAllocationGap(currentPct: number, targetPct: number): number {
  return currentPct - targetPct
}

/** Sum of positions where value is not null. */
export function calcTotalValue(positions: Position[]): number {
  return positions.reduce((sum, p) => sum + (p.value ?? 0), 0)
}

export function calcProgressToTarget(totalValue: number, target: number): number {
  if (target === 0) return 0
  return Math.min((totalValue / target) * 100, 100)
}

export function calcGapToTarget(totalValue: number, target: number): number {
  return totalValue - target
}

/**
 * Total portfolio P&L.
 * Returns null if BTC or MSTR price is unavailable — those are the dominant
 * positions and their absence makes any total unreliable.
 * Only sums pnl for assets where the price is known.
 */
export function calcTotalPnl(
  holdings: Holdings,
  prices: Prices,
): { totalPnl: number | null; pnlPct: number | null } {
  if (prices.btc === null || prices.mstr === null) {
    return { totalPnl: null, pnlPct: null }
  }

  const assets = [
    { holding: holdings.btc,  price: prices.btc },
    { holding: holdings.mstr, price: prices.mstr },
    { holding: holdings.near, price: prices.near },
    { holding: holdings.uni,  price: prices.uni },
    { holding: holdings.link, price: prices.link },
    { holding: holdings.ondo, price: prices.ondo },
  ]

  let totalPnl = 0
  let totalInvested = 0

  for (const { holding, price } of assets) {
    if (price === null) continue
    const invested = holding.qty * holding.costBasis
    const value = holding.qty * price
    totalInvested += invested
    totalPnl += value - invested
  }

  const pnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : null
  return { totalPnl, pnlPct }
}

// ---------------------------------------------------------------------------
// Proceeds split (BTC price zone → cash/BTC allocation on exit)
// ---------------------------------------------------------------------------

export function calcProceedsSplit(btcPrice: number): ProceedsSplit {
  if (btcPrice < 150_000) {
    return { zone: 'below_150k', zoneLabel: 'BELOW $150K', cashPct: 30, btcPct: 70 }
  }
  if (btcPrice < 250_000) {
    return { zone: '150k_250k', zoneLabel: '$150K–$250K', cashPct: 50, btcPct: 50 }
  }
  if (btcPrice < 350_000) {
    return { zone: '250k_350k', zoneLabel: '$250K–$350K', cashPct: 70, btcPct: 30 }
  }
  return { zone: 'above_350k', zoneLabel: 'ABOVE $350K', cashPct: 90, btcPct: 10 }
}

// ---------------------------------------------------------------------------
// Trigger evaluators
// ---------------------------------------------------------------------------

export function evalFearGreed(fg: number | null): TriggerState {
  const label = 'FEAR & GREED'
  const condition = 'Near active ≥ 65 · T1/T2 active ≥ 80 · T3 active ≥ 85'

  if (fg === null) {
    return { label, value: '—', status: 'UNKNOWN', severity: 'warn', condition }
  }

  const value = String(fg)

  if (fg >= 85) {
    return { label, value, status: 'EUPHORIA — T3 ZONE', severity: 'fired', condition }
  }
  if (fg >= 80) {
    return { label, value, status: 'EXTREME GREED — T1/T2 ZONE', severity: 'fired', condition }
  }
  if (fg >= 65) {
    return { label, value, status: 'GREED — MONITOR CLOSELY', severity: 'near', condition }
  }
  return { label, value, status: 'FEAR — ACCUMULATE', severity: 'watch', condition }
}

export function evalBtcDominance(dom: number | null): TriggerState {
  const label = 'BTC DOMINANCE'
  const condition = 'Near when 52–55% · T2 fired below 52%'

  if (dom === null) {
    return { label, value: '—', status: 'UNKNOWN', severity: 'warn', condition }
  }

  const value = dom.toFixed(1) + '%'

  if (dom < 52) {
    return { label, value, status: 'T2 FIRED — ALTCOIN SEASON', severity: 'fired', condition }
  }
  if (dom <= 55) {
    return { label, value, status: 'ALTCOIN SEASON APPROACHING', severity: 'near', condition }
  }
  return { label, value, status: 'BTC DOMINANT — WATCH', severity: 'watch', condition }
}

export function evalNupl(nupl: number): TriggerState {
  const label = 'NUPL'
  const condition = 'Near at 0.60–0.74 · T3 euphoria ≥ 0.75'
  const value = nupl.toFixed(2)

  if (nupl >= 0.75) {
    return { label, value, status: 'EUPHORIA — T3 ACTIVE', severity: 'fired', condition }
  }
  if (nupl >= 0.6) {
    return { label, value, status: 'APPROACHING EUPHORIA', severity: 'near', condition }
  }
  return { label, value, status: 'BELIEF PHASE — WATCH', severity: 'watch', condition }
}

export function evalBtcPriceZone(btcPrice: number | null): TriggerState {
  const label = 'BTC PRICE ZONE'
  const condition = 'Exit ladder activates above $200K'

  if (btcPrice === null) {
    return { label, value: '—', status: 'UNKNOWN', severity: 'warn', condition }
  }

  const value = btcPrice >= 1000
    ? '$' + Math.round(btcPrice / 1000) + 'K'
    : '$' + Math.round(btcPrice)

  if (btcPrice >= 200_000) {
    return { label, value, status: 'EXIT LADDER ACTIVE', severity: 'fired', condition }
  }
  if (btcPrice >= 100_000) {
    return { label, value, status: 'HOLD PHASE — APPROACHING EXIT', severity: 'near', condition }
  }
  return { label, value, status: 'ACCUMULATE PHASE', severity: 'watch', condition }
}

/** Returns all four triggers in display order. */
export function calcAllTriggers(prices: Prices, nupl: number): TriggerState[] {
  return [
    evalFearGreed(prices.fearGreed),
    evalBtcDominance(prices.btcDominance),
    evalNupl(nupl),
    evalBtcPriceZone(prices.btc),
  ]
}

// ---------------------------------------------------------------------------
// Position builder
// ---------------------------------------------------------------------------

const CRYPTO_ASSETS = [
  { label: 'Bitcoin',       ticker: 'BTC',  holdingKey: 'btc'  as const, priceKey: 'btc'  as const },
  { label: 'MicroStrategy', ticker: 'MSTR', holdingKey: 'mstr' as const, priceKey: 'mstr' as const },
  { label: 'NEAR Protocol', ticker: 'NEAR', holdingKey: 'near' as const, priceKey: 'near' as const },
  { label: 'Uniswap',       ticker: 'UNI',  holdingKey: 'uni'  as const, priceKey: 'uni'  as const },
  { label: 'Chainlink',     ticker: 'LINK', holdingKey: 'link' as const, priceKey: 'link' as const },
  { label: 'Ondo Finance',  ticker: 'ONDO', holdingKey: 'ondo' as const, priceKey: 'ondo' as const },
]

/**
 * Builds the full positions array from holdings and live prices.
 * Includes dry powder as a cash position (no P&L).
 * Positions are sorted by value descending; null-value positions go last.
 * allocPct is set to null here — the API route fills it in after computing totalValue.
 */
export function buildPositions(holdings: Holdings, prices: Prices): Position[] {
  const cryptoPositions: Position[] = CRYPTO_ASSETS.map(({ label, ticker, holdingKey, priceKey }) => {
    const holding = holdings[holdingKey]
    const price = prices[priceKey]

    if (price === null) {
      return { label, ticker, value: null, pnl: null, pnlPct: null, allocPct: null, priceUnavailable: true }
    }

    const value = holding.qty * price
    const totalCost = holding.qty * holding.costBasis
    const { pnl, pnlPct } = calcPositionPnl(value, totalCost)

    return { label, ticker, value, pnl, pnlPct, allocPct: null, priceUnavailable: false }
  })

  const dryPosition: Position = {
    label: 'Dry Powder',
    ticker: 'USD',
    value: holdings.dryPowder,
    pnl: null,
    pnlPct: null,
    allocPct: null,
    priceUnavailable: false,
  }

  const all = [...cryptoPositions, dryPosition]

  return all.sort((a, b) => {
    if (a.value === null && b.value === null) return 0
    if (a.value === null) return 1
    if (b.value === null) return -1
    return b.value - a.value
  })
}

// ---------------------------------------------------------------------------
// Allocation builder
// ---------------------------------------------------------------------------

/**
 * Builds the allocation panel data from positions and total portfolio value.
 * Returns one Allocation entry per asset in a fixed display order.
 * currentPct and gap are null when the position's value is null.
 */
export function buildAllocations(positions: Position[], totalValue: number): Allocation[] {
  // Build a lookup from ticker → position for quick access
  const byTicker = new Map(positions.map(p => [p.ticker.toLowerCase(), p]))
  byTicker.set('dry', positions.find(p => p.ticker === 'USD') ?? null as unknown as Position)

  return ALLOCATION_ORDER.map(key => {
    const position = key === 'dry'
      ? positions.find(p => p.ticker === 'USD')
      : positions.find(p => p.ticker === key.toUpperCase())

    const value = position?.value ?? null
    const targetPct = TARGET_ALLOCATIONS[key] ?? 0

    if (value === null || totalValue === 0) {
      return {
        key,
        label: ALLOCATION_LABELS[key],
        value,
        currentPct: null,
        targetPct,
        gap: null,
        color: ASSET_COLORS[key],
      }
    }

    const currentPct = calcAllocationPct(value, totalValue)
    const gap = calcAllocationGap(currentPct, targetPct)

    return {
      key,
      label: ALLOCATION_LABELS[key],
      value,
      currentPct,
      targetPct,
      gap,
      color: ASSET_COLORS[key],
    }
  })
}
