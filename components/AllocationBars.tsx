import { formatPct } from '@/lib/formatters'
import type { Allocation } from '@/lib/types'

// OW/UW: overweight = current > target, underweight = current < target.
// Orange for OW (attention — position is running ahead of target).
// Muted for UW (informational — position is below target).
function gapLabel(gap: number | null): string {
  if (gap === null || gap === 0) return ''
  return gap > 0 ? 'OW' : 'UW'
}

function gapColor(gap: number | null): string {
  if (gap === null || gap === 0) return 'var(--text-dim)'
  return gap > 0 ? 'var(--orange)' : 'var(--text-muted)'
}

interface AllocationBarProps {
  allocation: Allocation
}

function AllocationBar({ allocation }: AllocationBarProps) {
  const { key, label, currentPct, targetPct, gap, color } = allocation

  // Bar fill is capped at 100% — currentPct can exceed 100% if the position
  // is massively overweight (e.g. BTC goes from 60% target to 80% actual).
  const fillPct = currentPct !== null ? Math.min(currentPct, 100) : 0

  // Target tick: capped at 100% so it stays inside the track.
  const tickPct = Math.min(targetPct, 100)

  const label_ = gapLabel(gap)
  const color_ = gapColor(gap)

  return (
    <div data-testid={`allocation-bar-${key}`} style={{ marginBottom: 14 }}>
      {/* Labels row */}
      <div
        style={{
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'baseline',
          marginBottom:    5,
        }}
      >
        {/* Left: asset label + OW/UW badge */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span className="mono" style={{ fontSize: 12, color: 'var(--text)' }}>
            {label}
          </span>
          <span
            data-testid={`allocation-gap-label-${key}`}
            className="mono"
            style={{ fontSize: 11, color: color_ }}
          >
            {label_}
          </span>
        </div>

        {/* Right: current% / target% */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span
            data-testid={`allocation-current-${key}`}
            className="mono"
            style={{ fontSize: 12, color: currentPct !== null ? 'var(--text)' : 'var(--text-muted)' }}
          >
            {currentPct !== null ? formatPct(currentPct) : '—'}
          </span>
          <span className="mono" style={{ fontSize: 11, color: 'var(--text-dim)' }}>
            / {targetPct}%
          </span>
        </div>
      </div>

      {/* Bar track — contains fill and target tick, both absolutely positioned */}
      <div
        data-testid={`allocation-track-${key}`}
        style={{
          position:   'relative',
          background: 'var(--surface2)',
          borderRadius: 2,
          height:       6,
        }}
      >
        {/* Fill */}
        <div
          data-testid={`allocation-fill-${key}`}
          style={{
            position:     'absolute',
            left:          0,
            top:           0,
            width:        `${fillPct}%`,
            height:       '100%',
            background:    color,
            borderRadius:  2,
          }}
        />

        {/* Target tick — a 2px vertical marker showing where the target sits */}
        {targetPct > 0 && (
          <div
            data-testid={`allocation-tick-${key}`}
            style={{
              position:  'absolute',
              left:      `${tickPct}%`,
              top:        0,
              width:      2,
              height:    '100%',
              background: 'var(--border2)',
              transform: 'translateX(-50%)',
            }}
          />
        )}
      </div>
    </div>
  )
}

interface AllocationBarsProps {
  allocations: Allocation[]
}

export function AllocationBars({ allocations }: AllocationBarsProps) {
  return (
    <div className="panel" data-testid="allocation-bars">
      <div className="panel-title">ALLOCATION</div>
      {allocations.map(a => (
        <AllocationBar key={a.key} allocation={a} />
      ))}
    </div>
  )
}
