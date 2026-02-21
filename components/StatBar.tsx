import { formatCurrency } from '@/lib/formatters'

interface StatBarProps {
  totalValue: number
  gapToTarget: number
  btcPrice:   number | null
  fearGreed:  number | null
}

// Color thresholds match evalFearGreed in calculations.ts exactly —
// the stat bar and trigger monitor must agree on what "danger" looks like.
function fearGreedColor(value: number): string {
  if (value >= 80) return 'var(--red)'
  if (value >= 65) return 'var(--orange)'
  if (value >= 50) return 'var(--yellow)'
  return 'var(--green)'
}

// Maps the numerical severity to a string for test assertions
function fearGreedSeverity(value: number): string {
  if (value >= 80) return 'fired'
  if (value >= 65) return 'near'
  if (value >= 50) return 'caution'
  return 'watch'
}

interface CardProps {
  label: string
  children: React.ReactNode
}

function StatCard({ label, children }: CardProps) {
  return (
    <div
      className="panel"
      style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      <div className="panel-title">{label}</div>
      {children}
    </div>
  )
}

export function StatBar({ totalValue, gapToTarget, btcPrice, fearGreed }: StatBarProps) {
  // Gap display: add explicit + for values above target (formatCurrency only adds – for negatives)
  const gapDisplay =
    gapToTarget > 0
      ? '+' + formatCurrency(gapToTarget)
      : formatCurrency(gapToTarget)

  const gapColor = gapToTarget >= 0 ? 'var(--green)' : 'var(--red)'

  return (
    <div
      data-testid="stat-bar"
      style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}
    >
      {/* Total portfolio value */}
      <StatCard label="TOTAL VALUE">
        <span
          data-testid="stat-total-value"
          className="mono"
          style={{ fontSize: 21, fontWeight: 500, color: 'var(--text)' }}
        >
          {formatCurrency(totalValue)}
        </span>
      </StatCard>

      {/* Distance to target */}
      <StatCard label="VS TARGET">
        <span
          data-testid="stat-gap"
          className="mono"
          style={{ fontSize: 21, fontWeight: 500, color: gapColor }}
        >
          {gapDisplay}
        </span>
      </StatCard>

      {/* BTC price */}
      <StatCard label="BTC">
        <span
          data-testid="stat-btc-price"
          className="mono"
          style={{ fontSize: 21, fontWeight: 500, color: 'var(--orange)' }}
        >
          {formatCurrency(btcPrice)}
        </span>
      </StatCard>

      {/* Fear & Greed index — colour-coded by value */}
      <StatCard label="FEAR & GREED">
        <span
          data-testid="stat-fear-greed"
          data-severity={fearGreed !== null ? fearGreedSeverity(fearGreed) : 'unknown'}
          className="mono"
          style={{
            fontSize:   20,
            fontWeight: 500,
            color:      fearGreed !== null ? fearGreedColor(fearGreed) : 'var(--text-muted)',
          }}
        >
          {fearGreed ?? '—'}
        </span>
      </StatCard>
    </div>
  )
}
