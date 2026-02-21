# Implementation Notes

---

## Phase 6 — Top panels

### What was built
- `components/StatBar.tsx` — 4 stat cards: TOTAL VALUE, VS TARGET, BTC, FEAR & GREED. Fear & Greed is colour-coded by value (green/yellow/orange/red) with a `data-severity` attribute for test assertions. Gap display adds an explicit `+` prefix for values above target.
- `components/ProgressBar.tsx` — orange fill bar capped at 100% display width, showing totalValue, target, progressPct, and gap-to-target with sign.
- `components/PhaseIndicator.tsx` — 4 BTC price zone segments (ACCUMULATE / DISTRIBUTE / REDUCE / EXIT). Derives the active zone via `calcProceedsSplit`, assigning each segment a `data-state` of `completed`, `active`, `future`, or `unknown` (when price is null).
- `app/page.tsx` — wired all three components into the portfolio state render path; they receive their props from `portfolioState` directly.
- `tests/top-panels.test.tsx` — 40 tests covering all three components: normal data, null prices, edge values (progress > 100%, gap sign, F&G at each severity boundary, BTC zone boundaries, all segments unknown when null).

263/263 tests passing.

### Engineering decisions

**Why PhaseIndicator derives zone from `calcProceedsSplit` rather than duplicating thresholds**
PhaseIndicator needs to know which BTC price zone is currently active. The zone boundaries are already defined in `calcProceedsSplit` in `calculations.ts`. Duplicating those thresholds in the component would violate the single-source-of-truth principle — if the boundaries changed, both places would need updating and could drift. Instead, `calcProceedsSplit(btcPrice).zone` is called and the result is matched against the `ZONES` array. The component can't have stale boundaries.

**Why the bar fill is capped in the component as well as in `calcProgressToTarget`**
`calcProgressToTarget` caps progress at 100 by design. The component also applies `Math.min(progressPct, 100)` defensively in case callers ever pass raw uncapped values (e.g. during testing or if the source changes). This is belt-and-suspenders: the component is correct regardless of where its props come from. The label still shows the real percentage so the user can see they've exceeded the target.

**Why `data-severity` is a separate attribute instead of relying on colour**
Tests that check "the fear & greed indicator is in the 'fired' state" shouldn't have to know what colour `var(--red)` resolves to in jsdom — CSS custom properties aren't computed in a test environment anyway. `data-severity` is a plain string attribute that's easy to assert. This is a general pattern: use `data-*` attributes to expose component state for testing, and let CSS react to those attributes (or use them independently). The component and test agree on the contract without needing to inspect styles.

**Why Fear & Greed thresholds in StatBar match `evalFearGreed` in calculations.ts**
The stat bar colours the index with the same thresholds as the trigger evaluator (≥80=fired, ≥65=near, ≥50=caution, else watch). If they diverged, the stat bar might show orange while the trigger monitor shows green — a confusing inconsistency. The comment in `StatBar.tsx` calls this out explicitly. This is the dependency-at-a-distance problem: two separate places implement the same rule, and if one is updated without the other, they silently disagree. In a larger codebase the fix would be to export the thresholds as a constant; here, the comment is sufficient given the small scope.

### Patterns encountered
- **Single source of truth for thresholds** — zone boundaries live once in `calcProceedsSplit`; the component reads the output rather than re-implementing the logic
- **Defensive capping in the component** — belt-and-suspenders: `Math.min` in the component even when the source already caps, because components should be correct regardless of prop source
- **`data-*` attributes as testable state contracts** — exposes component state in a way tests can assert without inspecting CSS or implementation details
- **Segment state as a derived value** — `completed / active / future / unknown` is computed from `activeIndex`, not stored — pure derivation from props, no internal state

---

## Phase 5 — Shell UI

### What was built
- `app/layout.tsx` — stripped Geist font imports (design system uses IBM Plex via globals.css), set metadata
- `app/page.tsx` — Client Component owning `portfolioState`, `isInitialLoading`, `isRefreshing` state; skeleton on initial load only; placeholder sections for Phases 6–9
- `components/DemoBadge.tsx` — renders only when `NEXT_PUBLIC_IS_DEMO === 'true'`; `return null` (not CSS hidden) when absent
- `components/Header.tsx` — title, formatted timestamp, stale indicator (>10 min), refresh button with disabled state during refresh
- `tests/components.test.tsx` — 16 tests covering DemoBadge presence/absence, Header structure, timestamp format, stale detection at exact boundary, button interaction

223/223 tests passing.

### Engineering decisions

**Why `isInitialLoading` is a separate boolean, not derived from `portfolioState === null`**
`portfolioState` is also null after a failed refresh (Phase 10 will handle that). If we used `portfolioState === null` to gate the skeleton, a failed refresh would re-show the skeleton and wipe out the "last known good" data — a bad user experience. The separate `isInitialLoading` boolean starts true, transitions to false after the first fetch (success or failure), and never goes back. This is a deliberate one-way state transition.

**Why `DemoBadge` uses `return null` instead of conditional CSS**
CLAUDE.md is explicit: "absent from the DOM in demo mode — not hidden with CSS, not rendered at all." A `display: none` element is still in the DOM and can be inspected. `return null` in React produces no DOM element at all. The test for this verifies `container.innerHTML === ''` — not just invisible, but genuinely absent.

**Why timestamp formatting is inside `Header.tsx` rather than in `formatters.ts`**
`formatters.ts` handles financial display (currency, percentages, P&L). Timestamps are a different concern — they format a date/time string for UI display, not a number. Mixing them would make `formatters.ts` multi-purpose. The `formatTime` helper is local to Header because it's only used there and doesn't belong in the financial formatting module.

**Why `NEXT_PUBLIC_IS_DEMO` is readable in tests despite being a Next.js build-time variable**
In production Next.js, `NEXT_PUBLIC_` variables are replaced with literal values at build time by the webpack plugin. In Vitest (Vite), we bypass the Next.js compiler entirely — `process.env.NEXT_PUBLIC_IS_DEMO` is just a regular env var access at runtime. `vi.stubEnv('NEXT_PUBLIC_IS_DEMO', 'true')` works because it patches `process.env` before the component renders.

**The stale detection boundary test**
Stale is defined as `> STALE_THRESHOLD_MS` (strictly greater than). The test at exactly 10 minutes (600,000 ms) verifies the indicator is absent — this catches an off-by-one error in the `>` vs `>=` comparison. `vi.useFakeTimers()` + `vi.setSystemTime()` pins `Date.now()` so the test result doesn't depend on wall clock time.

### Patterns encountered
- **One-way state transition** — `isInitialLoading` goes false exactly once and never returns; this models "first-load gate" cleanly
- **Absent vs. invisible** — `return null` vs. `display: none` is a meaningful architectural distinction when the invariant requires DOM absence
- **Pinning system time in tests** — `vi.setSystemTime()` before render makes time-dependent components deterministic

---

## Phase 4 — API routes

### What was built
- `app/api/prices/route.ts` — fetches CoinGecko (prices + global), Finnhub (MSTR), Alternative.me (Fear & Greed). Exports `fetchPrices()` for direct import.
- `app/api/portfolio/route.ts` — demo mode returns `DEMO_PORTFOLIO_STATE`; live mode fetches prices + holdings, runs full two-pass calculation pipeline, returns `PortfolioState`
- `app/api/holdings/route.ts` — GET strips cost basis via `toClientHoldings()`; PUT validates body, rate-limits via KV, checks password, writes holdings, resets checklist
- `app/api/checklist/route.ts` — GET + PUT, returns 404 in demo mode
- `tests/api-prices.test.ts` — 11 tests (happy path, each source failing independently, Finnhub 0 edge case)
- `tests/api-portfolio.test.ts` — 21 tests (demo mode, live mode, null prices, default holdings)
- `tests/api-holdings.test.ts` — 23 tests (auth, validation, rate limiting, write mechanics)
- `tests/api-checklist.test.ts` — 14 tests (demo mode 404, live mode GET/PUT, validation)

207/207 tests passing.

### Engineering decisions

**Why `Promise.allSettled` instead of `Promise.all` in `fetchPrices`**
`Promise.all` rejects the entire call if any one fetch fails — one down API (CoinGecko, Finnhub, or Alternative.me) would make the whole prices route fail. `Promise.allSettled` runs all four to completion and we inspect only the fulfilled ones. This implements the "null price handling" invariant at the source: each price field is independently nullable, and a failed source contributes `null` rather than an error.

**Why `fetchPrices` is a named export on the prices route**
The portfolio route needs market data. Calling `/api/prices` over HTTP from inside `/api/portfolio` is an internal HTTP round-trip — unreliable on Vercel because both routes might be on different serverless function instances, and you'd pay network latency inside a single logical operation. Exporting `fetchPrices()` as a regular function makes the import a direct in-process call. This is the "no internal HTTP calls between routes" invariant from CLAUDE.md.

**Why `PORTFOLIO_TARGET` is hardcoded in the portfolio route**
The portfolio target value (1,000,000) is a strategic constant, not user-configurable data. It's not in `Holdings` because it doesn't change per-write. For a personal tool, one line in one file is the right amount of indirection. If it becomes configurable in the future, it can be added to `Holdings` then.

**How the two-pass position build works in the portfolio route**
`buildPositions` can't compute `allocPct` for any position because it needs `totalValue`, which requires all positions to be built first. The portfolio route orchestrates the two passes: call `buildPositions` → call `calcTotalValue` → loop over positions to fill in `allocPct`. This keeps the calculation functions pure (they don't call each other) and the orchestration in one place.

**Why the missing-password case returns 400, not 401**
The route runs validation before authentication. `validateBody` checks `typeof b.password === 'string'` — if the field is absent, the body is structurally invalid, so 400 (bad request) is returned before reaching the password comparison. A body missing a required field is a malformed request, not an authentication failure. The test was initially written expecting 401, which revealed this distinction. The test was corrected to expect 400 and the behaviour is documented in the test description.

**Rate limit design trade-off**
The current rate limiter resets the TTL window on every request (by passing `ex: 900` on every `kv.set`). A sliding window would use `kv.incr` + `kv.expire` (set expiry only on first request). The current design is simpler and acceptable for a single-user personal tool where the limit (5/15min) is generous enough that the window reset is irrelevant in practice.

### Patterns encountered
- **`Promise.allSettled` for fault-tolerant parallel fetches** — each data source fails independently rather than taking down the whole route
- **Direct function import vs. internal HTTP** — exporting `fetchPrices()` as a function is the correct architectural pattern for calling logic from another route in serverless environments
- **Validation before authentication** — the order matters: schema validation (400) runs before credential checking (401). A test failure revealed this ordering and prompted documenting the behaviour explicitly.
- **Server-stamped timestamps** — `updatedAt` is set by the server in the PUT handler, not accepted from the client body. Clients cannot forge timestamps.

---

## Phase 2 — Core library (pure functions)

### What was built
- `lib/types.ts` — all TypeScript interfaces (single source of truth for every data shape)
- `lib/formatters.ts` — 5 formatting functions (currency, percentage, quantity, P&L)
- `lib/calculations.ts` — all pure calculation functions including position builder, allocation builder, trigger evaluators, and proceeds split
- `tests/formatters.test.ts` — 23 tests covering all formatters, null inputs, threshold boundaries, and sign rules
- `tests/calculations.test.ts` — 56 tests covering all calculation functions end-to-end

82/82 tests passing.

### Engineering decisions

**Why the Allocation type deviates from the spec**
The spec's TypeScript interface defines `currentPct: number` and `gap: number` (non-nullable). But the spec's *behaviour description* says "positions with null value are shown with `currentPct: null` and `gap: null`." These two are contradictory. The behaviour description wins because the interface is just a reference — the behaviour description tells us what the UI actually needs. Updated to `currentPct: number | null` and `gap: number | null`. This is a common lesson in spec-driven development: interfaces describe shape, behaviour descriptions describe intent. When they conflict, intent wins.

**Why `calcTotalPnl` only returns null when BTC or MSTR is missing**
The function returns null if BTC or MSTR price is unavailable, but still runs if NEAR or ETH is missing. This is a deliberate business logic decision: BTC (~60% of portfolio) and MSTR (~15%) are the dominant positions. If either price is unknown, the total is too unreliable to display. NEAR and ETH are small enough that their absence produces a slightly understated but not misleading total.

**Why `buildPositions` returns allocPct: null**
`allocPct` requires knowing `totalValue`, which requires the full positions array to be computed first. There's a dependency cycle: you need positions to compute totalValue, and you need totalValue to compute allocPct. The solution is to build positions without allocPct (null), compute totalValue from them, then fill in allocPct in the API route. This is the "two-pass" pattern — a common technique when you need aggregate information to compute per-item properties.

**Why dry powder is included as a position (ticker: 'USD')**
Dry powder needs to appear in both the PositionsTable and AllocationBars (4% target allocation). Including it as a Position with `ticker: 'USD'` and `value: holdings.dryPowder` keeps the data pipeline uniform — both components work from the same positions array. The alternative (handling dry powder as a special case in each component) would be business logic leakage.

**Why the trigger evaluators accept null and return severity: 'warn'**
This follows the spec's null-price handling rules. If a data source is down, the trigger can't evaluate — but it shouldn't crash or throw. Returning `severity: 'warn'` signals "data unavailable, cannot evaluate" rather than silently falling through to a wrong severity. The UI shows red styling for 'warn' which visually communicates the issue.

**The `ALLOCATION_ORDER` constant**
`buildAllocations` returns allocations in a fixed display order (BTC, MSTR, ONDO, LINK, UNI, NEAR, ETH, CASH), not sorted by value. This is intentional: the allocation chart is a strategic reference, not a performance ranking. Fixed order makes it easier to visually track the same positions across sessions.

### Patterns encountered
- **Two-pass computation** — positions built first (pass 1), totalValue computed, allocPct filled in (pass 2)
- **Behaviour-over-interface** — when spec interface and spec behaviour conflict, behaviour wins
- **Null as a meaningful value** — `null` in prices/positions isn't an error state, it's a signal. Every function in this library is designed to accept null and propagate it correctly rather than throwing.
- **Constants at module level** — `TARGET_ALLOCATIONS`, `ASSET_COLORS`, and `ALLOCATION_ORDER` are defined once in `calculations.ts`. They're not exported (components don't need them directly) because the components receive pre-built `Allocation[]` objects.

---

## Phase 3 — Data layer

### What was built
- `lib/types.ts` — added `ChecklistState = boolean[]`
- `lib/kv.ts` — KV read/write helpers: `getHoldings`, `setHoldings`, `getChecklist`, `setChecklist`, `resetChecklist`, `toClientHoldings`, `DEFAULT_HOLDINGS`
- `lib/demo-data.ts` — complete static `PortfolioState` for demo mode, with synthetic but internally consistent numbers
- `tests/kv.test.ts` — 18 tests covering all kv.ts exports, with `@vercel/kv` fully mocked
- `tests/demo-data.test.ts` — 38 tests validating shape, ordering, semantic correctness, and mathematical consistency of the demo data

138/138 tests passing.

### Engineering decisions

**Why `toClientHoldings` lives in kv.ts, not a shared utils file**
It's the exit point of the same security boundary that `getHoldings` guards at the entry point. Both live in kv.ts so the server-side/client-side boundary is visible in one file — a reader can see the full journey: KV → `Holdings` (with cost basis) → `toClientHoldings()` → `ClientHoldings` (safe for response). Scattering this across files would obscure where the boundary actually is.

**Why `DEFAULT_HOLDINGS.updatedAt` uses epoch zero**
`new Date(0).toISOString()` (`'1970-01-01T00:00:00.000Z'`) is a sentinel: it unambiguously means "never updated". Any real write will produce a more recent timestamp. API routes can detect uninitialised state without a separate `isInitialised` flag, keeping the type simple.

**Why demo data is hand-crafted, not derived from the calculation functions**
Using `buildPositions`, `calcTotalValue`, etc. to generate demo data would create a dependency: if a calculation function has a bug, demo mode would silently reproduce it. Static data is independently verifiable — the test suite confirms both its shape (structure, types) and semantics (sort order, sum to 100%, zone match). The numbers were manually computed and documented in the file header, making them auditable.

**Why `ChecklistState = boolean[]` rather than a keyed object**
The 8 checklist items are ordered and rendered as a list. An array maps directly to that structure. A keyed object (`{ step1: boolean, ... }`) would require the UI to know both the keys and the display order — two pieces of information instead of one. The trade-off is that the keys are positional (implicit order), but since the items are fixed and never rearranged, this is acceptable.

**How vi.mock hoisting works for the KV tests**
Vitest hoists `vi.mock()` calls above all `import` statements via its Vite transform plugin. This means even though `vi.mock('@vercel/kv', ...)` appears after the imports in source, it runs *before* any module is evaluated. When `kv.ts` is first imported in the test, `@vercel/kv` is already mocked — so `kv.get` and `kv.set` are `vi.fn()` stubs throughout. This is the standard pattern for mocking third-party modules with side effects (network, file I/O, credentials).

### Patterns encountered
- **Security boundary as co-location** — `toClientHoldings` paired with `getHoldings`/`setHoldings` in one file makes the data flow and stripping logic visible together
- **Sentinel values** — epoch zero as "never set", distinct from `null` (unknown) or `undefined` (missing)
- **Static data for correctness isolation** — demo data doesn't depend on the calculation pipeline, so it can serve as a reference even if calculations contain bugs
- **vi.mock hoisting** — Vitest's hoist transform makes module-level mocks reliable for async/stateful third-party modules

---

## Phase 1 — Scaffolding

### What was built
- Next.js 15 app bootstrapped with `create-next-app` (App Router, TypeScript, no Tailwind, no ESLint)
- `@vercel/kv` installed for later persistence work
- Vitest configured as the test runner with jsdom and React Testing Library
- `next.config.ts` set up with CSP headers and security defaults from the spec
- `app/globals.css` replaced with the full design system — CSS variables, fonts, scanline overlay, skeleton animation, responsive grid utilities
- `components/` and `lib/` directories created (empty, ready for Phase 2+)
- `tests/setup.test.ts` smoke test verifying runner, TypeScript, and jsdom

### Engineering decisions

**Why Vitest over Jest?**
Jest predates native ES modules and TypeScript — it requires Babel transforms and config to work with modern Next.js. Vitest is built for the current ecosystem (uses Vite under the hood), needs almost no config, and has the same `describe/it/expect` API as Jest. Switching later would cost near-zero because the test syntax is identical.

**Why jsdom?**
Vitest runs in Node.js, which has no browser APIs. jsdom simulates a browser DOM inside Node so tests can interact with HTML elements, check if things render, and use browser globals like `document` and `window`. Without it, any test touching the DOM would throw "document is not defined".

**Why a separate `vitest.setup.ts`?**
The setup file imports `@testing-library/jest-dom`, which adds extra matchers like `toBeInTheDocument()` and `toHaveTextContent()`. Without it, those matchers aren't available in tests. Putting it in a separate file (rather than inline) keeps the config clean and makes it easy to add more global setup later.

**Why CSS variables for the entire design system?**
Hard-coding hex values in components creates maintenance problems — if you want to tweak `--orange`, you'd have to find every component that uses it. CSS variables are a single source of truth. Changing one variable cascades everywhere. This is the same DRY principle applied to styling.

**Why `body::before` for the scanline effect?**
The scanline texture is a purely cosmetic overlay. Using `::before` with `pointer-events: none` and `position: fixed; z-index: 9999` means it floats above all content visually but never intercepts clicks or interaction. No JavaScript, no extra elements in the component tree — pure CSS.

**The git history incident**
`create-next-app` won't scaffold into a directory containing unknown files, and it always runs `git init` internally. Scaffolding into a temp directory and copying files across is the correct workaround — but the copy overwrote `.git`, replacing our history with the scaffold's empty history. Fixed by: deleting the bad `.git`, re-initialising, pointing to the GitHub remote, and `git reset --soft origin/main` to restore the HEAD pointer without touching the working tree. Lesson: always scaffold into an empty directory and copy in, never copy out a `.git` folder.

### Patterns encountered
- **Environment-driven configuration** — the same codebase runs as demo or live purely based on environment variables, no code branching at deploy time
- **Security headers at the framework level** — CSP, X-Frame-Options, and X-Content-Type-Options are configured once in `next.config.ts` and applied to every route automatically. No per-route configuration needed.

---

# What is CLAUDE.md and Why Does It Look Like This?

This document explains the engineering thinking behind the `CLAUDE.md` file in this project — what it is, why it exists, and why each section is structured the way it is.

---

## What is CLAUDE.md?

`CLAUDE.md` is a context file that Claude Code automatically reads at the start of every conversation. It's how you give an AI assistant persistent, project-specific knowledge without having to re-explain things every session.

Think of it like onboarding documentation — but written for an AI collaborator instead of a human developer joining your team. A new human developer would read a README and ask questions. Claude reads `CLAUDE.md` and immediately knows the rules of the project.

**Without it:** Every session, Claude might write `fetch('/api/prices')` inside another API route, or format a number with inline `.toFixed()`, or accidentally include cost basis in a client response. You'd have to catch and correct these every time.

**With it:** The invariants are baked into Claude's context from the start. You're encoding your architectural decisions once, and they hold across every session.

---

## Why Is There a "Learning Context" Section at the Top?

This is deliberate and unusual. Most `CLAUDE.md` files are purely technical. This one starts with an instruction to Claude about *how to behave as a collaborator* on this project.

The engineering principle here is called **separation of concerns at the meta level**: the file serves two purposes, and they're clearly separated:

1. **Behavioural instructions** (how Claude should communicate) — at the top
2. **Technical constraints** (what the code must do) — below

It's at the top because Claude reads files top-to-bottom, and behavioural instructions should colour everything that follows. If it were buried at the bottom, there's a risk it would be ignored in truncation.

---

## Why "Critical Invariants" Instead of Just Rules?

The word "invariant" is precise. In engineering, an **invariant** is a condition that must always be true, no matter what else changes. It's stronger than a "rule" or "guideline" — invariants don't have exceptions.

This framing matters because it signals to Claude (and to you, reading this later) that these aren't preferences — they're load-bearing constraints. Breaking one of them doesn't just produce bad code; it produces a security hole or a broken deployment.

The invariants in this project fall into categories:

### Security invariants
The cost basis rule (`never send cost basis to the client`) is a **security boundary**. Your buy prices are sensitive financial information. The architecture deliberately computes P&L on the server and only sends the derived result to the client. This is called **data minimisation** — you never expose more data than is necessary.

The environment variable split (`MODE` vs `NEXT_PUBLIC_IS_DEMO`) is the same principle. Variables with `NEXT_PUBLIC_` are bundled into the JavaScript that browsers download. Variables without that prefix stay on the server. Mixing them up would expose your password or API keys.

### Architectural invariants
"No internal HTTP calls between routes" is an **architectural constraint** imposed by the platform (Vercel's serverless environment). Serverless functions are stateless and ephemeral — making one function call another over HTTP is fragile because there's no guarantee both functions are warm at the same time, and you'd be doing network round-trips inside a single logical operation. Exporting `fetchPrices()` as a regular function and importing it directly is faster, more reliable, and easier to test.

### Platform invariants
`export const runtime = 'nodejs'` is a **platform constraint**. Next.js has two runtime environments for API routes: Edge (fast, global, limited capabilities) and Node.js (full capabilities, slightly slower cold start). Your routes make outbound HTTP calls and use KV — both require Node.js. Forgetting this declaration means your route silently fails on Vercel even if it works locally.

### Quality invariants
The formatters rule (`all formatting goes through lib/formatters.ts`) is about **single source of truth**. If you format currency in 12 different components and need to change the format (e.g. add more decimal places for small values), you'd have to find and update 12 places. With a central formatter, you change one function and everything updates. This is the **DRY principle** — Don't Repeat Yourself.

---

## Why Pure Functions in `lib/calculations.ts`?

The spec insists all calculation logic lives in `lib/calculations.ts` as pure functions. A **pure function**:
- Given the same inputs, always returns the same output
- Has no side effects (doesn't call APIs, doesn't write to databases, doesn't mutate anything outside itself)

This matters for two reasons:

**Testability.** Pure functions are trivial to unit test. You call the function with known inputs and assert on the output. No mocking, no database setup, no network calls. If `calcProceedsSplit(67420)` returns the wrong zone, you find out immediately.

**Predictability.** When a bug appears in the P&L calculation, you know exactly where to look — `lib/calculations.ts`. The bug can't be caused by something happening in a component or an API route, because those don't contain calculation logic.

The alternative — scattering calculations across components and API routes — is called **business logic leakage**. It's one of the most common causes of hard-to-debug inconsistencies in web apps.

---

## Why Is the File Map a Table?

The file map section gives Claude a quick orientation to the project structure. It's a table rather than prose because:

- Claude can scan a table faster than paragraphs
- The "Role" column forces a one-sentence summary of each file's responsibility — this is a good engineering discipline called the **Single Responsibility Principle**. If you can't describe a file's purpose in one sentence, it's probably doing too many things.

---

## Why Document What *Not* To Use?

The "Do Not Use" section exists because Claude has broad training data and will reach for common tools by default. `yahoo-finance2` is a popular package that appears in thousands of Next.js projects, so Claude might suggest it without knowing it fails on Vercel. Explicit negative constraints prevent this.

This is also a useful engineering habit for human teams: recording *why* something was rejected (not just what) means future contributors don't have to rediscover the same problem.

---

## What Makes a Good CLAUDE.md?

For your own future projects, here's what the structure of this file teaches:

| Section | Why it's there |
|---------|----------------|
| Learning context | Sets the tone for how Claude collaborates — project-specific behaviour |
| Project overview | Single-paragraph orientation — what is this thing? |
| Stack | What tools are in use, so Claude doesn't suggest alternatives |
| Critical invariants | Load-bearing rules that can't be violated — security, architecture, platform |
| File map | Structure of the codebase with one-sentence roles |
| Domain rules | Logic specific to this project (calculations, formatting) |
| UI rules | Patterns that apply across all components |
| Do Not Use | Explicit exclusions with implicit reasons |

The file is **opinionated, not exhaustive**. It doesn't describe every component — that would duplicate the spec. It captures the things most likely to go wrong without explicit guidance.
