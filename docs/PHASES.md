# Build Phases

## Status legend
- ✅ Complete — committed and pushed
- 🔲 Pending

---

## ✅ Phase 1 — Scaffolding
`create-next-app`, folder structure, `next.config.ts` (CSP + security headers), `globals.css` (full design system), Vitest configured, smoke tests passing.

**Commit:** `Phase 1: Scaffolding — Next.js, design system, Vitest`

---

## ✅ Phase 2 — Core library (pure functions)
`lib/types.ts`, `lib/formatters.ts`, `lib/calculations.ts`. No Next.js, no APIs, no side effects. 82 tests passing.

**Commit:** `Phase 2: Core library — types, formatters, calculations`

---

## 🔲 Phase 3 — Data layer
`lib/kv.ts` — KV read/write helpers, `toClientHoldings()` (strips cost basis), checklist helpers, `DEFAULT_HOLDINGS`.
`lib/demo-data.ts` — complete static `PortfolioState` for demo mode (synthetic, plausible data).

**Tests:** unit tests for `toClientHoldings` (verify cost basis is stripped), `getHoldings`/`setHoldings` with mocked KV, validate demo data shape matches `PortfolioState` type.

---

## 🔲 Phase 4 — API routes
All four routes:
- `app/api/prices/route.ts` — fetches CoinGecko, Finnhub, Alternative.me. Exports `fetchPrices()` for direct import.
- `app/api/portfolio/route.ts` — imports `fetchPrices()` directly (no internal HTTP), returns full `PortfolioState`. Demo mode returns static data.
- `app/api/holdings/route.ts` — GET returns `ClientHoldings`, PUT validates + rate-limits via KV + writes.
- `app/api/checklist/route.ts` — GET + PUT, live mode only.

Every route file must have `export const runtime = 'nodejs'` at the top.

**Tests:** integration tests using Next.js route handlers — response shape, status codes (200/400/401/403/429), error handling, demo vs live mode branching.

---

## 🔲 Phase 5 — Shell UI
`app/layout.tsx` (fonts, metadata), `app/page.tsx` (Client Component — owns `portfolioState` state, fetch on mount + manual refresh, skeleton loaders), `components/DemoBadge.tsx`, `components/Header.tsx`.

Key rules:
- Skeleton loaders shown on initial load only — never re-shown on refresh
- `page.tsx` manages a single state: `portfolioState: PortfolioState | null`
- All child components receive data as props, no own data fetching

**Tests:** render tests for DemoBadge (visible when `NEXT_PUBLIC_IS_DEMO=true`, absent otherwise), Header (timestamp formatting, stale detection >10 min).

---

## 🔲 Phase 6 — Top panels
`components/StatBar.tsx`, `components/ProgressBar.tsx`, `components/PhaseIndicator.tsx`.

StatBar: 4 cards — Total Value, vs Target, BTC Price, Fear & Greed (colour-coded by value).
ProgressBar: orange filled bar, centre label with current value + %, gap-to-target text.
PhaseIndicator: 4 segments, active/completed/future states driven by `prices.btc`.

**Tests:** render tests for each component with normal data, null prices, and edge values (progress > 100%, stale data).

---

## 🔲 Phase 7 — Middle panels
`components/PositionsTable.tsx`, `components/AllocationBars.tsx`. The 60/40 grid.

PositionsTable: sortable by value desc, P&L colouring, `—` + ⚠ for unavailable prices.
AllocationBars: horizontal bars with target tick, OW/UW labels, asset colours from CSS vars (except per-asset hex values).

**Tests:** render tests for each row state (normal, priceUnavailable, zero quantity).

---

## 🔲 Phase 8 — Bottom panels
`components/TriggerMonitor.tsx`, `components/ExitLadder.tsx` (includes ProceedsSplit sub-section), `components/ScenarioTable.tsx`.

TriggerMonitor: 4 cards, severity-driven styling (watch/near/fired/warn).
ExitLadder: tranche table with live distance-to-target %, `✓ HIT` in green, ProceedsSplit below.
ScenarioTable: hardcoded 5 rows, target row highlighted orange.

**Tests:** render tests per severity state, `✓ HIT` condition, zone highlighting.

---

## 🔲 Phase 9 — Interactive panels
`components/Checklist.tsx`, `components/EditHoldingsPanel.tsx`.

Checklist: 8 items, KV-persisted state (live) or React state (demo), resets on holdings save.
EditHoldingsPanel: collapsible, pre-populated from KV, password retained in session state, absent from DOM in demo mode entirely.

**Tests:** checkbox interaction, password retained after save, panel absent in demo mode.

---

## 🔲 Phase 10 — Error states + polish
Partial price warning banner (below StatBar when `pricesPartial = true`), stale data detection (`fetchedAt` > 10 min → yellow + ⚠), error toast on refresh failure (4 seconds), KV fallback banner.

**Tests:** banner renders when `pricesPartial = true`, stale timestamp detection, toast timeout.

---

## 🔲 Phase 11 — Mobile layout
Single-column stacking below 768px. Desktop-first — this is last.
Verify all panels render correctly at narrow widths. No new components — CSS only.

**Tests:** visual checks / responsive breakpoint tests if needed.

---

## Workflow for each phase

1. Write the code
2. Write the tests
3. `npm test` — fix until green
4. Update `docs/IMPLEMENTATION.md` with decisions + patterns
5. Commit only when green

## Key constraints (see CLAUDE.md for full list)
- `export const runtime = 'nodejs'` in every API route
- Never `fetch('/api/prices')` from another route — import `fetchPrices()` directly
- `next: { revalidate: 300 }` on every individual fetch call in the prices route
- Rate limiting via Vercel KV, never in-memory
- All number formatting via `lib/formatters.ts`
- Cost basis never sent to client — stripped in `toClientHoldings()`
- Demo mode: zero external calls, zero KV reads, fully static
- `EditHoldingsPanel` absent from DOM in demo mode (not hidden with CSS)
