import { kv } from '@vercel/kv'
import type { DecisionEntry } from './decisions.types'
import type { ScoreBreakdown } from './score'

// ---------------------------------------------------------------------------
// Key constants
// ---------------------------------------------------------------------------

const DECISIONS_KEY  = 'decisions'
const SCORE_CACHE_KEY = 'decisions:score'
const SCORE_CACHE_TTL = 60 // seconds

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

/**
 * Persists a new decision entry to the sorted set.
 * The timestamp (Unix ms) is used as the sort score so entries are naturally
 * ordered by time — ZREVRANGE gives newest-first reads with no sorting overhead.
 */
export async function writeDecision(entry: DecisionEntry): Promise<void> {
  await kv.zadd(DECISIONS_KEY, {
    score:  entry.timestamp,
    member: JSON.stringify(entry),
  })
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/**
 * Reads decision entries, newest first.
 *
 * All filtering is done in memory after fetching from Redis. This is fine
 * for a personal tracker — the dataset is small and Redis sorted sets don't
 * support filtering by JSON field values natively.
 *
 * When called with no opts, returns ALL entries (used by the score calculator).
 */
export async function readDecisions(opts?: {
  asset?:     string
  alignment?: 'aligned' | 'misaligned' | 'neutral'
  from?:      number
  to?:        number
  limit?:     number
  offset?:    number
}): Promise<DecisionEntry[]> {
  // ZREVRANGE returns members highest-score-first, i.e. newest-first
  const raw = await kv.zrevrange(DECISIONS_KEY, 0, -1)
  let entries: DecisionEntry[] = raw.map(r => JSON.parse(r as string) as DecisionEntry)

  if (opts?.asset)     entries = entries.filter(e => e.asset === opts.asset)
  if (opts?.alignment) entries = entries.filter(e => e.alignment === opts.alignment)
  if (opts?.from)      entries = entries.filter(e => e.timestamp >= opts.from!)
  if (opts?.to)        entries = entries.filter(e => e.timestamp <= opts.to!)

  const offset = opts?.offset ?? 0
  const limit  = opts?.limit

  if (limit !== undefined) {
    return entries.slice(offset, offset + limit)
  }
  return entries.slice(offset)
}

// ---------------------------------------------------------------------------
// Score cache
// ---------------------------------------------------------------------------

/**
 * Returns the cached score breakdown if it's still fresh, or null if stale/absent.
 * The TTL is set on write — we check existence, not age, since KV handles expiry.
 */
export async function readCachedScore(): Promise<ScoreBreakdown | null> {
  return kv.get<ScoreBreakdown>(SCORE_CACHE_KEY)
}

/**
 * Writes the score breakdown to KV with a short TTL.
 * The cache is intentionally short-lived (60s) — scores reflect recent decisions
 * and should stay fresh without manual invalidation after reads.
 */
export async function writeCachedScore(score: ScoreBreakdown): Promise<void> {
  await kv.set(SCORE_CACHE_KEY, score, { ex: SCORE_CACHE_TTL })
}

/**
 * Exported so the decisions POST handler can invalidate the cache immediately
 * after writing a new entry, ensuring the next score fetch reflects it.
 */
export { SCORE_CACHE_KEY }
