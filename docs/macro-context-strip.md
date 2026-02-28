# Macro Context Strip

## What you're building

A slim, read-only panel displaying four macro indicators fetched daily
from Finnhub and FRED. Sits directly above the existing Trigger Monitor.
No triggers, no actions — ambient context only.

**Data sources:** Finnhub (DXY, Fed Funds Rate, CPI) · FRED (M2)
**Update frequency:** Once daily via Vercel cron
**Stack:** Next.js · Vercel Redis KV · Vercel Cron

---

## Target UI

```
MACRO CONTEXT                              Updated 6h ago

DXY          104.2     ↑ Strengthening    [ BEARISH ]
M2            +2.1%    ↑ Expanding        [ BULLISH ]
Fed Rate      5.25%    → Holding          [ NEUTRAL ]
CPI            3.1%    ↓ Cooling          [ BULLISH ]
```

- Four rows, one per indicator
- Columns: Label · Raw value · Trend arrow + direction word · Bias badge
- Bias badge colours: BULLISH = green · BEARISH = red · NEUTRAL = grey
- "Updated X ago" timestamp in top right using cached fetch time
- Matches existing Trigger Monitor visual style exactly

---

## Phase 1 — Data fetching

### Finnhub indicators

**DXY (US Dollar Index)**
```
GET https://finnhub.io/api/v1/forex/rates?base=USD&token={FINNHUB_TOKEN}
```
Derive DXY from a basket of USD pairs (EUR, JPY, GBP, CAD, SEK, CHF).
Weights: EUR 57.6%, JPY 13.6%, GBP 11.9%, CAD 9.1%, SEK 4.2%, CHF 3.6%.
Formula: `DXY = 50.14348112 × EURUSD^-0.576 × USDJPY^0.136 × GBPUSD^-0.119 × USDCAD^0.091 × USDSEK^0.042 × USDCHF^0.036`

**Federal Funds Rate**
```
GET https://finnhub.io/api/v1/economic/data?code=FEDERALFUNDSRATE&token={FINNHUB_TOKEN}
```

**CPI**
```
GET https://finnhub.io/api/v1/economic/data?code=USCPI&token={FINNHUB_TOKEN}
```

For both Fed Rate and CPI: take the two most recent data points to derive trend direction.

### FRED — M2 Money Supply

```
GET https://api.stlouisfed.org/fred/series/observations
  ?series_id=M2SL
  &sort_order=desc
  &limit=2
  &api_key={FRED_API_KEY}
  &file_type=json
```

Take the two most recent observations. Calculate month-over-month % change.
FRED API key is free — register at fred.stlouisfed.org.

---

## Phase 2 — Bias scoring

Pure function, no side effects. Lives in `lib/macro.ts`.

```ts
type Trend = 'rising' | 'falling' | 'flat'
type Bias = 'bullish' | 'bearish' | 'neutral'

type MacroIndicator = {
  label: string
  value: number
  displayValue: string   // formatted for UI e.g. "104.2" or "+2.1%"
  trend: Trend
  trendLabel: string     // e.g. "Strengthening", "Expanding", "Cooling"
  bias: Bias
}

type MacroContext = {
  indicators: MacroIndicator[]
  fetchedAt: number      // Unix ms
}
```

**Bias rules:**

| Indicator | Condition | Bias |
|---|---|---|
| DXY | Rising | Bearish |
| DXY | Falling | Bullish |
| DXY | Flat (< 0.2% change) | Neutral |
| M2 | Expanding (positive MoM) | Bullish |
| M2 | Contracting (negative MoM) | Bearish |
| M2 | Flat (< 0.1% change) | Neutral |
| Fed Rate | Falling (cut) | Bullish |
| Fed Rate | Rising (hike) | Bearish |
| Fed Rate | Flat | Neutral |
| CPI | Falling | Bullish |
| CPI | Rising above 3% | Bearish |
| CPI | Rising but below 3% | Neutral |

**Trend labels by indicator:**

| Indicator | Rising label | Falling label | Flat label |
|---|---|---|---|
| DXY | Strengthening | Weakening | Stable |
| M2 | Expanding | Contracting | Flat |
| Fed Rate | Hiking | Cutting | Holding |
| CPI | Rising | Cooling | Stable |

---

## Phase 3 — Cron job & caching

### Vercel cron — `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/macro/refresh",
      "schedule": "0 6 * * *"
    }
  ]
}
```

Runs at 06:00 UTC daily.

### `app/api/macro/refresh/route.ts`

Handler (POST, called by cron):
1. Fetch DXY forex rates from Finnhub
2. Fetch Fed Rate from Finnhub
3. Fetch CPI from Finnhub
4. Fetch M2 from FRED
5. Call `scoreMacro(rawData)` to produce `MacroContext`
6. Write to Redis: `kv.set('macro:context', JSON.stringify(context))`
7. Return `{ ok: true }`

Protect with `CRON_SECRET` header check — Vercel passes this automatically.

### `app/api/macro/route.ts`

GET handler — read from Redis cache:
1. `const cached = await kv.get('macro:context')`
2. If null: trigger a fresh fetch and return result
3. If stale (> 25 hours): return cached data but trigger background refresh
4. Return cached `MacroContext`

Redis key: `macro:context`

---

## Phase 4 — UI component

### `components/MacroContextStrip.tsx`

Fetch from `GET /api/macro` on mount. Show skeleton while loading.

**Layout:**
- Section header: "MACRO CONTEXT" left-aligned, timestamp right-aligned
- Four rows in a table matching the Trigger Monitor's row structure
- Columns: indicator name · value · trend arrow + label · bias badge

**Trend arrows:**
- Rising: ↑ (use existing up arrow from positions table)
- Falling: ↓
- Flat: →

**Bias badge colours — use exact colours from existing dashboard:**
- BULLISH: same green as positive P&L
- BEARISH: same red as negative P&L
- NEUTRAL: muted grey

**Timestamp:**
```ts
const age = Date.now() - context.fetchedAt
const label = age < 3600000 ? 'Updated just now'
            : `Updated ${Math.floor(age / 3600000)}h ago`
```

### Placement

Add `<MacroContextStrip />` directly above `<TriggerMonitor />` in the
dashboard layout. No other layout changes.

---

## Environment variables to add

```
FINNHUB_TOKEN=        # existing or new Finnhub API key
FRED_API_KEY=         # free from fred.stlouisfed.org
CRON_SECRET=          # auto-set by Vercel, no action needed
```

---

## Implementation order

1. `lib/macro.ts` — types + bias scoring function
2. `app/api/macro/refresh/route.ts` — cron handler + all fetches
3. `app/api/macro/route.ts` — cache read endpoint
4. Add cron to `vercel.json`
5. Register for FRED API key, add both env vars to Vercel dashboard
6. Test cron manually: `POST /api/macro/refresh`
7. `components/MacroContextStrip.tsx`
8. Add to dashboard layout above TriggerMonitor

---

## Constraints

- Read-only — no user interaction, no triggers, no actions
- Do not modify TriggerMonitor or any existing components
- Do not add new npm dependencies — use native fetch
- Match existing visual style exactly — no new colours or fonts
- If any single fetch fails, return partial data for the other indicators
  rather than failing the entire panel
