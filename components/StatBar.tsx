import { formatCurrency, maskValue } from '@/lib/formatters'
import { AdherenceScoreCard } from './AdherenceScoreCard'

interface StatBarProps {
  totalValue:  number
  gapToTarget: number
  btcPrice:    number | null
  fearGreed:   number | null
  isPrivate:   boolean
}

// Color thresholds match evalFearGreed in calculations.ts exactly —
// the stat bar and trigger monitor must agree on what "danger" looks like.
function fearGreedColor(value: number): string {
  if (value >= 80) return 'var(--red)'
  if (value >= 65) return 'var(--orange)'
  if (value >= 50) return 'var(--yellow)'
  return 'var(--green)'
}

// Zone dot colour — five bands, independent from the alert thresholds above.
function fearGreedZoneDotColor(value: number): string {
  if (value <= 25) return 'var(--red)'
  if (value <= 45) return 'var(--orange)'
  if (value <= 55) return 'var(--text-dim)'
  if (value <= 75) return 'var(--yellow)'
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

export function StatBar({ totalValue, gapToTarget, btcPrice, fearGreed, isPrivate }: StatBarProps) {
  // Gap display: add explicit + for values above target (formatCurrency only adds – for negatives)
  const gapDisplay =
    gapToTarget > 0
      ? '+' + formatCurrency(gapToTarget)
      : formatCurrency(gapToTarget)

  const gapColor = gapToTarget >= 0 ? 'var(--green)' : 'var(--red)'

  const priv = (s: string) => isPrivate ? maskValue(s) : s

  return (
    <div
      data-testid="stat-bar"
      className="grid-stat-bar"
    >
      {/* Total portfolio value — dominant hero number */}
      <StatCard label="TOTAL VALUE">
        <span
          data-testid="stat-total-value"
          className="mono"
          style={{ fontSize: 34, fontWeight: 600, color: 'var(--text)' }}
        >
          {priv(formatCurrency(totalValue))}
        </span>
      </StatCard>

      {/* Distance to target */}
      <StatCard label="VS TARGET">
        <span
          data-testid="stat-gap"
          className="mono"
          style={{ fontSize: 21, fontWeight: 500, color: gapColor }}
        >
          {priv(gapDisplay)}
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

      {/* Fear & Greed index — colour-coded by value, zone dot replaces emoji */}
      <StatCard label="FEAR & GREED">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {fearGreed !== null && (
            <span style={{
              display:      'inline-block',
              width:         8,
              height:        8,
              borderRadius: '50%',
              background:    fearGreedZoneDotColor(fearGreed),
              flexShrink:    0,
            }} />
          )}
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
        </div>
      </StatCard>

      {/* Strategy adherence score — fetches independently from /api/decisions/score */}
      <AdherenceScoreCard />
    </div>
  )
}
