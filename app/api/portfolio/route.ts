export const runtime = 'nodejs'

import type { PortfolioState } from '@/lib/types'
import { getHoldings } from '@/lib/kv'
import { DEMO_PORTFOLIO_STATE } from '@/lib/demo-data'
import { fetchPrices } from '@/app/api/prices/route'
import {
  buildPositions,
  calcTotalValue,
  calcAllocationPct,
  buildAllocations,
  calcAllTriggers,
  calcTotalPnl,
  calcProgressToTarget,
  calcGapToTarget,
  calcProceedsSplit,
} from '@/lib/calculations'

// The portfolio value target. Hardcoded as a business constant — changing this
// means editing one line, which is acceptable for a single-user personal tool.
const PORTFOLIO_TARGET = 1_000_000

export async function GET(): Promise<Response> {
  // Demo mode: fully static, zero external API calls, zero KV reads
  if (process.env.MODE === 'demo') {
    return Response.json(DEMO_PORTFOLIO_STATE)
  }

  // Live mode: fetch prices and holdings in parallel — neither depends on the other
  const [prices, holdings] = await Promise.all([
    fetchPrices(),
    getHoldings(),
  ])

  // Two-pass position build:
  // Pass 1 — build positions with allocPct: null (we don't know totalValue yet)
  const positions = buildPositions(holdings, prices)

  // totalValue = sum of positions where price is available
  const totalValue = calcTotalValue(positions)

  // Pass 2 — fill in allocPct now that we have totalValue
  if (totalValue > 0) {
    for (const position of positions) {
      if (position.value !== null) {
        position.allocPct = calcAllocationPct(position.value, totalValue)
      }
    }
  }

  const allocations   = buildAllocations(positions, totalValue)
  const triggers      = calcAllTriggers(prices, holdings.nupl)
  const { totalPnl, pnlPct } = calcTotalPnl(holdings, prices)
  const progressPct   = calcProgressToTarget(totalValue, PORTFOLIO_TARGET)
  const gapToTarget   = calcGapToTarget(totalValue, PORTFOLIO_TARGET)

  // If BTC price is null, fall back to zone 0 (below_150k) — the most conservative default
  const proceedsSplit = calcProceedsSplit(prices.btc ?? 0)

  // pricesPartial: true if any numeric price field is null
  const { fetchedAt: _f, ...priceValues } = prices
  const pricesPartial = Object.values(priceValues).some(v => v === null)

  const state: PortfolioState = {
    mode:        'live',
    totalValue,
    totalPnl,
    pnlPct,
    target:      PORTFOLIO_TARGET,
    gapToTarget,
    progressPct,
    positions,
    allocations,
    triggers,
    proceedsSplit,
    prices,
    updatedAt:   holdings.updatedAt,
    pricesPartial,
  }

  return Response.json(state)
}
