import { kv } from '@vercel/kv'
import type { Holdings, ClientHoldings, ChecklistState } from './types'

const KV_HOLDINGS_KEY = 'holdings'
const KV_CHECKLIST_KEY = 'checklist'
const CHECKLIST_LENGTH = 8

// ---------------------------------------------------------------------------
// Default / fallback values
// ---------------------------------------------------------------------------

/**
 * Placeholder used when KV has no stored holdings (first deploy, or KV cleared).
 * updatedAt is epoch zero — a sentinel that unambiguously means "never set".
 */
export const DEFAULT_HOLDINGS: Holdings = {
  btc:       { qty: 0, costBasis: 0 },
  mstr:      { qty: 0, costBasis: 0 },
  near:      { qty: 0, costBasis: 0 },
  uni:       { qty: 0, costBasis: 0 },
  link:      { qty: 0, costBasis: 0 },
  ondo:      { qty: 0, costBasis: 0 },
  dryPowder: 0,
  nupl:      0,
  updatedAt: new Date(0).toISOString(),
}

// ---------------------------------------------------------------------------
// Security boundary — cost basis must never reach the client
// ---------------------------------------------------------------------------

/**
 * Strips costBasis from every AssetHolding before any client response.
 * This is the single location where the server→client security boundary is
 * enforced. Called in /api/holdings (GET) and /api/portfolio responses.
 *
 * Pattern: data minimisation — never expose more than the client needs.
 */
export function toClientHoldings(holdings: Holdings): ClientHoldings {
  return {
    btc:       { qty: holdings.btc.qty },
    mstr:      { qty: holdings.mstr.qty },
    near:      { qty: holdings.near.qty },
    uni:       { qty: holdings.uni.qty },
    link:      { qty: holdings.link.qty },
    ondo:      { qty: holdings.ondo.qty },
    dryPowder: holdings.dryPowder,
    nupl:      holdings.nupl,
    updatedAt: holdings.updatedAt,
  }
}

// ---------------------------------------------------------------------------
// Holdings KV helpers
// ---------------------------------------------------------------------------

export async function getHoldings(): Promise<Holdings> {
  try {
    const stored = await kv.get<Holdings>(KV_HOLDINGS_KEY)
    return stored ?? DEFAULT_HOLDINGS
  } catch {
    return DEFAULT_HOLDINGS
  }
}

export async function setHoldings(holdings: Holdings): Promise<void> {
  await kv.set(KV_HOLDINGS_KEY, holdings)
}

// ---------------------------------------------------------------------------
// Checklist KV helpers
// ---------------------------------------------------------------------------

export async function getChecklist(): Promise<ChecklistState> {
  const stored = await kv.get<ChecklistState>(KV_CHECKLIST_KEY)
  // Guard against missing or corrupted data — must be exactly CHECKLIST_LENGTH booleans
  if (!stored || stored.length !== CHECKLIST_LENGTH) {
    return Array(CHECKLIST_LENGTH).fill(false) as ChecklistState
  }
  return stored
}

export async function setChecklist(state: ChecklistState): Promise<void> {
  await kv.set(KV_CHECKLIST_KEY, state)
}

/** Called after a successful holdings write — checklist reflects the current cycle. */
export async function resetChecklist(): Promise<void> {
  await kv.set(KV_CHECKLIST_KEY, Array(CHECKLIST_LENGTH).fill(false))
}
