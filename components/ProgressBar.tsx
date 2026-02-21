import { formatCurrency, formatPct } from '@/lib/formatters'

interface ProgressBarProps {
  totalValue:  number
  target:      number
  progressPct: number
  gapToTarget: number
}

export function ProgressBar({ totalValue, target, progressPct, gapToTarget }: ProgressBarProps) {
  // Bar width is capped at 100% — calcProgressToTarget already caps it,
  // but the component is defensive in case raw values are passed directly.
  const barWidthPct = Math.min(progressPct, 100)

  const gapDisplay =
    gapToTarget > 0
      ? '+' + formatCurrency(gapToTarget)
      : formatCurrency(gapToTarget)

  const gapColor = gapToTarget >= 0 ? 'var(--green)' : 'var(--text-muted)'

  return (
    <div className="panel" data-testid="progress-bar-container">
      <div className="panel-title">PROGRESS TO TARGET</div>

      {/* Track + fill */}
      <div
        style={{
          background:   'var(--surface2)',
          borderRadius: 6,
          height:       20,
          overflow:     'hidden',
        }}
      >
        <div
          data-testid="progress-bar-fill"
          style={{
            width:      `${barWidthPct}%`,
            height:     '100%',
            background: 'var(--orange)',
          }}
        />
      </div>

      {/* Labels row */}
      <div
        style={{
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'baseline',
          marginTop:      8,
        }}
      >
        <span data-testid="progress-value" className="mono" style={{ fontSize: 14 }}>
          {formatCurrency(totalValue)}
        </span>
        <span className="mono text-muted" style={{ fontSize: 13 }}>
          of {formatCurrency(target)}
        </span>
        <span data-testid="progress-pct" className="mono" style={{ fontSize: 14, color: 'var(--orange)' }}>
          {formatPct(progressPct)}
        </span>
      </div>

      {/* Gap to target */}
      <div style={{ marginTop: 4 }}>
        <span
          data-testid="progress-gap"
          className="mono text-muted"
          style={{ fontSize: 12, color: gapColor }}
        >
          {gapDisplay} to target
        </span>
      </div>
    </div>
  )
}
