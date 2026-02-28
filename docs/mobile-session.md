# Mobile Session — One-Time Use, 5-Minute Expiry

## What you're building

A lightweight session layer for mobile write requests. On desktop, the existing
flow is unchanged: the password travels inline with every PUT to `/api/holdings`.
On mobile, a two-step flow replaces it:

1. User authenticates with their password → server issues a short-lived session token
2. User submits holdings with that token → token is consumed (one-time use) and deleted

This prevents a picked-up phone from being used to make edits after the owner
has walked away — even if the Edit Holdings panel is still open.

---

## Why a separate session layer, not just a shorter password TTL

The current model has no session state at all — the password is submitted on
every write and validated synchronously. That's fine for desktop, where the risk
of a hijacked browser tab is low. On mobile the threat model is different:
physical access. A 5-minute window plus one-use destruction limits the blast
radius of that access without adding full auth infrastructure (cookies, JWTs,
refresh tokens) that would be overkill for a single-user personal tool.

---

## Mobile detection

Detection is server-side, via the `User-Agent` request header.

```ts
function isMobileUA(ua: string | null): boolean {
  if (!ua) return false
  return /mobile|android|iphone|ipad|ipod/i.test(ua)
}
```

Server-side UA sniffing is used (not viewport width) because:
- Viewport is a client-side concept — unavailable in API routes
- It keeps the logic in one place, in the route handler
- A determined attacker could spoof either; UA is sufficient for a personal tool

If UA is absent or ambiguous, default to desktop flow (fail open rather than
locking the user out).

---

## Session token model

| Property | Value |
|---|---|
| Generator | `crypto.randomUUID()` — built into Node.js 18+, no deps |
| KV key | `session:<token>` |
| KV value | `1` — presence alone is the signal; no metadata needed |
| TTL | 300 seconds (5 minutes) — set via KV `ex` option |
| Destruction | `kv.del('session:<token>')` immediately on first use |

The token is opaque to the client — it's just a UUID string. The client stores
it in component state only; it is never written to localStorage or cookies.

---

## API changes

### New: `POST /api/session`

Issues a session token. Mobile only.

**Request body:**
```json
{ "password": "..." }
```

**Logic:**
1. Read `User-Agent` — if not mobile, return `403 Desktop clients use inline password auth`
2. Validate password (plain text, same as existing `PUT /api/holdings` logic)
3. If wrong password → `401 Unauthorized`
4. Generate token: `crypto.randomUUID()`
5. `kv.set('session:<token>', 1, { ex: 300 })`
6. Return `{ token }`

**Reuses existing rate-limiting pattern:** same `ratelimit:<ip>` key and 5/15-min
window — no new KV keys needed for rate limiting.

---

### Modified: `PUT /api/holdings`

Accepts either auth mode. The presence of `token` vs `password` in the body
determines which path runs.

**Updated body shape (union):**
```ts
// Desktop (unchanged)
{ password: string; btc: ...; mstr: ...; ... }

// Mobile
{ token: string; btc: ...; mstr: ...; ... }
```

**Mobile auth path (token present):**
1. `const exists = await kv.get('session:<token>')`
2. If null → `401 Session expired or already used`
3. `await kv.del('session:<token>')` — destroy immediately (one-time use)
4. Continue with the write

**Desktop auth path (password present, unchanged):**
- Plain text comparison as before
- No KV session lookup

`validateBody()` is updated to accept either `password` or `token` (not both,
not neither). The rest of the handler (validation, holdings write, checklist
reset) is untouched.

---

## Client-side changes — `EditHoldingsPanel.tsx`

On mount, detect mobile using `window.innerWidth < 768` (client-side viewport —
distinct from the server-side UA check, used only to adapt the UI flow).

```ts
const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
```

The two auth flows diverge only inside `handleSubmit`:

**Desktop (unchanged):**
Builds body with `password` field and POSTs directly to `PUT /api/holdings`.

**Mobile:**
```
1. POST /api/session  { password }
   → on error: show error, stop
   → on success: receive token

2. PUT /api/holdings  { token, ...holdingFields }
   → success / error handling same as existing flow
```

After a successful mobile save, clear `form.password` from state — the token is
already consumed server-side, so retaining the password in state offers no
benefit and is a minor hygiene improvement.

**No new UI chrome needed.** The user experience is identical — they type
their password and tap Save. The two-step handshake is invisible.

---

## File map

| File | Change |
|---|---|
| `app/api/session/route.ts` | New. POST handler: validate password, issue token |
| `app/api/holdings/route.ts` | Modified. `validateBody` accepts token or password; mobile auth path added |
| `components/EditHoldingsPanel.tsx` | Modified. Two-step submit on mobile |

No new dependencies. No new environment variables. No schema migrations.

---

## KV keys introduced

| Key | TTL | Purpose |
|---|---|---|
| `session:<uuid>` | 300s | One-time-use mobile session token |

---

## Constraints

- Desktop write flow is completely unchanged — no regressions possible there
- Do not use cookies or `Set-Cookie` headers — this project has no cookie infrastructure
- Do not use localStorage — session tokens should not survive a page reload
- `crypto.randomUUID()` requires Node.js 18+ — already guaranteed by `export const runtime = 'nodejs'` on all routes
- If `POST /api/session` succeeds but `PUT /api/holdings` fails, the token is
  already consumed. The user must re-authenticate. This is acceptable: the failure
  modes (network drop, validation error) are rare and the retry cost is low
- Rate limiting applies to `POST /api/session` using the same KV pattern as holdings

---

## Implementation order

1. `app/api/session/route.ts` — new POST handler
2. `app/api/holdings/route.ts` — update `validateBody`, add mobile token path
3. `components/EditHoldingsPanel.tsx` — two-step submit on mobile
4. Tests:
   - `POST /api/session`: wrong password → 401, desktop UA → 403, mobile UA + correct password → 200 with token
   - `PUT /api/holdings` mobile path: valid token → 200 + token deleted, expired/used token → 401, token used twice → 401 on second
   - `PUT /api/holdings` desktop path: existing tests unchanged
