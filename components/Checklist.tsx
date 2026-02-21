'use client'

import { useState, useEffect } from 'react'

// 8 items ordered to match the review cycle:
// items 1-4 map to the 4 trigger states, items 5-8 are portfolio management checks.
// This order is intentional — reviewers should read triggers first, then act.
const ITEMS = [
  'Check Fear & Greed index',
  'Check BTC dominance trend',
  'Review NUPL reading',
  'Check BTC price zone',
  'Review allocation vs targets',
  'Review exit ladder levels',
  'Check dry powder reserve',
  'Verify scenario projection',
]

interface ChecklistProps {
  mode: 'demo' | 'live'
  // Changes when holdings are saved — triggers re-fetch in live mode.
  // In live mode, a holdings save resets the KV checklist server-side.
  // Changing savedAt causes the effect to re-fire and pull the reset state.
  savedAt: number
}

export function Checklist({ mode, savedAt }: ChecklistProps) {
  const [checked, setChecked] = useState<boolean[]>(Array(ITEMS.length).fill(false))

  // Live mode: load from KV on mount, and re-load when savedAt changes
  // (holdings save triggers server-side resetChecklist → we re-fetch the cleared state)
  // Demo mode: local React state only — never hits the API
  useEffect(() => {
    if (mode !== 'live') return
    fetch('/api/checklist')
      .then((r) => r.json())
      .then((data: boolean[]) => setChecked(data))
      .catch(() => {}) // errors deferred to Phase 10
  }, [mode, savedAt])

  async function toggle(index: number) {
    const next = checked.map((v, i) => (i === index ? !v : v))
    setChecked(next)

    // Persist to KV in live mode — fire-and-forget (no await, errors deferred)
    if (mode === 'live') {
      fetch('/api/checklist', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      }).catch(() => {})
    }
  }

  const doneCount = checked.filter(Boolean).length

  return (
    <div className="panel" data-testid="checklist">
      <div className="panel-title">
        CHECKLIST — {doneCount} / {ITEMS.length}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {ITEMS.map((item, i) => (
          <label
            key={i}
            data-testid={`checklist-item-${i}`}
            style={{
              display:    'flex',
              alignItems: 'center',
              gap:        10,
              padding:    '9px 0',
              cursor:     'pointer',
              borderTop:  i > 0 ? '1px solid var(--border)' : undefined,
              userSelect: 'none',
            }}
          >
            <input
              type="checkbox"
              data-testid={`checklist-checkbox-${i}`}
              checked={checked[i]}
              onChange={() => toggle(i)}
              style={{ accentColor: 'var(--green)', width: 14, height: 14, flexShrink: 0 }}
            />
            <span
              style={{
                fontSize:       13,
                color:          checked[i] ? 'var(--text-dim)' : 'var(--text)',
                textDecoration: checked[i] ? 'line-through' : 'none',
                lineHeight:     1.4,
              }}
            >
              {item}
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}
