import { formatCurrency, formatPct, formatPnl, formatPnlPct } from '@/lib/formatters'
import type { Position } from '@/lib/types'

// P&L is null for dry powder (no cost basis on cash) — shown as '—' in muted colour.
// P&L is null for priceUnavailable positions too, but those rows are flagged separately.
function pnlColor(pnl: number | null): string {
  if (pnl === null || pnl === 0) return 'var(--text-muted)'
  return pnl > 0 ? 'var(--green)' : 'var(--red)'
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
  positions: Position[]
}

export function PositionsTable({ positions }: PositionsTableProps) {
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

            return (
              <tr
                key={pos.ticker}
                data-testid={`position-row-${pos.ticker}`}
                style={{ borderTop: '1px solid var(--border)' }}
              >
                {/* Asset name + ticker stacked */}
                <td style={{ padding: '10px 0' }}>
                  <div style={{ fontSize: 14, color: 'var(--text)' }}>{pos.label}</div>
                  <div
                    className="mono"
                    style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}
                  >
                    {pos.ticker}
                  </div>
                </td>

                {/* Value — ⚠ icon when price is unavailable */}
                <td
                  className="mono"
                  style={{ textAlign: 'right', fontSize: 14, padding: '10px 0 10px 12px', verticalAlign: 'middle' }}
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
                    formatCurrency(pos.value)
                  )}
                </td>

                {/* Alloc% */}
                <td
                  className="mono"
                  style={{ textAlign: 'right', fontSize: 14, color: 'var(--text-muted)', padding: '10px 0 10px 12px', verticalAlign: 'middle' }}
                >
                  {pos.priceUnavailable ? '—' : formatPct(pos.allocPct)}
                </td>

                {/* P&L dollar */}
                <td
                  className="mono"
                  style={{ textAlign: 'right', fontSize: 14, color, padding: '10px 0 10px 12px', verticalAlign: 'middle' }}
                >
                  {formatPnl(pos.pnl)}
                </td>

                {/* P&L percent */}
                <td
                  className="mono"
                  style={{ textAlign: 'right', fontSize: 14, color, padding: '10px 0 10px 12px', verticalAlign: 'middle' }}
                >
                  {formatPnlPct(pos.pnlPct)}
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
