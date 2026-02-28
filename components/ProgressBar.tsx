import { formatCurrency, formatPct, maskValue } from '@/lib/formatters'

interface ProgressBarProps {
  totalValue:   number
  target:       number
  progressPct:  number
  gapToTarget:  number
  isPrivate:    boolean
  onDoubleClick: () => void
}

export function ProgressBar({ totalValue, target, progressPct, gapToTarget, isPrivate, onDoubleClick }: ProgressBarProps) {
  // Bar width is capped at 100% — calcProgressToTarget already caps it,
  // but the component is defensive in case raw values are passed directly.
  const barWidthPct = Math.min(progressPct, 100)

  const gapDisplay =
    gapToTarget > 0
      ? '+' + formatCurrency(gapToTarget)
      : formatCurrency(gapToTarget)

  const gapColor = gapToTarget >= 0 ? 'var(--green)' : 'var(--text-muted)'

  const priv = (s: string) => isPrivate ? maskValue(s) : s

  return (
    <div
      className="panel"
      data-testid="progress-bar-container"
      onDoubleClick={onDoubleClick}
      style={{ userSelect: 'none' }}
    >
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
          {priv(formatCurrency(totalValue))}
        </span>
        <span className="mono text-muted" style={{ fontSize: 13 }}>
          of {priv(formatCurrency(target))}
        </span>
        <span data-testid="progress-pct" className="mono" style={{ fontSize: 14, color: 'var(--orange)' }}>
          {priv(formatPct(progressPct))}
        </span>
      </div>

      {/* Gap to target */}
      <div style={{ marginTop: 4 }}>
        <span
          data-testid="progress-gap"
          className="mono text-muted"
          style={{ fontSize: 12, color: gapColor }}
        >
          {priv(gapDisplay)} to target
        </span>
      </div>
    </div>
  )
}
