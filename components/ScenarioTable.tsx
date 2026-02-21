import { formatCurrency, formatPnl } from '@/lib/formatters'

const PORTFOLIO_TARGET = 1_000_000

// Hardcoded projections based on demo-data holdings, scaled linearly by BTC price.
// Target row = first scenario where estimated portfolio crosses PORTFOLIO_TARGET.
// These are planning estimates — they don't update with live holdings.
const SCENARIOS = [
  { btcPrice: 100_000, portfolioEst:   472_000, isTarget: false },
  { btcPrice: 150_000, portfolioEst:   709_000, isTarget: false },
  { btcPrice: 200_000, portfolioEst:   945_000, isTarget: false },
  { btcPrice: 250_000, portfolioEst: 1_182_000, isTarget: true  },
  { btcPrice: 350_000, portfolioEst: 1_655_000, isTarget: false },
] as const

const TH: React.CSSProperties = {
  fontFamily:    'var(--mono)',
  fontSize:       10,
  fontWeight:     500,
  letterSpacing: '0.06em',
  color:         'var(--text-dim)',
  paddingBottom:  8,
  textAlign:     'right',
}

export function ScenarioTable() {
  return (
    <div className="panel" data-testid="scenario-table">
      <div className="panel-title">SCENARIO PROJECTIONS</div>

      <div className="table-scroll">
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...TH, textAlign: 'left' }}>BTC PRICE</th>
            <th style={TH}>PORTFOLIO</th>
            <th style={TH}>vs $1M</th>
          </tr>
        </thead>

        <tbody>
          {SCENARIOS.map((row) => {
            const vsTarget = row.portfolioEst - PORTFOLIO_TARGET
            const vsColor = vsTarget >= 0 ? 'var(--green)' : 'var(--red)'

            return (
              <tr
                key={row.btcPrice}
                data-testid={`scenario-row-${row.btcPrice}`}
                data-target={row.isTarget ? 'true' : undefined}
                style={{
                  borderTop:   '1px solid var(--border)',
                  borderLeft:  row.isTarget ? '3px solid var(--orange)' : '3px solid transparent',
                  background:  row.isTarget ? 'rgba(249, 115, 22, 0.06)' : undefined,
                }}
              >
                {/* BTC price scenario */}
                <td
                  className="mono"
                  style={{
                    padding:    '9px 0 9px 8px',
                    fontSize:   13,
                    color:      row.isTarget ? 'var(--orange)' : 'var(--text)',
                    fontWeight: row.isTarget ? 500 : undefined,
                  }}
                >
                  {formatCurrency(row.btcPrice)}
                </td>

                {/* Estimated portfolio value */}
                <td
                  className="mono"
                  style={{
                    textAlign:  'right',
                    padding:    '9px 0 9px 8px',
                    fontSize:   13,
                    color:      row.isTarget ? 'var(--orange)' : 'var(--text)',
                    fontWeight: row.isTarget ? 500 : undefined,
                  }}
                >
                  {formatCurrency(row.portfolioEst)}
                </td>

                {/* Gap vs $1M target */}
                <td
                  className="mono"
                  style={{
                    textAlign: 'right',
                    padding:   '9px 0 9px 8px',
                    fontSize:  13,
                    color:     vsColor,
                  }}
                >
                  {formatPnl(vsTarget)}
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
