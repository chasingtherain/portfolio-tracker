# Decision Journal & Strategy Adherence Score

## What you're building

A feature that logs every holdings change with a full market snapshot, scores it against the user's existing strategy rules, and surfaces a Strategy Adherence Score in the dashboard KPI bar.

**Stack:** Next.js · Vercel Redis KV
**Constraint:** Purely additive. Do not modify any existing files except for the one integration point noted in Phase 2.

---

## Phase 1 — Data layer

### `lib/decisions.ts`

Redis helpers. Use `@vercel/kv` for all operations.

```ts
const DECISIONS_KEY = 'decisions'
const SCORE_CACHE_KEY = 'decisions:score'
const SCORE_CACHE_TTL = 60 // seconds

// Write a new entry (score by timestamp for sorted set)
export async function writeDecision(entry: DecisionEntry): Promise<void>

// Read entries, newest first. Optional filters: asset, alignment, from/to timestamps
export async function readDecisions(opts?: {
  asset?: string
  alignment?: Alignment
  from?: number
  to?: number
  limit?: number
  offset?: number
}): Promise<DecisionEntry[]>

// Read cached score or return null if stale
export async function readCachedScore(): Promise<ScoreBreakdown | null>

// Write score to cache with TTL
export async function writeCachedScore(score: ScoreBreakdown): Promise<void>
```

Redis key: `ZADD decisions <timestamp_ms> <JSON.stringify(entry)>`

---

### `lib/alignment.ts`

Pure function. No side effects. No imports from the rest of the app.

```ts
export type Alignment = 'aligned' | 'misaligned' | 'neutral'

export type AlignmentResult = {
  alignment: Alignment
  reason: string
}

export function scoreAlignment(
  action: 'buy' | 'sell' | 'rebalance',
  snapshot: MarketSnapshot
): AlignmentResult
```

**Rules to implement (v1):**

| Condition | Result | Reason string |
|---|---|---|
| action=buy AND positionStage=exit | misaligned | "Bought during Exit stage" |
| action=buy AND positionStage=distribute | misaligned | "Bought during Distribute stage" |
| action=sell AND activeTriggers includes 'exit-ladder' | aligned | "Sold on Exit Ladder trigger" |
| action=buy AND fearGreed < 25 | aligned | "Bought in Extreme Fear" |
| action=sell AND fearGreed > 75 | aligned | "Sold in Extreme Greed" |
| action=rebalance | neutral | "Rebalances are always neutral" |
| no rule matched | neutral | "No applicable rule matched" |

Rules are evaluated top to bottom. First match wins.

Write unit tests for this function in `lib/alignment.test.ts`. Cover every rule plus edge cases (boundary values, empty activeTriggers array).

---

### `lib/score.ts`

```ts
export type ScoreBreakdown = {
  overall: number           // 0-100
  byStage: Record<string, number>
  byFearGreedZone: {
    fear: number            // fearGreed < 25
    greed: number           // fearGreed > 75
    neutral: number         // 25-75
  }
  totalDecisions: number
  alignedCount: number
  misalignedCount: number
}

export function calculateScore(entries: DecisionEntry[]): ScoreBreakdown
```

**Score formula:** Linear recency-weighted average. Neutral decisions excluded.

```ts
const scoreable = entries.filter(e => e.alignment !== 'neutral')
if (scoreable.length === 0) return 100

scoreable.forEach((entry, i) => {
  const weight = (i + 1) / scoreable.length  // higher index = more recent = higher weight
  const value = entry.alignment === 'aligned' ? 1 : 0
  weightedSum += value * weight
  totalWeight += weight
})

return Math.round((weightedSum / totalWeight) * 100)
```

---

### Types file: `lib/decisions.types.ts`

```ts
export type Alignment = 'aligned' | 'misaligned' | 'neutral'

export type MarketSnapshot = {
  btcPrice: number
  fearGreed: number          // 0-100
  btcDominance: number       // percentage
  nupl: number
  btcPriceZone: string
  positionStage: 'accumulate' | 'distribute' | 'reduce' | 'exit'
  activeTriggers: string[]
}

export type DecisionEntry = {
  id: string                 // nanoid()
  timestamp: number          // Unix ms
  asset: string
  action: 'buy' | 'sell' | 'rebalance'
  amountBefore: number       // USD value
  amountAfter: number        // USD value
  snapshot: MarketSnapshot
  alignment: Alignment
  alignmentReason: string
  notes?: string
}
```

---

## Phase 2 — API routes

### `app/api/decisions/route.ts`

**POST** — Create a new decision entry.

Request body:
```ts
{
  asset: string
  action: 'buy' | 'sell' | 'rebalance'
  amountBefore: number
  amountAfter: number
  notes?: string
}
```

Handler must:
1. Fetch current market snapshot from the same data sources the dashboard already uses
2. Call `scoreAlignment(action, snapshot)`
3. Assemble a `DecisionEntry` with `id: nanoid()` and `timestamp: Date.now()`
4. Call `writeDecision(entry)`
5. Invalidate the score cache (`kv.del(SCORE_CACHE_KEY)`)
6. Return the saved entry

**GET** — Fetch timeline.

Query params: `asset`, `alignment`, `from`, `to`, `limit` (default 20), `offset` (default 0)

Return: `{ entries: DecisionEntry[], total: number }`

---

### `app/api/decisions/score/route.ts`

**GET** — Return adherence score.

1. Check `readCachedScore()` — if not null, return it
2. Fetch all entries via `readDecisions()`
3. Call `calculateScore(entries)`
4. Write to cache via `writeCachedScore(breakdown)`
5. Return breakdown

---

### `app/api/decisions/[id]/route.ts`

**PATCH** — Update notes only.

```ts
{ notes: string }
```

Fetch the entry from Redis, update only the `notes` field, write back. Return updated entry.

---

## Phase 3 — UI components

### `components/AdherenceScoreCard.tsx`

A KPI card matching the existing style of the top bar cards.

Displays:
- Label: "Adherence"
- Value: `{score}%` — large, coloured by threshold:
  - 90–100: green (same green used for positive P&L)
  - 70–89: amber
  - < 70: red
- On hover: tooltip showing `alignedCount / totalDecisions` and top misalignment reason

Fetch from `GET /api/decisions/score` on mount. Show a skeleton while loading.

Add this card to the existing top KPI bar, after the Fear & Greed card.

---

### `components/DecisionTimeline.tsx`

A vertical list of decision cards rendered below the existing dashboard sections.

Each card shows:
- Relative timestamp (e.g. "3 days ago") — absolute on hover
- Action badge: BUY (green) / SELL (red) / REBALANCE (grey)
- Asset + delta: e.g. `BTC  +$12,400`
- Alignment badge: ALIGNED / MISALIGNED / NEUTRAL
- Alignment reason text
- Expandable market snapshot section (collapsed by default, toggle on click)
- Notes field — editable inline, `PATCH /api/decisions/:id` on blur

Filters bar above the list:
- Asset dropdown
- Alignment filter: All / Aligned / Misaligned / Neutral
- Date range picker (or simple: Last 30d / 90d / All)

Pagination: 20 per page, simple prev/next.

Fetch from `GET /api/decisions` with filter params. Refetch on filter change.

---

## Integration point — existing code

Find the Edit Holdings form submit handler (wherever `holdings` state is saved to Redis).

After the save succeeds, add:

```ts
await fetch('/api/decisions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    asset,
    action,       // derive from whether amountAfter > amountBefore
    amountBefore,
    amountAfter
  })
})
```

This is the only change to existing code. Everything else is new files.

---

## Implementation order

1. `lib/decisions.types.ts`
2. `lib/alignment.ts` + `lib/alignment.test.ts`
3. `lib/score.ts`
4. `lib/decisions.ts`
5. `app/api/decisions/route.ts`
6. `app/api/decisions/score/route.ts`
7. `app/api/decisions/[id]/route.ts`
8. Integration point in Edit Holdings form
9. `components/AdherenceScoreCard.tsx` + add to KPI bar
10. `components/DecisionTimeline.tsx` + add to dashboard

Run `lib/alignment.test.ts` after step 2 before continuing.

---

## Open questions to resolve before building

- **Where is the market snapshot data fetched from?** Find the existing fetch calls for BTC price, Fear & Greed, NUPL, BTC dominance and reuse those exact sources in the POST handler.
- **What are the existing trigger IDs?** The alignment rules reference `activeTriggers` strings — match the exact IDs already used in the trigger monitor.
- **What is the exact positionStage field name and values** in the current state/Redis schema?
