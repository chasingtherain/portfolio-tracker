import { calcProceedsSplit } from '@/lib/calculations'
import type { BtcPriceZone } from '@/lib/types'

// Zone order must match the BtcPriceZone progression from low to high.
// Using calcProceedsSplit to determine the active zone keeps boundary
// definitions in one place — if thresholds change in calculations.ts,
// PhaseIndicator automatically reflects them.

interface ZoneDefinition {
  zone:  BtcPriceZone
  label: string
  range: string
}

const ZONES: ZoneDefinition[] = [
  { zone: 'below_150k',  label: 'ACCUMULATE', range: '< $150K'       },
  { zone: '150k_250k',   label: 'DISTRIBUTE', range: '$150K–$250K'   },
  { zone: '250k_350k',   label: 'REDUCE',     range: '$250K–$350K'   },
  { zone: 'above_350k',  label: 'EXIT',        range: '> $350K'       },
]

type SegmentState = 'completed' | 'active' | 'future' | 'unknown'

function segmentStyle(state: SegmentState): React.CSSProperties {
  switch (state) {
    case 'active':
      return { background: 'var(--orange)', color: '#000', borderColor: 'var(--orange)' }
    case 'completed':
      return { background: 'var(--surface2)', color: 'var(--text-muted)', borderColor: 'var(--border)' }
    case 'future':
    case 'unknown':
      return { background: 'transparent', color: 'var(--text-dim)', borderColor: 'var(--border)' }
  }
}

interface PhaseIndicatorProps {
  btcPrice: number | null
}

export function PhaseIndicator({ btcPrice }: PhaseIndicatorProps) {
  const activeZone: BtcPriceZone | null =
    btcPrice !== null ? calcProceedsSplit(btcPrice).zone : null

  const activeIndex = activeZone !== null
    ? ZONES.findIndex(z => z.zone === activeZone)
    : -1

  return (
    <div
      data-testid="phase-indicator"
      style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}
    >
      {ZONES.map((z, i) => {
        const state: SegmentState =
          activeIndex === -1  ? 'unknown'   :
          i < activeIndex     ? 'completed' :
          i === activeIndex   ? 'active'    :
                                'future'

        return (
          <div
            key={z.zone}
            data-testid={`phase-segment-${z.zone}`}
            data-state={state}
            style={{
              border:       '1px solid',
              borderRadius: 8,
              padding:      '10px 12px',
              textAlign:    'center',
              ...segmentStyle(state),
            }}
          >
            <div
              className="mono"
              style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em' }}
            >
              {z.label}
            </div>
            <div
              className="mono"
              style={{ fontSize: 10, marginTop: 4, opacity: 0.7 }}
            >
              {z.range}
            </div>
          </div>
        )
      })}
    </div>
  )
}
