# Mobile Session — 5-Minute Expiry

## Intent

On mobile, the entire session — both dashboard access and write
authentication — expires after 5 minutes. On desktop, nothing changes.

Two independent mechanisms enforce this:

1. **Dashboard cookie** (`POST /api/auth`) — issues a `Max-Age=300` cookie
   on mobile. When it expires, the next page load redirects to `/login`.
2. **Write token** (`POST /api/session` → `PUT /api/holdings`) — a one-time-use
   KV token with a 300s TTL. Consumed server-side on first use; a second
   attempt with the same token gets a 401.

Together they mean a picked-up phone:
- Can't view the dashboard after 5 minutes (cookie expired → `/login`)
- Can't replay a prior save (token already consumed)
- Can't submit a new save without re-entering the password (token is gone)

---

## What this feature does and does not do

**Dashboard access:** Expires 5 minutes after login on mobile. The browser
stops sending the cookie; the middleware finds nothing and redirects to `/login`.
The clock starts at login — there is no sliding window or activity-based renewal.

**Write tokens:** One-time-use. Consumed the moment a successful save is
submitted. A new save requires tapping Save again, which issues a fresh token.
The 5-minute TTL on the KV token is a safety net for network failures — in the
happy path the token is created and consumed within milliseconds.

**Password in form state:** After a successful mobile save the password field
is cleared from React state. If the page is still open when the cookie expires
and the user is redirected to `/login`, they re-authenticate there — not inside
the Edit Holdings panel.

---

## Why two separate mechanisms

The cookie and the write token guard different things:

| Concern | Mechanism |
|---|---|
| Viewing the dashboard | `portfolio-auth` cookie, checked by middleware on every request |
| Submitting a holdings write | One-time KV token, checked by `PUT /api/holdings` |

A short cookie alone would expire the dashboard but leave the write endpoint
exposed to anyone who knew the password and made a direct API call. The write
token ensures that even a direct `PUT /api/holdings` request requires a fresh
credential exchange on every save.

---

## Mobile detection

All detection is server-side via the `User-Agent` request header. The same
function is used in both `/api/auth` and `/api/session`:

```ts
function isMobileUA(ua: string | null): boolean {
  if (!ua) return false
  return /mobile|android|iphone|ipad|ipod/i.test(ua)
}
```

If UA is absent or ambiguous, desktop behaviour applies — fail open rather than
locking the user out.

`EditHoldingsPanel.tsx` also uses `window.innerWidth < 768` client-side to decide
which submit path to run. This is a separate check, used only to adapt the UI
flow — it is not a security boundary.

---

## Dashboard cookie — `POST /api/auth`

| Device | `Max-Age` |
|---|---|
| Mobile (UA detected) | 300 seconds (5 minutes) |
| Desktop / UA absent | 604800 seconds (7 days) |

No other cookie attributes change. `HttpOnly`, `SameSite=Strict`, and `Secure`
(in production) apply to both.

When the mobile cookie expires the browser silently drops it. The next request
to any route hits the middleware, finds no `portfolio-auth` cookie, and redirects
to `/login`. No client-side code is involved.

---

## Write token — `POST /api/session`

Issues a one-time KV token. Mobile only — desktop clients use the inline
password path on `PUT /api/holdings` directly.

**Request body:**
```json
{ "password": "..." }
```

**Logic:**
1. Read `User-Agent` — if not mobile → `403`
2. Rate-limit by IP (same 5/15-min window as `/api/holdings`)
3. Validate password → `401` on mismatch
4. Generate token: `crypto.randomUUID()`
5. `kv.set('session:<token>', 1, { ex: 300 })`
6. Return `{ token }`

---

## Modified: `PUT /api/holdings`

Accepts either auth mode. `validateBody()` enforces XOR — exactly one of
`password` or `token` must be present; both or neither is a 400.

**Mobile auth path (token present):**
1. `const exists = await kv.get('session:<token>')`
2. If null → `401 Session expired or already used`
3. `await kv.del('session:<token>')` — destroy immediately (one-time use)
4. Continue with the write

**Desktop auth path (password present, unchanged):**
- Plain text comparison as before
- No KV session lookup

---

## Client-side flow — `EditHoldingsPanel.tsx`

`window.innerWidth < 768` inside `handleSubmit` determines which path runs:

**Desktop:** Single `PUT /api/holdings` with `{ password, ...holdingFields }`.

**Mobile — two-step:**
```
1. POST /api/session  { password }
   → error: show message, stop
   → success: receive token

2. PUT /api/holdings  { token, ...holdingFields }
   → error: show message, stop
   → success: clear password from state, trigger refresh
```

The two-step handshake is invisible to the user — they type their password and
tap Save exactly as before.

---

## File map

| File | Change |
|---|---|
| `app/api/auth/route.ts` | Modified. 5-min `Max-Age` cookie when UA is mobile |
| `app/api/session/route.ts` | New. POST handler: mobile gate, rate limit, issue KV token |
| `app/api/holdings/route.ts` | Modified. `validateBody` accepts token XOR password; mobile token path added |
| `components/EditHoldingsPanel.tsx` | Modified. Two-step submit on mobile; clears password on success |
| `tests/api-auth.test.ts` | New. 10 tests — cookie lifetime by UA |
| `tests/api-session.test.ts` | New. 13 tests — mobile detection, auth, rate limiting |

---

## KV keys introduced

| Key | TTL | Purpose |
|---|---|---|
| `session:<uuid>` | 300s | One-time-use mobile write token |

---

## Constraints

- Desktop flows are completely unchanged — cookie lifetime, write path, no regressions
- Session tokens are not stored client-side (no localStorage, no additional cookies)
  — they live in React state only for the milliseconds between step 1 and step 2
- `crypto.randomUUID()` is available natively — no new dependencies
- If `POST /api/session` succeeds but `PUT /api/holdings` fails, the token is
  consumed and the user must re-enter their password to try again — acceptable,
  since this failure path is rare and the retry cost is low
- The 5-minute dashboard cookie has no sliding window — it expires from the
  moment of login, not from last activity
