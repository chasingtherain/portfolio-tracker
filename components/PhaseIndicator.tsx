'use client'

import { useState } from 'react'
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
  { zone: 'below_150k',  label: 'ACCUMULATE', range: '< $150K'     },
  { zone: '150k_250k',   label: 'DISTRIBUTE', range: '$150K–$250K' },
  { zone: '250k_350k',   label: 'REDUCE',     range: '$250K–$350K' },
  { zone: 'above_350k',  label: 'EXIT',       range: '> $350K'     },
]

const ZONE_DESCRIPTIONS: Record<BtcPriceZone, string> = {
  below_150k:  'BTC is below $150K — well below cycle peak\nterritory. Strategy: accumulate positions.\nBuying here is fully aligned with the plan.',
  '150k_250k': 'BTC is in price discovery ($150K–$250K).\nStrategy: take profits, shift toward cash.\nNo new buys — purchases here are flagged\nMISALIGNED.',
  '250k_350k': 'BTC is approaching the Pi Cycle Top signal\n($250K–$350K). Historically the final bull\nphase. Strategy: actively cut position sizes.\nBuying here is a strategy violation.',
  above_350k:  'BTC is above $350K — within striking distance\nof the predicted cycle top. Strategy: exit\ncrypto positions entirely, hold cash only.\nAny buying here is maximally misaligned.',
}

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
  const [hoveredZone, setHoveredZone] = useState<BtcPriceZone | null>(null)

  const activeZone: BtcPriceZone | null =
    btcPrice !== null ? calcProceedsSplit(btcPrice).zone : null

  const activeIndex = activeZone !== null
    ? ZONES.findIndex(z => z.zone === activeZone)
    : -1

  return (
    <div data-testid="phase-indicator">
      <div className="panel-title" style={{ marginBottom: 12 }}>BTC PRICE ZONE</div>
      <div className="grid-phase-segments">
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
              position:     'relative',
              border:       '1px solid',
              borderRadius: 8,
              padding:      '10px 12px',
              textAlign:    'center',
              cursor:       'default',
              ...segmentStyle(state),
            }}
            onMouseEnter={() => setHoveredZone(z.zone)}
            onMouseLeave={() => setHoveredZone(null)}
          >
            <div
              className="mono"
              style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em' }}
            >
              {z.label}
            </div>
            <div
              className="mono"
              style={{ fontSize: 11, marginTop: 4, opacity: 0.7 }}
            >
              {z.range}
            </div>

            {hoveredZone === z.zone && (
              <div style={{
                position:   'absolute',
                top:        'calc(100% + 8px)',
                left:       '50%',
                transform:  'translateX(-50%)',
                zIndex:     200,
                background: 'var(--surface)',
                border:     '1px solid var(--border)',
                borderRadius: 6,
                padding:    '10px 12px',
                width:      220,
                fontFamily: 'var(--mono)',
                fontSize:   13,
                color:      'var(--text)',
                lineHeight: 1.7,
                whiteSpace: 'pre-line',
                boxShadow:  '0 4px 16px rgba(0,0,0,0.4)',
                pointerEvents: 'none',
                textAlign:  'left',
              }}>
                {ZONE_DESCRIPTIONS[z.zone]}
              </div>
            )}
          </div>
        )
      })}
      </div>
    </div>
  )
}
