# Jay's Portfolio Tracker — CLAUDE.md

## Learning Context

This is a learning project. Jay is building engineering skills alongside building the app. When implementing anything non-trivial:

1. **Explain the engineering decision** — not just what, but why this approach over alternatives.
2. **Name the pattern or principle** — e.g. "this is the separation of concerns principle", "this is why pure functions are testable", "this is what a security boundary means".
3. **Flag trade-offs** — if a decision has costs (complexity, limitations), say so.
4. **Teach when something is unusual** — if a constraint in this project differs from common practice (e.g. plain-text password), explain why it's acceptable here.

Do not silently write code. Narrate the reasoning.

## Testing and Commit Rules

Every phase ends with tests. The commit only happens if all tests pass.

**Test workflow per phase:**
1. Write the phase's code
2. Write tests covering the phase's logic
3. Run the tests — `npm test`
4. Fix any failures before committing
5. Commit only when the test suite is green

**What to test per phase:**
- **Pure logic (calculations, formatters):** Unit tests for every function — happy path, edge cases, null inputs
- **API routes:** Integration tests using Next.js test utilities — test response shape, status codes, error handling
- **Components:** Rendering tests — correct output for given props, null/unavailable price states, demo vs live mode differences

**Test framework:** Vitest — lighter than Jest, native TypeScript support, compatible with Next.js App Router. Install in Phase 1 scaffolding.

**Never commit a failing test.** If a test is genuinely wrong (testing the wrong thing), fix the test and explain why before committing.

After each phase, update `docs/IMPLEMENTATION.md` with:
- What was built in this phase
- Key engineering decisions made and why
- Any patterns or principles that came up in practice
- Anything that differed from the plan and why

This keeps the learning record current and makes the commit history meaningful beyond just the code.

---

## Project Overview

A Next.js 15 / React 19 crypto portfolio dashboard. One GitHub repo, two Vercel deployments:

- **Live** — real holdings, live prices, Vercel KV persistence, password-protected writes
- **Demo** — fully static synthetic data, no external calls, no KV, for public portfolio showcase

## Stack

- Next.js 15 (App Router), React 19, TypeScript 5
- `@vercel/kv` for persistence — no ORM, no database library
- Custom CSS only — no Tailwind, no UI library
- Finnhub REST API (MSTR price), CoinGecko free API (crypto), Alternative.me (Fear & Greed)

---

## Critical Invariants — Never Break These

### Security boundaries
- **Never send cost basis to the client.** `AssetHolding.costBasis` is server-side only. `toClientHoldings()` in `lib/kv.ts` strips it before any response. No `cost`, `totalCost`, or raw cost basis field may appear in `/api/portfolio` or `/api/holdings` responses.
- **Never expose `HOLDINGS_PASSWORD`, `FINNHUB_API_KEY`, or `KV_*` vars to the client.** None of these have the `NEXT_PUBLIC_` prefix.
- **Password comparison is intentionally plain text** (`submittedPassword === process.env.HOLDINGS_PASSWORD`). Do not add bcrypt or hashing — it's a personal project accessed by one person.

### Environment variable split
- `MODE` — server-only. Used in API routes to branch demo/live logic. Never `NEXT_PUBLIC_MODE`.
- `NEXT_PUBLIC_IS_DEMO` — client-safe. Used **only** in `DemoBadge.tsx`. No other component reads it.

### No internal HTTP calls between routes
- **Never `fetch('/api/prices')` from another route.** Export `fetchPrices()` as a named function from `app/api/prices/route.ts` and import it directly in `app/api/portfolio/route.ts`. Internal route-to-route HTTP calls are unreliable in Vercel's serverless environment.

### Node.js runtime declaration
- **`export const runtime = 'nodejs'`** must be at the top of every API route file. Required for outbound HTTP calls and KV access — the default Edge runtime does not support these reliably.

### Per-fetch caching
- **Apply `next: { revalidate: 300 }` to every `fetch()` call individually** in the prices route — all four sources (CoinGecko prices, CoinGecko global, Finnhub, Alternative.me). Do not apply it at the route handler level.

### Rate limiting via KV, not memory
- **Never use an in-memory Map for rate limiting.** Vercel serverless functions are stateless — memory resets on every cold start. Use KV with key `ratelimit:${ip}` and TTL of 900 seconds.

### All formatting via formatters.ts
- **Never format numbers inline in components.** No `.toFixed()`, `.toLocaleString()`, or string interpolation for display values. Everything goes through `lib/formatters.ts`, which returns `'—'` for null inputs.

### Null price handling
- When a price is `null`: the position's `value`, `pnl`, `pnlPct`, `allocPct` are all `null` and `priceUnavailable = true`. That position is excluded from `totalValue`. The UI shows `—` with a `⚠` icon. Never throw or crash on a null price.

### Demo mode is fully static
- When `process.env.MODE === 'demo'`, `/api/portfolio` returns `DEMO_PORTFOLIO_STATE` from `lib/demo-data.ts` — zero external API calls, zero KV reads.
- `EditHoldingsPanel` must be **absent from the DOM** in demo mode — not hidden with CSS, not rendered at all.

---

## File Map

| File | Role |
|------|------|
| `lib/types.ts` | All TypeScript interfaces. Single source of truth for data shapes. |
| `lib/calculations.ts` | Pure functions only — no side effects, no imports from outside lib/. |
| `lib/formatters.ts` | All number/currency/percentage display formatting. |
| `lib/kv.ts` | KV read/write helpers. `toClientHoldings()` strips cost basis here. |
| `lib/demo-data.ts` | Complete static `PortfolioState` for demo mode. |
| `app/api/prices/route.ts` | Fetches all market data. Also exports `fetchPrices()` for direct import. |
| `app/api/portfolio/route.ts` | Combines prices + holdings, runs calculations, returns `PortfolioState`. |
| `app/api/holdings/route.ts` | GET returns `ClientHoldings`. PUT validates, rate-limits, writes to KV. |
| `app/api/checklist/route.ts` | GET + PUT for checklist state. Live mode only. |
| `app/page.tsx` | Client Component. Owns `portfolioState` state. Single fetch on mount + manual refresh. |
| `app/globals.css` | Design system — all CSS variables. |
| `next.config.ts` | CSP + security headers, `poweredByHeader: false`. |

---

## Calculation Rules (`lib/calculations.ts`)

All functions are pure — same input always produces same output, no external calls.

Key functions:
- `buildPositions(holdings, prices)` → `Position[]` with nullable value fields
- `buildAllocations(positions, totalValue)` → current vs target per asset
- `calcAllTriggers(prices, nupl)` → all four `TriggerState[]`
- `calcProceedsSplit(btcPrice)` → current BTC zone and split percentages

Target allocations hardcoded here: BTC 60%, MSTR 15%, ONDO 7%, LINK 7%, UNI 7%, Dry 4%.

---

## UI Rules

- **`page.tsx` is a Client Component** with one state variable: `portfolioState: PortfolioState | null`.
- **Skeletons on initial load only.** On manual refresh, existing data stays visible — never re-show skeletons during a refresh fetch.
- **`'use client'` only where needed:** `page.tsx`, `EditHoldingsPanel`, `Checklist`, `Header` (refresh button interaction).
- All other components are presentational — they receive data as props, no own data fetching.

---

## Design System

All colours via CSS variables in `globals.css` — never hardcode hex values in components (exception: per-asset colours in `AllocationBars.tsx`).

Core variables: `--bg`, `--surface`, `--surface2`, `--border`, `--orange`, `--green`, `--red`, `--yellow`, `--text`, `--text-muted`, `--text-dim`, `--mono`, `--sans`.

---

## Do Not Use

- `yahoo-finance2` — fails silently on Vercel. MSTR comes from Finnhub REST API.
- Tailwind, any UI component library, any auth library, any ORM.
- `NEXT_PUBLIC_MODE` — this variable does not exist in this project.
- Internal `fetch()` calls between API routes.

---

## Deployment Notes

`.env.local` and `.env*.local` must be in `.gitignore` before the first commit. Never commit secrets.

Two Vercel projects, one repo. Only the live project gets a KV database. Both auto-deploy on `git push` to main.
