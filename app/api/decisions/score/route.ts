export const runtime = 'nodejs'

import { readDecisions, readCachedScore, writeCachedScore } from '@/lib/decisions'
import { calculateScore } from '@/lib/score'

/**
 * GET /api/decisions/score
 *
 * Returns the strategy adherence score breakdown.
 * Uses a 60-second KV cache — score recalculation over hundreds of entries
 * on every dashboard load would be unnecessary. Cache is invalidated immediately
 * when a new decision is written (POST /api/decisions).
 */
export async function GET(): Promise<Response> {
  const cached = await readCachedScore()
  if (cached !== null) {
    return Response.json(cached)
  }

  const entries  = await readDecisions()
  const breakdown = calculateScore(entries)
  await writeCachedScore(breakdown)

  return Response.json(breakdown)
}
