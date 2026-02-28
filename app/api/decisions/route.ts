export const runtime = 'nodejs'

import { kv }             from '@vercel/kv'
import { fetchPrices }    from '@/app/api/prices/route'
import { getHoldings }    from '@/lib/kv'
import { calcAllTriggers } from '@/lib/calculations'
import { scoreAlignment } from '@/lib/alignment'
import { writeDecision, readDecisions, SCORE_CACHE_KEY } from '@/lib/decisions'
import type { DecisionEntry, MarketSnapshot } from '@/lib/decisions.types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Derives the portfolio strategy phase from BTC price.
 * Thresholds are independent of calcProceedsSplit — these represent
 * cycle phase boundaries, not proceeds allocation zones.
 *
 *   ACCUMULATE   < $120K          — well below cycle peak
 *   DISTRIBUTE   $120K – $175K    — price discovery, take profits
 *   REDUCE       $175K – $225K    — ~80% of Pi Cycle Top signal
 *   EXIT         ≥ $225K          — ~90% of Pi Cycle Top signal
 */
function derivePositionStage(btcPrice: number): MarketSnapshot['positionStage'] {
  if (btcPrice < 120_000) return 'accumulate'
  if (btcPrice < 175_000) return 'distribute'
  if (btcPrice < 225_000) return 'reduce'
  return 'exit'
}

/**
 * Converts TriggerState severity 'fired' to a stable string ID.
 * Only fired triggers are included in activeTriggers — near/watch/warn are
 * not actionable enough to influence alignment scoring.
 */
function triggerToId(status: string): string {
  if (status === 'EXIT LADDER ACTIVE')            return 'exit-ladder'
  if (status === 'EUPHORIA — T3 ZONE')            return 'fg-t3-euphoria'
  if (status === 'EXTREME GREED — T1/T2 ZONE')   return 'fg-t1t2-greed'
  if (status === 'T2 FIRED — ALTCOIN SEASON')     return 'dom-altseason'
  if (status === 'EUPHORIA — T3 ACTIVE')          return 'nupl-t3-euphoria'
  return status.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

// ---------------------------------------------------------------------------
// POST /api/decisions — log a new holding change decision
// ---------------------------------------------------------------------------

export async function POST(req: Request): Promise<Response> {
  let body: {
    asset:        string
    action:       'buy' | 'sell' | 'rebalance'
    amountBefore: number
    amountAfter:  number
    notes?:       string
  }

  try {
    body = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const { asset, action, amountBefore, amountAfter, notes } = body

  if (!asset || !action || amountBefore == null || amountAfter == null) {
    return new Response('Missing required fields: asset, action, amountBefore, amountAfter', { status: 400 })
  }
  if (!['buy', 'sell', 'rebalance'].includes(action)) {
    return new Response('Invalid action — must be buy, sell, or rebalance', { status: 400 })
  }

  // Fetch market data and holdings in parallel — same sources the dashboard uses
  const [prices, holdings] = await Promise.all([fetchPrices(), getHoldings()])

  const triggers       = calcAllTriggers(prices, holdings.nupl)
  const activeTriggers = triggers
    .filter(t => t.severity === 'fired')
    .map(t => triggerToId(t.status))

  const btcPrice = prices.btc ?? 0

  const snapshot: MarketSnapshot = {
    btcPrice,
    fearGreed:     prices.fearGreed    ?? 50,
    btcDominance:  prices.btcDominance ?? 0,
    nupl:          holdings.nupl,
    btcPriceZone:  triggers.find(t => t.label === 'BTC PRICE ZONE')?.status ?? 'UNKNOWN',
    positionStage: derivePositionStage(btcPrice),
    activeTriggers,
  }

  // Convert qty → USD using the current price for this asset.
  // The client sends raw qty (it has no access to prices), so the server
  // does the conversion here where prices are already in scope.
  const priceByAsset: Record<string, number | null> = {
    BTC:  prices.btc,
    MSTR: prices.mstr,
    NEAR: prices.near,
    UNI:  prices.uni,
    LINK: prices.link,
    ONDO: prices.ondo,
  }
  const assetPrice    = priceByAsset[asset.toUpperCase()] ?? null
  const amountBeforeUSD = assetPrice !== null ? amountBefore * assetPrice : amountBefore
  const amountAfterUSD  = assetPrice !== null ? amountAfter  * assetPrice : amountAfter

  const { alignment, reason } = scoreAlignment(action, snapshot)

  const entry: DecisionEntry = {
    id:              crypto.randomUUID(),
    timestamp:       Date.now(),
    asset,
    action,
    amountBefore:    amountBeforeUSD,
    amountAfter:     amountAfterUSD,
    snapshot,
    alignment,
    alignmentReason: reason,
    ...(notes ? { notes } : {}),
  }

  await writeDecision(entry)
  // Invalidate score cache so the next GET /api/decisions/score reflects this decision
  await kv.del(SCORE_CACHE_KEY)

  return Response.json(entry, { status: 201 })
}

// ---------------------------------------------------------------------------
// GET /api/decisions — fetch timeline with optional filters
// ---------------------------------------------------------------------------

export async function GET(req: Request): Promise<Response> {
  const url    = new URL(req.url)
  const params = url.searchParams

  const asset     = params.get('asset')     ?? undefined
  const alignment = params.get('alignment') as 'aligned' | 'misaligned' | 'neutral' | undefined
  const from      = params.get('from')  ? Number(params.get('from'))  : undefined
  const to        = params.get('to')    ? Number(params.get('to'))    : undefined
  const limit     = params.get('limit') ? Number(params.get('limit')) : 20
  const offset    = params.get('offset')? Number(params.get('offset')): 0

  // Read all matching entries to get the accurate total, then paginate in memory
  const allMatching = await readDecisions({ asset, alignment, from, to })
  const total   = allMatching.length
  const entries = allMatching.slice(offset, offset + limit)

  return Response.json({ entries, total })
}
