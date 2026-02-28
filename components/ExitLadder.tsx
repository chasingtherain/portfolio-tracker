import { Fragment } from 'react'
import { formatCurrency, formatPct } from '@/lib/formatters'
import type { ProceedsSplit } from '@/lib/types'

// Hardcoded exit tranches — strategic constants, not user-configurable data.
// T1–T5 referenced in trigger conditions (evalFearGreed, evalNupl, evalBtcPriceZone).
// The exit ladder activates above $200K per evalBtcPriceZone.
const TRANCHES = [
  { label: 'T1', price: 150_000, sellPct: 10 },
  { label: 'T2', price: 200_000, sellPct: 20 },
  { label: 'T3', price: 250_000, sellPct: 30 },
  { label: 'T4', price: 300_000, sellPct: 25 },
  { label: 'T5', price: 350_000, sellPct: 15 },
] as const

const TH: React.CSSProperties = {
  fontFamily:    'var(--mono)',
  fontSize:       10,
  fontWeight:     500,
  letterSpacing: '0.06em',
  color:         'var(--text-dim)',
  paddingBottom:  8,
  textAlign:     'left',
}

interface ExitLadderProps {
  btcPrice: number | null
  proceedsSplit: ProceedsSplit
}

export function ExitLadder({ btcPrice, proceedsSplit }: ExitLadderProps) {
  return (
    <div className="panel" data-testid="exit-ladder">
      <div className="panel-title">EXIT LADDER</div>

      <div className="table-scroll">
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
        <thead>
          <tr>
            <th style={TH}> </th>
            <th style={TH}>TARGET</th>
            <th style={{ ...TH, textAlign: 'right' }}>SELL</th>
            <th style={{ ...TH, textAlign: 'right' }}>DISTANCE</th>
          </tr>
        </thead>

        <tbody>
          {TRANCHES.map((tranche) => {
            const hit = btcPrice !== null && btcPrice >= tranche.price
            // Distance = how far BTC must rise to hit this tranche.
            // Only computed when not yet hit and price is available.
            const distance = (!hit && btcPrice !== null)
              ? ((tranche.price - btcPrice) / btcPrice) * 100
              : null
            const dollarDistance = (!hit && btcPrice !== null)
              ? tranche.price - btcPrice
              : null
            const progress = btcPrice !== null
              ? Math.min(btcPrice / tranche.price, 1)
              : 0

            return (
              <Fragment key={tranche.label}>
                <tr
                  data-testid={`tranche-row-${tranche.label}`}
                  style={{ borderTop: '1px solid var(--border)' }}
                >
                  {/* Tranche label */}
                  <td
                    className="mono"
                    style={{ padding: '8px 0', fontSize: 10, color: 'var(--text-dim)', width: 24 }}
                  >
                    {tranche.label}
                  </td>

                  {/* Price target */}
                  <td
                    className="mono"
                    style={{ padding: '8px 0', fontSize: 13, color: 'var(--text)' }}
                  >
                    {formatCurrency(tranche.price)}
                  </td>

                  {/* Sell % */}
                  <td
                    className="mono"
                    style={{ textAlign: 'right', padding: '8px 0 8px 8px', fontSize: 13, color: 'var(--text-muted)' }}
                  >
                    {formatPct(tranche.sellPct)}
                  </td>

                  {/* Distance or ✓ HIT */}
                  <td
                    className="mono"
                    style={{ textAlign: 'right', padding: '8px 0 8px 8px', fontSize: 13 }}
                  >
                    {hit ? (
                      <span
                        data-testid={`tranche-hit-${tranche.label}`}
                        style={{ color: 'var(--green)' }}
                      >
                        ✓ HIT
                      </span>
                    ) : (
                      <span
                        data-testid={`tranche-dist-${tranche.label}`}
                        style={{ color: distance !== null ? 'var(--text-muted)' : 'var(--text-dim)' }}
                      >
                        {formatPct(distance, true)}
                      </span>
                    )}
                  </td>
                </tr>

                {/* Progress bar row — spans all columns */}
                <tr>
                  <td colSpan={4} style={{ paddingBottom: 6 }}>
                    <div style={{
                      position:     'relative',
                      height:        4,
                      borderRadius:  2,
                      background:   'var(--surface2)',
                      overflow:     'hidden',
                    }}>
                      <div style={{
                        position:   'absolute',
                        left:        0,
                        top:         0,
                        height:     '100%',
                        width:      `${progress * 100}%`,
                        background:  hit ? 'var(--green)' : 'var(--orange)',
                        borderRadius: 2,
                      }} />
                    </div>
                    {dollarDistance !== null && (
                      <div className="mono" style={{ fontSize: 10, color: 'var(--text-dim)', textAlign: 'right', marginTop: 2 }}>
                        {formatCurrency(dollarDistance)} away
                      </div>
                    )}
                  </td>
                </tr>
              </Fragment>
            )
          })}
        </tbody>
        </table>
      </div>

      {/* Proceeds split — current BTC zone → cash/BTC reinvestment split */}
      <div
        data-testid="proceeds-split"
        style={{ borderTop: '1px solid var(--border2)', paddingTop: 12 }}
      >
        <div className="panel-title" style={{ marginBottom: 8 }}>PROCEEDS SPLIT</div>

        <div
          className="mono"
          style={{ fontSize: 10, letterSpacing: '0.06em', color: 'var(--text-dim)', marginBottom: 8 }}
        >
          {proceedsSplit.zoneLabel}
        </div>

        <div style={{ display: 'flex', gap: 20 }}>
          <div>
            <span
              data-testid="proceeds-cash-pct"
              className="mono"
              style={{ fontSize: 20, fontWeight: 500, color: 'var(--text-muted)' }}
            >
              {formatPct(proceedsSplit.cashPct)}
            </span>
            <span
              className="mono"
              style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 5, letterSpacing: '0.06em' }}
            >
              CASH
            </span>
          </div>

          <div>
            <span
              data-testid="proceeds-btc-pct"
              className="mono"
              style={{ fontSize: 20, fontWeight: 500, color: 'var(--orange)' }}
            >
              {formatPct(proceedsSplit.btcPct)}
            </span>
            <span
              className="mono"
              style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 5, letterSpacing: '0.06em' }}
            >
              BTC
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
