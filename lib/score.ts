import type { DecisionEntry } from './decisions.types'

export type ScoreBreakdown = {
  overall:                number           // 0-100
  byStage:                Record<string, number>
  byFearGreedZone: {
    fear:    number                        // decisions where fearGreed < 25
    greed:   number                        // decisions where fearGreed > 75
    neutral: number                        // decisions where fearGreed 25-75
  }
  totalDecisions:         number
  alignedCount:           number
  misalignedCount:        number
  topMisalignmentReason:  string | null    // most frequent reason among misaligned entries
}

/**
 * Calculates the strategy adherence score from a list of decision entries.
 *
 * The score is a linear recency-weighted average — recent decisions matter
 * more than old ones. Neutral decisions are excluded from the calculation
 * (they carry no signal about strategy adherence).
 *
 * If there are no scoreable decisions, returns 100 (no evidence of misalignment).
 *
 * The recency weighting: entries are assumed to be sorted newest-first.
 * We reverse to get oldest-first so that higher indices correspond to
 * more recent entries, giving them a larger weight coefficient.
 */
export function calculateScore(entries: DecisionEntry[]): ScoreBreakdown {
  const alignedCount    = entries.filter(e => e.alignment === 'aligned').length
  const misalignedCount = entries.filter(e => e.alignment === 'misaligned').length

  // ---------------------------------------------------------------------------
  // Overall score — recency-weighted, neutral entries excluded
  // ---------------------------------------------------------------------------
  const scoreable = entries.filter(e => e.alignment !== 'neutral')

  let overall = 100
  if (scoreable.length > 0) {
    let weightedSum = 0
    let totalWeight = 0

    // Sort oldest-first so that higher index = more recent = higher weight
    const sorted = [...scoreable].sort((a, b) => a.timestamp - b.timestamp)

    sorted.forEach((entry, i) => {
      const weight = (i + 1) / sorted.length
      const value  = entry.alignment === 'aligned' ? 1 : 0
      weightedSum += value * weight
      totalWeight += weight
    })

    overall = Math.round((weightedSum / totalWeight) * 100)
  }

  // ---------------------------------------------------------------------------
  // Breakdown by position stage
  // ---------------------------------------------------------------------------
  const stageMap: Record<string, { aligned: number; total: number }> = {}

  for (const entry of entries) {
    if (entry.alignment === 'neutral') continue
    const stage = entry.snapshot.positionStage
    if (!stageMap[stage]) stageMap[stage] = { aligned: 0, total: 0 }
    stageMap[stage].total++
    if (entry.alignment === 'aligned') stageMap[stage].aligned++
  }

  const byStage: Record<string, number> = {}
  for (const [stage, { aligned, total }] of Object.entries(stageMap)) {
    byStage[stage] = total > 0 ? Math.round((aligned / total) * 100) : 100
  }

  // ---------------------------------------------------------------------------
  // Breakdown by fear & greed zone
  // ---------------------------------------------------------------------------
  function zoneScore(filter: (fg: number) => boolean): number {
    const zoneEntries = entries.filter(
      e => e.alignment !== 'neutral' && filter(e.snapshot.fearGreed)
    )
    if (zoneEntries.length === 0) return 100
    const aligned = zoneEntries.filter(e => e.alignment === 'aligned').length
    return Math.round((aligned / zoneEntries.length) * 100)
  }

  const byFearGreedZone = {
    fear:    zoneScore(fg => fg < 25),
    greed:   zoneScore(fg => fg > 75),
    neutral: zoneScore(fg => fg >= 25 && fg <= 75),
  }

  // ---------------------------------------------------------------------------
  // Top misalignment reason — most frequent reason string among misaligned entries
  // ---------------------------------------------------------------------------
  const reasonCounts: Record<string, number> = {}
  for (const entry of entries) {
    if (entry.alignment !== 'misaligned') continue
    reasonCounts[entry.alignmentReason] = (reasonCounts[entry.alignmentReason] ?? 0) + 1
  }
  const topMisalignmentReason = Object.keys(reasonCounts).length > 0
    ? Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0][0]
    : null

  return {
    overall,
    byStage,
    byFearGreedZone,
    totalDecisions:        entries.length,
    alignedCount,
    misalignedCount,
    topMisalignmentReason,
  }
}
