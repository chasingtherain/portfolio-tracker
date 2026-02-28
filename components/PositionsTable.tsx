import { formatCurrency, formatPct, formatPnl, formatPnlPct, maskValue } from '@/lib/formatters'
import type { Position } from '@/lib/types'

// P&L is null for dry powder (no cost basis on cash) — shown as '—' in muted colour.
// P&L is null for priceUnavailable positions too, but those rows are flagged separately.
function pnlColor(pnl: number | null): string {
  if (pnl === null || pnl === 0) return 'var(--text-muted)'
  return pnl > 0 ? 'var(--green)' : 'var(--red)'
}

// Arrow in a separate aria-hidden span so getByText() on the formatted value still matches.
function pnlArrow(pnl: number | null): string | null {
  if (pnl === null || pnl === 0) return null
  return pnl > 0 ? '↑' : '↓'
}

const TH_STYLE: React.CSSProperties = {
  fontFamily:    'var(--mono)',
  fontSize:       11,
  fontWeight:     500,
  letterSpacing: '0.06em',
  color:         'var(--text-dim)',
  paddingBottom:  10,
}

interface PositionsTableProps {
  positions:  Position[]
  isPrivate:  boolean
}

export function PositionsTable({ positions, isPrivate }: PositionsTableProps) {
  const priv = (s: string) => isPrivate ? maskValue(s) : s
  return (
    <div className="panel" data-testid="positions-table">
      <div className="panel-title">POSITIONS</div>

      <div className="table-scroll">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...TH_STYLE, textAlign: 'left'  }}>ASSET</th>
            <th style={{ ...TH_STYLE, textAlign: 'right' }}>VALUE</th>
            <th style={{ ...TH_STYLE, textAlign: 'right' }}>ALLOC</th>
            <th style={{ ...TH_STYLE, textAlign: 'right' }}>P&amp;L</th>
            <th style={{ ...TH_STYLE, textAlign: 'right' }}>P&amp;L%</th>
          </tr>
        </thead>

        <tbody>
          {positions.map((pos) => {
            const color = pnlColor(pos.pnl)

            const arrow = pnlArrow(pos.pnl)

            return (
              <tr
                key={pos.ticker}
                data-testid={`position-row-${pos.ticker}`}
                style={{ borderTop: '1px solid var(--border)' }}
              >
                {/* Asset name + ticker stacked */}
                <td style={{ padding: '10px 0' }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{pos.label}</div>
                  <div
                    className="mono"
                    style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}
                  >
                    {pos.ticker}
                  </div>
                </td>

                {/* Value — ⚠ icon when price is unavailable; muted to keep eye on P&L */}
                <td
                  className="mono"
                  style={{ textAlign: 'right', fontSize: 14, color: 'var(--text-muted)', padding: '10px 0 10px 12px', verticalAlign: 'middle' }}
                >
                  {pos.priceUnavailable ? (
                    <span>
                      <span
                        data-testid={`position-unavailable-${pos.ticker}`}
                        aria-label="Price unavailable"
                        style={{ color: 'var(--yellow)' }}
                      >
                        ⚠
                      </span>
                      {' —'}
                    </span>
                  ) : (
                    priv(formatCurrency(pos.value))
                  )}
                </td>

                {/* Alloc% */}
                <td
                  className="mono"
                  style={{ textAlign: 'right', fontSize: 14, color: 'var(--text-muted)', padding: '10px 0 10px 12px', verticalAlign: 'middle' }}
                >
                  {pos.priceUnavailable ? '—' : formatPct(pos.allocPct)}
                </td>

                {/* P&L dollar — bold + larger, arrow for non-colour accessibility */}
                <td
                  className="mono"
                  style={{ textAlign: 'right', fontSize: 15, fontWeight: 700, color, padding: '10px 0 10px 12px', verticalAlign: 'middle' }}
                >
                  {arrow && <span aria-hidden="true" style={{ marginRight: 2 }}>{arrow}</span>}
                  <span>{priv(formatPnl(pos.pnl))}</span>
                </td>

                {/* P&L percent — bold + larger, arrow for non-colour accessibility */}
                <td
                  className="mono"
                  style={{ textAlign: 'right', fontSize: 15, fontWeight: 700, color, padding: '10px 0 10px 12px', verticalAlign: 'middle' }}
                >
                  {arrow && <span aria-hidden="true" style={{ marginRight: 2 }}>{arrow}</span>}
                  <span>{priv(formatPnlPct(pos.pnlPct))}</span>
                </td>
              </tr>
            )
          })}
        </tbody>
        </table>
      </div>
    </div>
  )
}
