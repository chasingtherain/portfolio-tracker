export const runtime = 'nodejs'

import type { Prices } from '@/lib/types'

const COINGECKO_PRICE_URL =
  'https://api.coingecko.com/api/v3/simple/price' +
  '?ids=bitcoin,chainlink,ondo-finance,uniswap,near-protocol,ethereum&vs_currencies=usd'

const COINGECKO_GLOBAL_URL = 'https://api.coingecko.com/api/v3/global'

const ALTERNATIVE_ME_URL = 'https://api.alternative.me/fng/?limit=1'

/**
 * Fetches all market data from four external sources in parallel.
 * Each source can fail independently — a failed source returns null for its
 * price fields rather than throwing, so one down API doesn't break the dashboard.
 *
 * Exported as a named function so app/api/portfolio/route.ts can import it
 * directly. Never call /api/prices over HTTP from another route — that's an
 * internal HTTP round-trip which is unreliable on Vercel's serverless platform.
 */
export async function fetchPrices(): Promise<Prices> {
  const finnhubUrl =
    `https://finnhub.io/api/v1/quote?symbol=MSTR&token=${process.env.FINNHUB_API_KEY}`

  // Promise.allSettled: all four run to completion regardless of individual failures.
  // Promise.all would reject the entire route if any one API is down.
  const [cgPrices, cgGlobal, finnhub, altMe] = await Promise.allSettled([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetch(COINGECKO_PRICE_URL, { next: { revalidate: 300 } } as any).then(r => r.json()),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetch(COINGECKO_GLOBAL_URL, { next: { revalidate: 300 } } as any).then(r => r.json()),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetch(finnhubUrl, { next: { revalidate: 300 } } as any).then(r => r.json()),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetch(ALTERNATIVE_ME_URL, { next: { revalidate: 300 } } as any).then(r => r.json()),
  ])

  const fetchedAt = new Date().toISOString()

  // ---------------------------------------------------------------------------
  // CoinGecko simple/price — BTC, LINK, ONDO, UNI, NEAR, ETH
  // ---------------------------------------------------------------------------
  let btc:  number | null = null
  let link: number | null = null
  let ondo: number | null = null
  let uni:  number | null = null
  let near: number | null = null
  let eth:  number | null = null

  if (cgPrices.status === 'fulfilled') {
    const d = cgPrices.value as Record<string, { usd: number }>
    btc  = d?.bitcoin?.usd        ?? null
    link = d?.chainlink?.usd      ?? null
    ondo = d?.['ondo-finance']?.usd ?? null
    uni  = d?.uniswap?.usd        ?? null
    near = d?.['near-protocol']?.usd ?? null
    eth  = d?.ethereum?.usd       ?? null
  }

  // ---------------------------------------------------------------------------
  // CoinGecko global — BTC dominance
  // ---------------------------------------------------------------------------
  let btcDominance: number | null = null

  if (cgGlobal.status === 'fulfilled') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    btcDominance = (cgGlobal.value as any)?.data?.market_cap_percentage?.btc ?? null
  }

  // ---------------------------------------------------------------------------
  // Finnhub — MSTR stock price
  // { c: currentPrice, d: change, dp: changePct, h: high, l: low, o: open, pc: prevClose }
  // ---------------------------------------------------------------------------
  let mstr: number | null = null

  if (finnhub.status === 'fulfilled') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = (finnhub.value as any)?.c
    // Finnhub returns 0 for invalid symbols — treat 0 as unavailable
    mstr = typeof c === 'number' && c > 0 ? c : null
  }

  // ---------------------------------------------------------------------------
  // Alternative.me — Fear & Greed index (0–100)
  // { data: [{ value: "72", value_classification: "Greed", ... }] }
  // ---------------------------------------------------------------------------
  let fearGreed: number | null = null

  if (altMe.status === 'fulfilled') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = (altMe.value as any)?.data?.[0]?.value
    if (raw != null) {
      const n = Number(raw)
      fearGreed = isNaN(n) ? null : n
    }
  }

  return { btc, mstr, link, ondo, uni, near, eth, fearGreed, btcDominance, fetchedAt }
}

export async function GET(): Promise<Response> {
  const prices = await fetchPrices()
  return Response.json(prices)
}
