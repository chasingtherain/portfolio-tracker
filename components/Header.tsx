'use client'

// Header needs 'use client' for the refresh button's onClick handler.

const STALE_THRESHOLD_MS = 10 * 60 * 1000 // 10 minutes

/**
 * Formats an ISO timestamp to HH:MM (local time) for display.
 * Using a controlled format (not toLocaleTimeString) so test assertions
 * can make exact string checks regardless of locale.
 */
function formatTime(isoString: string): string {
  const d = new Date(isoString)
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}

interface HeaderProps {
  /** ISO timestamp of the last price fetch — null on initial load before first response */
  fetchedAt: string | null
  onRefresh: () => void
  isRefreshing: boolean
}

export function Header({ fetchedAt, onRefresh, isRefreshing }: HeaderProps) {
  // Stale detection: computed at render time — no interval needed since users
  // manually trigger refreshes and the Header re-renders on each data update.
  const isStale =
    fetchedAt !== null &&
    Date.now() - new Date(fetchedAt).getTime() > STALE_THRESHOLD_MS

  return (
    <header
      style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        padding:        '12px 0',
        borderBottom:   '1px solid var(--border)',
        marginBottom:   '16px',
      }}
    >
      {/* Left: title + timestamp */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
        <h1
          className="mono"
          style={{ fontSize: 15, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--orange)' }}
        >
          PORTFOLIO
        </h1>

        {fetchedAt && (
          <span
            data-testid="timestamp"
            className={`mono ${isStale ? 'text-yellow' : 'text-muted'}`}
            style={{ fontSize: 13 }}
          >
            {isStale && (
              <span data-testid="stale-indicator" aria-label="Stale data">
                ⚠{' '}
              </span>
            )}
            {formatTime(fetchedAt)}
          </span>
        )}
      </div>

      {/* Right: refresh button */}
      <button
        onClick={onRefresh}
        disabled={isRefreshing}
        aria-label="Refresh data"
        style={{
          background:   'transparent',
          border:       '1px solid var(--border)',
          color:        isRefreshing ? 'var(--text-dim)' : 'var(--text-muted)',
          fontFamily:   'var(--mono)',
          fontSize:     17,
          padding:      '4px 10px',
          borderRadius: 4,
          cursor:       isRefreshing ? 'default' : 'pointer',
          lineHeight:   1,
        }}
      >
        <span
          className={isRefreshing ? 'spinning' : ''}
          style={{ display: 'inline-block' }}
          aria-hidden
        >
          ↻
        </span>
      </button>
    </header>
  )
}
