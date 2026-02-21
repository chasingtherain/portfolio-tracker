# Jay's Portfolio Tracker — Full Project Spec
## Version 3 — For Claude Code

---

## Project Summary

A Next.js cryptocurrency portfolio tracking dashboard deployed on Vercel. Serves two purposes:

1. **Private live dashboard** — real holdings, live prices, persistent storage, password protected
2. **Public demo** — synthetic data, no auth, for portfolio website showcase

Two Vercel deployments from one GitHub repository. One codebase, two configs.

---

## Repository Setup

```bash
npx create-next-app portfolio-tracker --typescript --app --no-tailwind --no-eslint
cd portfolio-tracker
npm install @vercel/kv
```

No UI library. No auth library. No ORM. Custom CSS only.

---

## Folder Structure

```
/
├── app/
│   ├── page.tsx                        ← main dashboard page
│   ├── layout.tsx                      ← root layout, fonts, metadata
│   ├── globals.css                     ← full design system, CSS variables
│   └── api/
│       ├── prices/
│       │   └── route.ts                ← fetches all live market data
│       ├── portfolio/
│       │   └── route.ts                ← GET: computes full portfolio state
│       └── holdings/
│           └── route.ts                ← GET + PUT: read/write holdings from KV
├── components/
│   ├── Header.tsx
│   ├── StatBar.tsx
│   ├── ProgressBar.tsx
│   ├── PhaseIndicator.tsx
│   ├── PositionsTable.tsx
│   ├── AllocationBars.tsx
│   ├── TriggerMonitor.tsx
│   ├── ExitLadder.tsx
│   ├── ScenarioTable.tsx
│   ├── Checklist.tsx
│   ├── EditHoldingsPanel.tsx           ← live mode only, hidden in demo
│   └── DemoBadge.tsx                   ← visible in demo mode, not dismissable
├── lib/
│   ├── types.ts                        ← all TypeScript interfaces
│   ├── demo-data.ts                    ← full synthetic dataset (complete PortfolioState)
│   ├── calculations.ts                 ← pure calculation functions
│   ├── formatters.ts                   ← number formatting pure functions
│   └── kv.ts                           ← KV read/write helpers + toClientHoldings
├── app/
│   ├── page.tsx                        ← main dashboard page
│   ├── layout.tsx                      ← root layout, fonts, metadata
│   ├── globals.css                     ← full design system, CSS variables
│   └── api/
│       ├── prices/
│       │   └── route.ts                ← fetches all live market data
│       ├── portfolio/
│       │   └── route.ts                ← GET: computes full portfolio state
│       ├── holdings/
│       │   └── route.ts                ← GET + PUT: read/write holdings from KV
│       └── checklist/
│           └── route.ts                ← GET + PUT: read/write checklist state from KV
├── next.config.ts
└── .env.local                          ← local dev only, gitignored
```

---

## Page Layout Spec

The dashboard is a single scrollable page. Desktop-first. Max content width: `1200px`, centered. Background: `var(--bg)`. All panels use `var(--surface)` with `var(--border)` borders and `12px` border-radius.

### Layout grid (top to bottom):

```
┌─────────────────────────────────────────────────────┐
│  DemoBadge (full width — only in demo mode)          │
├─────────────────────────────────────────────────────┤
│  Header (full width)                                 │
│  Logo / title left — fetchedAt timestamp + refresh   │
│  button right                                        │
├─────────────────────────────────────────────────────┤
│  StatBar (full width — 4 cards in a row)             │
├─────────────────────────────────────────────────────┤
│  ProgressBar (full width)                            │
├─────────────────────────────────────────────────────┤
│  PhaseIndicator (full width)                         │
├───────────────────────────┬─────────────────────────┤
│  PositionsTable (60%)     │  AllocationBars (40%)    │
├───────────────────────────┴─────────────────────────┤
│  TriggerMonitor (full width — 4 triggers in a row)   │
├───────────────────────────┬─────────────────────────┤
│  ExitLadder + ProceedsSplit (60%) │ ScenarioTable (40%) │
├───────────────────────────────────────────────────────┤
│  Checklist (full width)                              │
├─────────────────────────────────────────────────────┤
│  EditHoldingsPanel (full width — live mode only)     │
└─────────────────────────────────────────────────────┘
```

**Notes:**
- The 60/40 split panels use CSS Grid: `grid-template-columns: 3fr 2fr` with `16px` gap.
- On screens below `768px`: all panels stack to single column.
- Panel padding: `20px` on all sides.
- Section gap between panels: `16px`.
- `ProceedsSplit` is rendered as a sub-section inside `ExitLadder.tsx` below the tranche table — same panel, no separate component.

---

## Environment Variables

### Demo deployment
```env
NEXT_PUBLIC_IS_DEMO=true
MODE=demo
```

### Live deployment
```env
NEXT_PUBLIC_IS_DEMO=false
MODE=live
HOLDINGS_PASSWORD=choose_a_strong_password_here
PORTFOLIO_TARGET=1500000
FINNHUB_API_KEY=                        # free at finnhub.io — required for MSTR price
KV_REST_API_URL=                        # auto-filled by Vercel when KV is connected
KV_REST_API_TOKEN=                      # auto-filled by Vercel when KV is connected
```

**Variable responsibilities:**
- `MODE` — server-side only (no `NEXT_PUBLIC_` prefix). Used in API routes to switch between demo and live behaviour. Never exposed to the client bundle.
- `NEXT_PUBLIC_IS_DEMO` — client-side only. Used exclusively by `DemoBadge.tsx` to render the demo banner. Safe to expose — it contains no sensitive information.
- `FINNHUB_API_KEY` — server-side only. Never exposed to client. Free tier at finnhub.io supports 60 calls/minute — more than sufficient with 5-minute caching.

### KV setup in Vercel
1. Go to your Vercel project → Storage → Create KV Database
2. Connect it to the live deployment only
3. Vercel auto-injects `KV_REST_API_URL` and `KV_REST_API_TOKEN`
4. Demo deployment has no KV connection

---

## TypeScript Types (`lib/types.ts`)

```ts
export interface AssetHolding {
  qty: number
  costBasis: number           // per unit avg cost — server-side only, never sent to client
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
  nupl: number                // manual input — no reliable free API exists
  updatedAt: string           // ISO timestamp
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
  value: number | null        // null when price unavailable — excluded from totalValue
  pnl: number | null          // null when price unavailable
  pnlPct: number | null       // null when price unavailable
  allocPct: number | null     // null when price unavailable
  priceUnavailable: boolean   // true when source API returned null for this asset
}

export interface Allocation {
  key: string
  label: string
  value: number
  currentPct: number
  targetPct: number
  gap: number                 // positive = overweight, negative = underweight
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

// PortfolioState is the full computed response from /api/portfolio
// It contains NO raw cost basis figures — only derived values safe for the client
export interface PortfolioState {
  mode: 'demo' | 'live'
  totalValue: number          // sum of positions where price is available only
  totalPnl: number | null     // null if any major price is unavailable
  pnlPct: number | null       // null if any major price is unavailable
  target: number
  gapToTarget: number
  progressPct: number
  positions: Position[]       // individual positions may have null values
  allocations: Allocation[]
  triggers: TriggerState[]
  proceedsSplit: ProceedsSplit
  prices: Prices
  updatedAt: string           // from holdings.updatedAt
  pricesPartial: boolean      // true if any price source returned null
}
```

---

## KV Data Structure (`lib/kv.ts`)

Two keys in KV:
- `'holdings'` — full `Holdings` object
- `'checklist'` — `Record<number, boolean>` mapping item index (0–7) to checked state

Stored as JSON. Reading and writing always the full object per key.

```ts
// lib/kv.ts
import { kv } from '@vercel/kv'
import type { Holdings } from './types'

const DEFAULT_HOLDINGS: Holdings = {
  btc:        { qty: 3.1421,  costBasis: 41174.40 },
  mstr:       { qty: 120,     costBasis: 270 },
  near:       { qty: 10960,   costBasis: 4.007 },
  uni:        { qty: 2400,    costBasis: 7.2923 },
  link:       { qty: 84.6,    costBasis: 8.6884 },
  ondo:       { qty: 0,       costBasis: 0.27 },
  eth:        { qty: 0.37,    costBasis: 2000 },
  dryPowder:  0,
  nupl:       0.35,
  updatedAt:  '2026-02-21T00:00:00Z',
}

export async function getHoldings(): Promise<Holdings> {
  try {
    const data = await kv.get<Holdings>('holdings')
    return data ?? DEFAULT_HOLDINGS
  } catch {
    return DEFAULT_HOLDINGS
  }
}

export async function setHoldings(holdings: Holdings): Promise<void> {
  await kv.set('holdings', holdings)
}
```

Also export a helper to strip cost basis before sending to client:

```ts
export function toClientHoldings(h: Holdings): ClientHoldings {
  return {
    btc:        { qty: h.btc.qty },
    mstr:       { qty: h.mstr.qty },
    near:       { qty: h.near.qty },
    uni:        { qty: h.uni.qty },
    link:       { qty: h.link.qty },
    ondo:       { qty: h.ondo.qty },
    eth:        { qty: h.eth.qty },
    dryPowder:  h.dryPowder,
    nupl:       h.nupl,
    updatedAt:  h.updatedAt,
  }
}
```

Checklist KV helpers:

```ts
// Default: all unchecked
const DEFAULT_CHECKLIST: Record<number, boolean> = {
  0: false, 1: false, 2: false, 3: false,
  4: false, 5: false, 6: false, 7: false,
}

export async function getChecklist(): Promise<Record<number, boolean>> {
  try {
    const data = await kv.get<Record<number, boolean>>('checklist')
    return data ?? DEFAULT_CHECKLIST
  } catch {
    return DEFAULT_CHECKLIST
  }
}

export async function setChecklist(state: Record<number, boolean>): Promise<void> {
  await kv.set('checklist', state)
}

export async function resetChecklist(): Promise<void> {
  await kv.set('checklist', DEFAULT_CHECKLIST)
}
```

`resetChecklist()` is called automatically at the end of a successful `PUT /api/holdings` write, before returning the response. This forces the monthly review checklist to be re-completed after each holdings update.

---

## API Routes

### `GET /api/prices` (`app/api/prices/route.ts`)

Fetches live market data. Server-side only. Results cached 5 minutes via `next: { revalidate: 300 }` on **every** fetch call — this must be applied to all three sources individually, not just one.

**Runtime:** Add `export const runtime = 'nodejs'` at the top of this file. Required because the route makes outbound HTTP calls — Edge runtime does not support this reliably.

**Sources:**
- CoinGecko free API (no key needed): BTC, LINK, ONDO, UNI, NEAR, ETH, BTC dominance
- Finnhub REST API (free key required): MSTR stock price
- Alternative.me API (no key needed): Fear & Greed Index

```ts
export const runtime = 'nodejs'

// CoinGecko — crypto prices
const COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,chainlink,ondo-finance,uniswap,near,ethereum&vs_currencies=usd'
const COINGECKO_GLOBAL = 'https://api.coingecko.com/api/v3/global'
const FEAR_GREED_URL = 'https://api.alternative.me/fng/?limit=1'

// Finnhub — MSTR stock price (replaces yahoo-finance2 which fails on Vercel)
// Free tier: 60 calls/minute. With 5-min caching this will never be exceeded.
const FINNHUB_URL = `https://finnhub.io/api/v1/quote?symbol=MSTR&token=${process.env.FINNHUB_API_KEY}`

// Apply revalidate: 300 to ALL fetch calls
const res = await fetch(COINGECKO_URL, { next: { revalidate: 300 } })
const mstrRes = await fetch(FINNHUB_URL, { next: { revalidate: 300 } })
const fgRes = await fetch(FEAR_GREED_URL, { next: { revalidate: 300 } })
const globalRes = await fetch(COINGECKO_GLOBAL, { next: { revalidate: 300 } })

// Finnhub response shape
// { c: currentPrice, h: high, l: low, o: open, pc: previousClose }
const mstrPrice = mstrData.c ?? null
```

**Also export `fetchPrices()` as a named function** so `/api/portfolio` can import and call it directly without making an internal HTTP request:

```ts
// Export for direct import by /api/portfolio/route.ts
export async function fetchPrices(): Promise<Prices> {
  // ... same logic as the GET handler
}

export async function GET() {
  const prices = await fetchPrices()
  return Response.json(prices)
}
```

**Error handling:** Wrap each source in its own try/catch. If any source fails (including 429), that field returns `null`. Never throw a 500. Apply `revalidate: 300` on every fetch — if CoinGecko rate-limits (429), treat identically to a network failure.

**Response shape:**
```ts
{
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
```

---

### `GET /api/portfolio` (`app/api/portfolio/route.ts`)

Combines prices + holdings, runs all calculations, returns full portfolio state.

**Runtime:** Add `export const runtime = 'nodejs'` at the top of this file. Required for KV access.

**Important:** Raw cost basis figures are used server-side only for calculation. The response returns only derived values — P&L percentages, total value, allocation percentages. No raw cost basis numbers ever leave the server.

Reads mode from `process.env.MODE` (not `NEXT_PUBLIC_MODE`). If `demo`, returns `DEMO_PORTFOLIO_STATE` from `lib/demo-data.ts` directly — no KV reads, no price fetches, no external calls.

For live mode, import and call `fetchPrices()` directly from `app/api/prices/route.ts` — do **not** make an internal HTTP fetch to `/api/prices`. Internal route-to-route HTTP calls are fragile in Vercel's serverless environment.

```ts
// Correct — direct import
import { fetchPrices } from '@/app/api/prices/route'

// Wrong — do not do this
const res = await fetch('/api/prices')
```

**Response:** Full `PortfolioState` object (see types above). No `cost` or `totalCost` fields anywhere in the response.

---

### `GET /api/holdings` (`app/api/holdings/route.ts`)

Returns `ClientHoldings` (qty + nupl only, no cost basis) for pre-populating the edit form.

**Runtime:** Add `export const runtime = 'nodejs'` at the top of this file.

Live mode only. Checks `process.env.MODE`. Returns 403 if `MODE !== 'live'`.

---

### `PUT /api/holdings` (`app/api/holdings/route.ts`)

Updates holdings in KV.

**Runtime:** `export const runtime = 'nodejs'` — required for KV access.

**Rate limiting:** Max 5 attempts per IP per 15 minutes. Stored in Vercel KV — **not** in-memory. In-memory Maps reset on every cold start in Vercel's serverless environment and would never accumulate, making the rate limit ineffective.

KV key pattern: `ratelimit:${ip}` with a 15-minute TTL. On each request, increment the counter. If count exceeds 5, return 429. KV is already in the stack — this adds two lines of logic.

```ts
// Rate limit using KV (works across serverless invocations)
const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
const key = `ratelimit:${ip}`
const attempts = (await kv.get<number>(key)) ?? 0
if (attempts >= 5) return Response.json({ error: 'Too many attempts' }, { status: 429 })
await kv.set(key, attempts + 1, { ex: 900 }) // 900s = 15 minutes TTL
```

**Authentication:** Password compared directly against `process.env.HOLDINGS_PASSWORD` as plain text. Intentional — do not add bcrypt or hashing.

**Request body:**
```ts
{
  password: string
  holdings: {
    btc:        { qty: number }
    mstr:       { qty: number, costBasis: number }
    near:       { qty: number, costBasis: number }
    uni:        { qty: number, costBasis: number }
    link:       { qty: number, costBasis: number }
    ondo:       { qty: number, costBasis: number }
    eth:        { qty: number, costBasis: number }
    dryPowder:  number
    nupl:       number
  }
}
```

Note: `btc` cost basis is intentionally omitted from the PUT body — it is fixed at $41,174.40 and should not be editable via the UI. It is hardcoded in `DEFAULT_HOLDINGS` and preserved on every write.

**Validation:**
- Password must match `process.env.HOLDINGS_PASSWORD`
- All qty values must be non-negative numbers
- `nupl` must be between 0 and 1
- Returns 401 on wrong password, 429 on rate limit exceeded, 400 on invalid data, 200 on success

**On success:** Writes to KV with `updatedAt: new Date().toISOString()`. Calls `resetChecklist()` to clear checklist state. Returns updated `PortfolioState`.

---

### `GET /api/checklist` (`app/api/checklist/route.ts`)

Returns current checklist state as `Record<number, boolean>`.

**Runtime:** `export const runtime = 'nodejs'`

Live mode only — returns `403` if `MODE !== 'live'`. In demo mode, checklist state is managed in React component state only.

---

### `PUT /api/checklist` (`app/api/checklist/route.ts`)

Updates a single checklist item's checked state.

**Runtime:** `export const runtime = 'nodejs'`

No password required — checklist state is not sensitive. Live mode only.

**Request body:**
```ts
{ index: number, checked: boolean }
```

**Response:** Updated `Record<number, boolean>`.

No rate limiting needed — this is a non-sensitive toggle with no financial data.

---

## Calculations (`lib/calculations.ts`)

All pure functions. No side effects. Fully unit testable.

```ts
// P&L — cost basis used internally, never returned in Position struct
calcPositionPnl(currentValue: number, costBasis: number): { pnl: number, pnlPct: number }

// Allocation
calcAllocationPct(positionValue: number, totalValue: number): number
calcAllocationGap(currentPct: number, targetPct: number): number

// Portfolio summary
// totalValue = sum of positions where value is not null
calcTotalValue(positions: Position[]): number
// Returns null if any BTC/MSTR position price is unavailable (unreliable total)
calcTotalPnl(holdings: Holdings, prices: Prices): { totalPnl: number | null, pnlPct: number | null }
calcProgressToTarget(totalValue: number, target: number): number
calcGapToTarget(totalValue: number, target: number): number

// BTC price zone → proceeds split rule
calcProceedsSplit(btcPrice: number): ProceedsSplit

// Trigger evaluations — each accepts null and returns severity:'warn' / status:'UNKNOWN' if null
evalFearGreed(fg: number | null): TriggerState
evalBtcDominance(dom: number | null): TriggerState
evalNupl(nupl: number): TriggerState
evalBtcPriceZone(btcPrice: number | null): TriggerState

// Master trigger evaluator — reads nupl from holdings, rest from prices
calcAllTriggers(prices: Prices, nupl: number): TriggerState[]

// Build full positions array from holdings + prices
// If price for an asset is null: value/pnl/pnlPct/allocPct = null, priceUnavailable = true
// That position is excluded from totalValue calculation
buildPositions(holdings: Holdings, prices: Prices): Position[]

// Build allocation array vs targets
// Positions with null value are shown with currentPct: null and gap: null
buildAllocations(positions: Position[], totalValue: number): Allocation[]
```

### Null price handling rules
```
If prices.btc is null:
  - BTC position: value/pnl/pnlPct = null, priceUnavailable = true
  - totalValue excludes BTC
  - BTC price zone trigger: severity = 'warn', status = 'UNKNOWN'
  - proceedsSplit: cannot be determined, show '—'

If prices.fearGreed is null:
  - F&G trigger: severity = 'warn', status = 'UNKNOWN'
  - T1/T2 tranche conditions cannot be evaluated — show warning

Any position with priceUnavailable = true:
  - PositionsTable: value/P&L columns show '—' with ⚠ icon
  - AllocationBars: bar renders empty with '—' label

If pricesPartial = true (any null price):
  - Show banner below StatBar: "⚠ Some prices unavailable — totals may be incomplete"
  - Banner uses --yellow colour, dismissable for the session
```

### Target allocations (hardcoded in calculations.ts)
```ts
const TARGET_ALLOCATIONS = {
  btc:  60,
  mstr: 15,  // shares only
  ondo: 7,
  link: 7,
  uni:  7,
  dry:  4,
}
```

### Trigger thresholds
```ts
// Fear & Greed
// < 65:         WATCH
// 65–79:        GREED — monitor closely
// 80–84:        T1/T2 ZONE — tranche 1 and 2 conditions active
// ≥ 85:         T3 ZONE — tranche 3 condition active

// BTC Dominance
// > 55%:        WATCH
// 52–55%:       NEAR — altcoin season approaching
// < 52%:        T2 FIRED — tranche 2 condition active

// NUPL
// < 0.6:        WATCH
// 0.6–0.74:     NEAR — approaching euphoria
// ≥ 0.75:       EUPHORIA — T3 condition active
```

### BTC proceeds split
```ts
// BTC below $150k:    30% cash | 70% BTC
// BTC $150k–$250k:   50% cash | 50% BTC
// BTC $250k–$350k:   70% cash | 30% BTC
// BTC above $350k:   90% cash | 10% BTC
```

---

## Demo Data (`lib/demo-data.ts`)

A complete `PortfolioState` object with plausible but fictional data. Characteristics:

- Portfolio started at ~$80k, currently at ~$192k
- Target: $750,000 (not $1.5M — don't reveal the real target)
- BTC heavy: ~58% allocation, ~2.1 BTC held
- One position underwater and being rotated (fictional "AVAX" or similar)
- LINK and a RWA token being built up monthly
- Progress to target: ~25.6%
- Fear & Greed: 22 (fear)
- BTC dominance: 57.4%
- NUPL: 0.31
- All triggers in WATCH state — nothing firing
- MSTR shares down ~18%
- `updatedAt`: set to a recent plausible date

The demo tells a story of disciplined accumulation during a bear/recovery phase. It looks real. It is not Jay's data.

---

## UI Components

### `DemoBadge.tsx`
Rendered at the top of the page when `process.env.NEXT_PUBLIC_IS_DEMO === 'true'`. A persistent non-dismissable banner:
```
⚠ DEMO MODE — Synthetic data only. No real portfolio values shown.
```
Styled in orange. Always visible. Uses `NEXT_PUBLIC_IS_DEMO` (client-safe) — never `MODE` (server-only).

---

### `Header.tsx`
Full-width. Two columns: left and right.

**Left:** Dashboard title `JAY'S PORTFOLIO TRACKER` in `var(--mono)` uppercase, `var(--orange)` colour. Subtitle: `$1.5M TARGET · DEC 2030` in `var(--text-muted)`.

**Right:** `fetchedAt` timestamp + refresh button.
- Timestamp format: `Prices as of HH:MM:SS` in local time, `var(--text-muted)`, monospace.
- If `fetchedAt` is more than 10 minutes ago: show timestamp in `var(--yellow)` with a `⚠` prefix — indicates stale data.
- Refresh button: icon-only (↻ or similar), `var(--text-muted)` colour, turns `var(--orange)` on hover.
- **During refresh:** button shows a CSS spinning animation (`@keyframes spin`). Existing dashboard data stays visible — do NOT re-show skeleton loaders. Only update when new response arrives.
- **After refresh:** button returns to idle state. Timestamp updates.

---

### `StatBar.tsx`
Four equal-width cards in a single row. Each card: label top, value bottom.

| Card | Label | Value | Notes |
|------|-------|-------|-------|
| 1 | TOTAL VALUE | `$258,121` | Large mono font, `var(--text)` |
| 2 | vs TARGET | `–$1,241,879` | Red if negative, green if positive. Show P&L% in smaller text below: `–82.8%` |
| 3 | BTC PRICE | `$67,420` | `var(--text)`. Show null as `—` with `⚠` |
| 4 | FEAR & GREED | `12 · EXTREME FEAR` | Colour-coded: ≤25 green (accumulate), 26–49 teal, 50–74 yellow, 75–84 orange, ≥85 red |

If `pricesPartial = true`, show a subtle `⚠` icon on any card whose data is affected.

---

### `ProgressBar.tsx`
Full-width panel. Shows progress toward the $1.5M target.

- Panel label: `PROGRESS TO TARGET`
- Bar: horizontal, full width of panel interior. Filled portion uses `var(--orange)`. Background track uses `var(--surface2)`. Height: `12px`. Border-radius: `6px`.
- Fill percentage: `progressPct` (capped at 100% visually).
- Labels below bar — left: `$0`, centre: current value + percentage (e.g. `$258,121 · 17.2%`), right: `$1,500,000`.
- Centre label is positioned absolutely above the fill line's leading edge, clamped to stay within panel bounds.
- Below bar: two lines of smaller muted text:
  - `Gap to target: $1,241,879`
  - `At $3,500/month DCA + target CAGR — estimated Dec 2030`

---

### `PhaseIndicator.tsx`
Full-width panel. Four segments in a horizontal row separated by `›` arrows.

```
[ PHASE 1: ACCUMULATE ] › [ PHASE 2: HOLD ] › [ PHASE 3: EXIT LADDER ] › [ PHASE 4: ROTATE ]
   BTC < $100k               $100k–$200k          $200k+                    Post-peak bear
```

- Active phase: `var(--orange)` background, `var(--bg)` text, bold.
- Completed phases (BTC already passed that range): `var(--green-dim)` background, `var(--green)` text.
- Future phases: `var(--surface2)` background, `var(--text-dim)` text.
- Phase determined by live `prices.btc`. If `prices.btc` is null: all segments in future state, show `⚠ BTC price unavailable` below.

---

### `PositionsTable.tsx`
Panel title: `POSITIONS`. Table with columns:

| Column | Content | Alignment |
|--------|---------|-----------|
| Asset | Label + ticker badge | Left |
| Value | `$8,186` or `—` + ⚠ | Right |
| P&L $ | `+$80,656` or `–$9,325` | Right, green/red |
| P&L % | `+63.2%` or `–74.1%` | Right, green/red |
| Alloc | `81.3%` | Right, muted |

- Rows sorted by current value descending.
- P&L values: green (`var(--green)`) if positive, red (`var(--red)`) if negative. Always show `+` prefix for positive.
- If `priceUnavailable = true` for a position: value, P&L $, P&L %, and alloc columns all show `—` with a single `⚠` in the Value cell.
- Row hover: subtle `var(--surface2)` background.
- No pagination — all positions visible.

---

### `AllocationBars.tsx`
Panel title: `ALLOCATION vs TARGET`. One row per asset.

Each row:
```
BTC  ████████████████████░░░░░░░  81.3% / 60% target  +21.3% OW
```

- Label left (5 chars fixed width, mono).
- Bar: current allocation filled in asset colour, target allocation marked with a vertical tick line.
- Percentage right: `currentPct% / targetPct% target`.
- Gap label far right: `+X% OW` (overweight, orange) or `–X% UW` (underweight, muted yellow) or `✓` if within 1%.
- If `currentPct` is null (price unavailable): bar renders empty, percentage shows `—`.
- Asset colours: BTC → `var(--orange)`, MSTR → `#3b82f6` (blue), ONDO → `#a855f7` (purple), LINK → `#06b6d4` (cyan), UNI → `#ec4899` (pink), ETH/NEAR → `var(--text-dim)`.

---

### `TriggerMonitor.tsx`
Panel title: `EXIT TRIGGERS`. Four trigger cards in a 2×2 grid (or single row on wide screens).

Each card shows:
- Trigger name (e.g. `FEAR & GREED`)
- Current value (e.g. `12`)
- Status label (e.g. `EXTREME FEAR — ACCUMULATE`)
- Condition description (e.g. `T1/T2 fires when > 80 for 5 days`)

Severity styling:
- `watch` → `var(--border)` border, `var(--text-muted)` text — neutral
- `near` → `var(--yellow)` border, `var(--yellow)` value text — monitor
- `fired` → `var(--green)` border, `var(--green)` value text, `var(--green-dim)` background — action required
- `warn` → `var(--red)` border, `var(--red)` value text — data unavailable

---

### `ExitLadder.tsx`
Panel title: `EXIT LADDER`. Contains two sub-sections:

**Sub-section 1 — Tranche targets table:**

Columns: Asset | Tranche 1 | Tranche 2 | Tranche 3 | Sell Order

For each tranche cell, show:
- Target price (e.g. `$1.35`)
- Distance from current price (e.g. `+400%` to target, or `✓ HIT` if current price ≥ target)
- `✓ HIT` shown in `var(--green)`. Distance shown in `var(--text-muted)`.

If price is unavailable for an asset: distance cells show `—`.

**Sub-section 2 — Proceeds split (below the table, same panel):**
Title: `PROCEEDS SPLIT RULE — CURRENT BTC ZONE`

Show current zone prominently:
```
BTC at $67,420 → BELOW $150K ZONE
→ 70% into BTC  |  30% to Cash/Stables
```

Below that, the full reference table — all 4 zones, current zone highlighted in orange.

---

### `ScenarioTable.tsx`
Panel title: `2030 SCENARIOS`. The 5-row scenario table as specced in the data section. Target row (`$300k`) highlighted with `var(--orange)` left border and slightly lighter background. All other rows standard surface styling.

---

### `Checklist.tsx`
Panel title: `MONTHLY REVIEW CHECKLIST`. Eight items, each with:

- Checkbox (styled, not native `<input type="checkbox">` — use a CSS-styled div)
- Flag badge (colour per flag type)
- Question text

**Check state:** Persists in KV under key `'checklist'` as a `Record<number, boolean>`. Resets to all-unchecked automatically every time a successful `PUT /api/holdings` save completes (forcing re-review each month).

In demo mode: checkboxes visible but state is in React state only (no KV).

---

### `EditHoldingsPanel.tsx`
Rendered only when `mode === 'live'`. A collapsible section below the main dashboard. Collapsed by default, opens on click of `▸ UPDATE HOLDINGS` toggle button.

**Fields:**

| Field | Input | Notes |
|-------|-------|-------|
| BTC qty | Number | BTC cost basis NOT editable — locked at $41,174.40 |
| MSTR qty | Number | |
| MSTR cost basis | Number | Per share avg cost |
| NEAR qty | Number | |
| NEAR cost basis | Number | |
| UNI qty | Number | |
| UNI cost basis | Number | |
| LINK qty | Number | |
| LINK cost basis | Number | |
| ONDO qty | Number | |
| ONDO cost basis | Number | |
| ETH qty | Number | |
| ETH cost basis | Number | |
| Dry powder ($) | Number | Total uninvested cash |
| NUPL | Number (0–1) | Manual — check glassnode.com |
| Password | Password | Show/hide toggle (👁 icon) |

**Password UX:** Password is stored in React component state for the session. If you save successfully and then need to save again (e.g. correcting a typo), the password field retains its value — you do not need to re-type it. The field is never cleared on success, only on page reload.

**Save button:** `SAVE HOLDINGS`. On click:
1. Button shows `SAVING...` and is disabled.
2. On success: button returns to normal, `updatedAt` timestamp updates, checklist resets, dashboard data refreshes.
3. On failure: inline error message below password field. Button re-enables.

**Timestamps:** `Last saved: 21 Feb 2026 at 14:32:07` in `var(--text-muted)` mono below the save button.

The panel does not render at all in demo mode — not hidden with CSS, not in the DOM.

---

## Design System (`globals.css`)

Dark terminal aesthetic. Copy these CSS variables exactly — the component styles depend on them.

```css
:root {
  --bg: #0a0a0a;
  --surface: #111111;
  --surface2: #161616;
  --border: #222222;
  --border2: #2a2a2a;
  --orange: #f97316;
  --orange-dim: #7c3a0d;
  --green: #22c55e;
  --green-dim: #14532d;
  --red: #ef4444;
  --red-dim: #7f1d1d;
  --yellow: #eab308;
  --yellow-dim: #713f12;
  --text: #e5e5e5;
  --text-muted: #737373;
  --text-dim: #404040;
  /* Fallback stack ensures design holds if Google Fonts fails to load */
  --mono: 'IBM Plex Mono', 'Courier New', Courier, monospace;
  --sans: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
```

Font import (add to `layout.tsx`). Use `display=swap` to prevent invisible text during font load:
```
https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&family=IBM+Plex+Sans:wght@300;400;600&display=swap
```

A scanline texture overlay is applied via `body::before` — a repeating linear gradient that adds subtle depth. Replicate from the original HTML prototype.

---

## Number Formatting Rules

Apply consistently everywhere numbers appear in the UI. No exceptions.

```
Currency (≥ $1,000):     $258,121        — $ prefix, comma separator, 0 decimal places
Currency (< $1,000):     $8.69           — $ prefix, 2 decimal places
Currency (< $1):         $0.2714         — $ prefix, 4 decimal places

BTC quantity:            3.1421 BTC      — 4 decimal places always
Token quantity (≥ 1):    2,400 UNI       — comma separator, 0 decimal places
Token quantity (< 1):    0.3700 ETH      — 4 decimal places

Percentages:             +63.2%          — 1 decimal place, always show + prefix if positive
P&L dollar:              +$80,656        — always show + prefix if positive, currency rules above
P&L percent:             –74.1%          — use – (en dash), not hyphen

NUPL:                    0.35            — 2 decimal places, no % sign
BTC dominance:           58.4%           — 1 decimal place

Large numbers (≥ $1M):   $1,241,879      — full number with commas, no abbreviation
Gap to target:           –$1,241,879     — show minus sign, full number
```

**Implementation:** Create a `lib/formatters.ts` file with pure formatting functions:
```ts
export function formatCurrency(n: number | null): string
export function formatPct(n: number | null, showSign?: boolean): string
export function formatQty(n: number | null, ticker: string): string
export function formatPnl(n: number | null): string
export function formatPnlPct(n: number | null): string
```
All functions return `'—'` when passed `null`. Import from components — never format inline.

---

## Skeleton Loaders

All skeleton elements use the same CSS animation:
```css
@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50%       { opacity: 0.8; }
}
.skeleton {
  background: var(--surface2);
  border-radius: 4px;
  animation: pulse 1.5s ease-in-out infinite;
}
```

Per-panel skeleton specs (approximate heights matching real content):

| Panel | Skeleton |
|-------|----------|
| StatBar | 4 cards × `80px` height |
| ProgressBar | Single `48px` block full width |
| PhaseIndicator | Single `44px` block full width |
| PositionsTable | 7 rows × `40px` with header `32px` |
| AllocationBars | 6 rows × `36px` |
| TriggerMonitor | 4 cards × `90px` in 2×2 grid |
| ExitLadder | `200px` block |
| ScenarioTable | 5 rows × `40px` with header `32px` |
| Checklist | 8 rows × `44px` |

Skeleton loaders are shown immediately on page load, replaced all at once when `/api/portfolio` responds. Do **not** replace individual panels as data arrives — wait for the full response, then render all panels simultaneously.

---

## `next.config.ts`

Specify this explicitly — do not leave it as the create-next-app default.

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Disable the X-Powered-By: Next.js header
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Allow Google Fonts
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  // required for Next.js
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "connect-src 'self'",
              "img-src 'self' data:",
            ].join('; '),
          },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}

export default nextConfig
```

---

## Page Load Behaviour (`app/page.tsx`)

```
1. Page renders immediately with skeleton loaders in ALL panels simultaneously
2. Client fetches GET /api/portfolio (single fetch)
3. When response arrives: ALL panels populate simultaneously — no partial renders
4. Header shows fetchedAt timestamp
5. If pricesPartial = true: show partial data warning banner below StatBar
```

Manual refresh button only. No polling. No websockets. This is a monthly review tool.

**Refresh behaviour:**
- Refresh button shows CSS spin animation during fetch
- Existing data remains visible throughout — skeletons are NOT re-shown
- On success: all panels update in place, timestamp refreshes
- On failure: existing data stays, error toast shown for 4 seconds

**Stale data detection:**
- If `fetchedAt` is more than 10 minutes old: Header timestamp turns `var(--yellow)` with `⚠` prefix
- This indicates the 5-minute cache is serving old data (possible upstream outage)

**`'use client'` boundary:** `page.tsx` is a Client Component. It manages a single piece of state: `portfolioState: PortfolioState | null`. On mount, it fetches `/api/portfolio` and sets state. The refresh button triggers a re-fetch. All child components receive data as props — they are all Server Components or simple presentational client components with no own data fetching.

---

## Error Handling

| Failure | Behaviour |
|---------|-----------|
| CoinGecko API down | Affected price fields show `—` with ⚠ icon. Rest of dashboard renders. |
| CoinGecko 429 rate limit | Treat identically to API down — return null for affected fields, do not crash. 5-minute cache means this should never occur in normal use. |
| Yahoo Finance (MSTR) down | MSTR price shows `—`. MSTR trigger shows UNKNOWN status. |
| Fear & Greed API down | F&G trigger shows `—` / UNKNOWN. |
| KV read failure | Falls back to default holdings (Feb 2026 baseline). Banner shown: "Using default data — KV unavailable". |
| KV write failure | Error message shown in EditHoldingsPanel. Holdings not updated. |
| Wrong password on PUT | 401 response. "Incorrect password" shown inline in edit panel. |
| Rate limit exceeded on PUT | 429 response. "Too many attempts — try again in 15 minutes" shown inline. |
| `/api/portfolio` total failure | Full page error state with message and retry button. |

No failure should produce an unhandled exception or blank white screen.

---

## Exit Ladder Reference Data

Hardcoded in `ExitLadder.tsx` — these are Jay's actual exit rules, not calculated from prices.

| Asset | Tranche 1 | Tranche 2 | Tranche 3 | Sell Order |
|-------|-----------|-----------|-----------|------------|
| ONDO  | $1.35 (5x cost) | $2.00 (7.4x) | $3.00+ (11x) | 1st |
| UNI   | $18 (2.5x cost) | $28 (3.8x)   | $40+ (5.5x)  | 2nd |
| LINK  | $27 (3x cost)   | $40 (4.4x)   | $52+ (5.8x)  | 3rd |
| MSTR  | $600/share      | $900/share   | $1,200+      | 4th |

Tranche sizes: 25% / 35% / 40% of holdings at each trigger.

---

## 2030 Scenario Table

Hardcoded. Assumes 4.62 BTC total by 2030 (3.14 current + ~1.48 from DCA).

| Scenario | BTC Price | BTC Value | Est. Total | vs $1.5M Target |
|----------|-----------|-----------|------------|-----------------|
| Bear | $80k | $369k | ~$550k | -$950k |
| Conservative | $150k | $693k | ~$850k | -$650k |
| Base Case | $200k | $924k | ~$1.22M | -$280k |
| **Target** ★ | **$300k** | **$1.39M** | **~$1.88M** | **+$380k** |
| Bull Case | $500k | $2.31M | ~$3.0M+ | +$1.5M |

Target row highlighted in orange.

---

## Monthly Checklist

Hardcoded in `Checklist.tsx`. Eight standing questions reviewed each session.

```ts
const CHECKLIST = [
  { q: 'Has NEAR been rotated into BTC / ONDO / LINK?',             flag: 'HIGH PRIORITY' },
  { q: 'Is $2,000/month BTC DCA running consistently?',             flag: 'MONTHLY' },
  { q: 'Has ONDO buying started? (first tranche from NEAR proceeds)',flag: 'PENDING' },
  { q: 'Is LINK being built? (only 84.6 LINK held — needs ~$18k)', flag: 'MONTHLY' },
  { q: 'Has MSTR recovered to target levels? ($600 T1 / $900 T2 / $1200 T3)', flag: 'MONITOR' },
  { q: 'BlackRock / UniswapX UNI thesis — any new catalysts?',      flag: 'QUARTERLY' },
  { q: 'Is there dry powder ready for a BTC dip to $55-60k?',       flag: 'MONITOR' },
  { q: 'What to do with 0.37 ETH — sell and redeploy or dust?',     flag: 'DECIDE' },
]
```

Flag colours: HIGH PRIORITY → red, MONTHLY → orange, PENDING → yellow, MONITOR → muted, QUARTERLY → dim, DECIDE → yellow.

---

## Deployment

### Vercel setup — two projects, one repo

**Step 1:** Push repo to GitHub.

**Step 2:** In Vercel, create Project A (public demo):
- Import from GitHub
- Set `NEXT_PUBLIC_IS_DEMO=true`, `MODE=demo`
- No KV connection
- Custom domain: `portfolio-tracker.yourdomain.com` or leave as Vercel subdomain

**Step 3:** In Vercel, create Project B (private live):
- Import same GitHub repo
- Set `NEXT_PUBLIC_IS_DEMO=false`, `MODE=live`, `HOLDINGS_PASSWORD`, `PORTFOLIO_TARGET`, `FINNHUB_API_KEY`
- Go to Storage → Connect KV database (create new or use existing)
- Vercel auto-injects `KV_REST_API_URL` and `KV_REST_API_TOKEN`
- Enable **Password Protection** in Project Settings → Security (Vercel Pro) OR leave as unlisted URL (simpler)
- Do not link this URL anywhere public

**Step 4:** Both projects auto-deploy on every `git push` to main.

### Local development
```bash
# .env.local for local live mode
NEXT_PUBLIC_IS_DEMO=false
MODE=live
HOLDINGS_PASSWORD=localdev
PORTFOLIO_TARGET=1500000
FINNHUB_API_KEY=your_key_from_finnhub_io
KV_REST_API_URL=          # get from Vercel KV dashboard
KV_REST_API_TOKEN=        # get from Vercel KV dashboard

npm run dev
```

For local demo mode:
```bash
NEXT_PUBLIC_IS_DEMO=true
MODE=demo
# No other vars needed — demo is fully static
```

---

## Dependencies

```json
{
  "dependencies": {
    "next": "^15",
    "react": "^19",
    "react-dom": "^19",
    "@vercel/kv": "^3"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/node": "^20",
    "@types/react": "^19"
  }
}
```

No UI library. No auth library. No ORM. No scraper packages. `yahoo-finance2` is explicitly excluded — it fails silently on Vercel. MSTR price is fetched via Finnhub REST API using a free API key.

---

## Out of Scope — v1

Not in this build. Worth adding in v2:

- Historical portfolio value chart (line graph over time — needs KV snapshot history)
- Monthly snapshot save with timestamp log
- Email/Telegram alerts when triggers fire
- NUPL live API feed (no reliable free source currently exists)
- Mobile-optimised layout (desktop-first for now)
- Trade log recording

---

## Definition of Done

### Demo deployment
- [ ] Loads with synthetic data, no real values anywhere
- [ ] DEMO MODE badge visible and non-dismissable (`NEXT_PUBLIC_IS_DEMO=true`)
- [ ] EditHoldingsPanel absent from DOM entirely
- [ ] All panels render correctly with correct layout (60/40 splits as specced)
- [ ] No KV connection, no external API calls, fully static
- [ ] No `FINNHUB_API_KEY` or `HOLDINGS_PASSWORD` env vars set
- [ ] Checklist checkboxes work via React state only (no KV)

### Live deployment
- [ ] All prices auto-fetch on load via Finnhub (MSTR), CoinGecko (crypto), Alternative.me (F&G)
- [ ] Holdings read from Vercel KV on load
- [ ] EditHoldingsPanel visible, all fields pre-populated from KV, password retained in session state
- [ ] Password-protected PUT updates KV and refreshes dashboard
- [ ] Wrong password returns 401 with inline error
- [ ] `updatedAt` timestamp shown after successful save in `Last saved: DD Mon YYYY at HH:MM:SS` format
- [ ] Checklist resets automatically on successful holdings save
- [ ] Checklist state persists in KV between sessions
- [ ] No `cost`, `totalCost`, or raw cost basis anywhere in API responses
- [ ] Trigger states all calculate and display correctly
- [ ] `pricesPartial` banner shown when any price source returns null
- [ ] Allocation bars show current vs target with overweight/underweight labels
- [ ] Exit ladder shows distance-to-target % for each tranche, `✓ HIT` for passed targets
- [ ] Proceeds split shows current BTC zone prominently + full reference table
- [ ] Phase indicator shows correct active/completed/future states
- [ ] 2030 scenario table renders with target row highlighted
- [ ] Monthly checklist renders with flag badges and functional checkboxes

### Both deployments
- [ ] `export const runtime = 'nodejs'` present in all API route files
- [ ] No internal route-to-route HTTP calls — `fetchPrices()` imported directly
- [ ] `next: { revalidate: 300 }` on all four fetch calls in prices route
- [ ] `lib/formatters.ts` used for all number display — no inline formatting
- [ ] All null prices render as `—` with `⚠` icon, no crashes
- [ ] No unhandled exceptions on API failure — graceful fallback for every data source
- [ ] Skeleton loaders on initial page load (all panels simultaneously, per-panel heights as specced)
- [ ] Skeletons NOT re-shown on manual refresh — existing data stays visible during re-fetch
- [ ] Refresh button shows spin animation during fetch, returns to idle on completion
- [ ] `fetchedAt` timestamp turns yellow with `⚠` if more than 10 minutes old
- [ ] Google Fonts load correctly — CSP headers in `next.config.ts` allow `fonts.googleapis.com` and `fonts.gstatic.com`
- [ ] Design renders correctly if Google Fonts fail — fallback font stack in CSS variables
- [ ] `poweredByHeader: false` in `next.config.ts`
- [ ] `.env.local` and `.env*.local` in `.gitignore`, no secrets in repo
- [ ] Deploys cleanly on `git push` to main
- [ ] Layout matches spec — 60/40 grid splits, correct panel order, 768px breakpoint stacks to single column

### Live deployment (additional)
- [ ] PUT `/api/holdings` rate limited to 5 attempts per IP per 15 minutes via Vercel KV
- [ ] 429 response with clear message shown inline in edit panel
- [ ] Rate limit key uses `ratelimit:${ip}` pattern with 900s TTL in KV

---

## Notes for Claude Code

- **Demo mode is fully static — zero API calls.** When `process.env.MODE === 'demo'`, the `/api/portfolio` route returns `DEMO_PORTFOLIO_STATE` from `lib/demo-data.ts` directly. No CoinGecko, no Finnhub, no Alternative.me, no KV reads. The demo deployment requires no external service access and no KV connection.
- **Never use `NEXT_PUBLIC_MODE`.** Mode is split into two variables: `MODE` (server-only, no `NEXT_PUBLIC_` prefix) for all API route logic, and `NEXT_PUBLIC_IS_DEMO` (client-safe) used only in `DemoBadge.tsx`.
- **Do not use `yahoo-finance2`.** Use Finnhub REST API (`https://finnhub.io/api/v1/quote?symbol=MSTR&token=...`) with `FINNHUB_API_KEY` env var instead.
- **Add `export const runtime = 'nodejs'`** to the top of every API route file.
- **Do not make internal HTTP calls between routes.** Export `fetchPrices()` as a named function from `app/api/prices/route.ts` and import it directly in `app/api/portfolio/route.ts`.
- **Apply `next: { revalidate: 300 }` to every fetch call** in the prices route — all four sources individually.
- **Rate limiting must use Vercel KV**, not in-memory Maps.
- **`Position` has nullable `value`, `pnl`, `pnlPct`, `allocPct` fields.** When a price is null, that position's value fields are all null. Excluded from `totalValue`. The `priceUnavailable` flag signals the UI to show `—` + `⚠`.
- **`lib/formatters.ts` must be used for every number displayed in the UI.** No inline `.toFixed()`, `toLocaleString()`, or string concatenation in components. All formatting goes through the formatter functions which return `'—'` for null inputs.
- **`page.tsx` is a Client Component** that owns a single `portfolioState` state variable. On manual refresh, it re-fetches and updates state — it does NOT unmount/remount components or re-show skeletons.
- **Checklist state lives in KV** under key `'checklist'`. It resets automatically when `PUT /api/holdings` succeeds. In demo mode, checklist state is local React state only.
- **ExitLadder must show live prices.** For each tranche target, calculate and display the percentage distance from current price. Use `formatPct()`. Show `✓ HIT` in green if current price ≥ target.
- **Build mobile layout last** — desktop first, single column below `768px`.
- Use `'use client'` only on components that need it (`EditHoldingsPanel`, `Checklist`, `Header` refresh button, `page.tsx`).
- All calculation logic lives in `lib/calculations.ts` as pure functions.
- **Ensure `.env.local` and `.env*.local` are in `.gitignore` before first commit.**
- Password comparison (`submittedPassword === process.env.HOLDINGS_PASSWORD`) is plain text by design — do not add bcrypt or any hashing library.
- `next.config.ts` must be implemented as specified — the CSP headers are required for Google Fonts.
