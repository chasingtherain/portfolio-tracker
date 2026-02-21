# Implementation Notes

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
