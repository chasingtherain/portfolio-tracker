import type { TriggerState, TriggerSeverity } from '@/lib/types'

// Severity → accent colour (value text + left border)
function severityColor(s: TriggerSeverity): string {
  switch (s) {
    case 'fired': return 'var(--orange)'
    case 'near':  return 'var(--yellow)'
    case 'warn':  return 'var(--red)'
    case 'watch': return 'var(--text-muted)'
  }
}

// Dimmer version of severity colour for the left-border accent
function severityBorderColor(s: TriggerSeverity): string {
  switch (s) {
    case 'fired': return 'var(--orange-dim)'
    case 'near':  return 'var(--yellow-dim)'
    case 'warn':  return 'var(--red-dim)'
    case 'watch': return 'var(--border)'
  }
}

// Derive a slug for data-testid from the trigger label
// e.g. "FEAR & GREED" → "fear-greed", "BTC PRICE ZONE" → "btc-price-zone"
function labelSlug(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '')
}

interface TriggerMonitorProps {
  triggers: TriggerState[]
}

export function TriggerMonitor({ triggers }: TriggerMonitorProps) {
  return (
    <div className="panel" data-testid="trigger-monitor">
      <div className="panel-title">TRIGGER MONITOR</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {triggers.map((trigger) => {
          const color = severityColor(trigger.severity)
          const border = severityBorderColor(trigger.severity)
          const slug = labelSlug(trigger.label)

          return (
            <div
              key={trigger.label}
              data-testid={`trigger-card-${slug}`}
              data-severity={trigger.severity}
              style={{
                borderLeft: `3px solid ${border}`,
                paddingLeft: 10,
                paddingTop: 6,
                paddingBottom: 6,
              }}
            >
              {/* Label row + value */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: 2,
                }}
              >
                <span
                  className="mono"
                  style={{ fontSize: 10, letterSpacing: '0.07em', color: 'var(--text-dim)' }}
                >
                  {trigger.label}
                </span>
                <span
                  className="mono"
                  style={{ fontSize: 16, fontWeight: 500, color }}
                >
                  {trigger.value}
                </span>
              </div>

              {/* Status line */}
              <div
                className="mono"
                style={{ fontSize: 10, letterSpacing: '0.04em', color, marginBottom: 3 }}
              >
                {trigger.status}
              </div>

              {/* Condition (smallest, dimmest) */}
              <div style={{ fontSize: 10, color: 'var(--text-dim)', lineHeight: 1.4 }}>
                {trigger.condition}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
