'use client'

import { useState, useEffect } from 'react'
import type { ScoreBreakdown } from '@/lib/score'

function scoreColor(score: number): string {
  if (score >= 90) return 'var(--green)'
  if (score >= 70) return 'var(--yellow)'
  return 'var(--red)'
}

export function AdherenceScoreCard() {
  const [breakdown, setBreakdown] = useState<ScoreBreakdown | null>(null)

  useEffect(() => {
    fetch('/api/decisions/score')
      .then(r => r.json())
      .then((data: ScoreBreakdown) => setBreakdown(data))
      .catch(() => {})
  }, [])

  const tooltipText = breakdown
    ? `${breakdown.alignedCount} aligned / ${breakdown.totalDecisions} total decisions` +
      (breakdown.topMisalignmentReason
        ? `\nTop misalignment: ${breakdown.topMisalignmentReason}`
        : '\nNo misaligned decisions')
    : ''

  return (
    <div
      className="panel"
      title={tooltipText}
      style={{ display: 'flex', flexDirection: 'column', gap: 8, cursor: breakdown ? 'help' : 'default' }}
    >
      <div className="panel-title">ADHERENCE</div>
      {breakdown === null ? (
        <div
          className="skeleton"
          style={{ height: 28, borderRadius: 4, width: '60%' }}
        />
      ) : (
        <span
          data-testid="stat-adherence-score"
          className="mono"
          style={{
            fontSize:   21,
            fontWeight: 500,
            color:      scoreColor(breakdown.overall),
          }}
        >
          {breakdown.overall}%
        </span>
      )}
    </div>
  )
}
