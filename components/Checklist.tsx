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
  const [checked,       setChecked]       = useState<boolean[]>(Array(ITEMS.length).fill(false))
  const [showCompleted, setShowCompleted] = useState(false)

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

  // Partition into pending and completed, preserving original indices.
  const pendingIndices   = ITEMS.map((_, i) => i).filter((i) => !checked[i])
  const completedIndices = ITEMS.map((_, i) => i).filter((i) =>  checked[i])

  function renderItem(i: number, isFirst: boolean) {
    const isChecked = checked[i]
    return (
      <label
        key={i}
        data-testid={`checklist-item-${i}`}
        style={{
          display:    'flex',
          alignItems: 'center',
          gap:        10,
          padding:    '9px 0',
          cursor:     'pointer',
          borderTop:  isFirst ? undefined : '1px solid var(--border)',
          userSelect: 'none',
          opacity:    isChecked ? 0.5 : 1,
        }}
      >
        {/*
          Native checkbox is hidden but stays in the DOM so data-testid queries
          and .toBeChecked() assertions in tests remain valid unchanged.
        */}
        <input
          type="checkbox"
          data-testid={`checklist-checkbox-${i}`}
          checked={isChecked}
          onChange={() => toggle(i)}
          style={{
            position: 'absolute',
            opacity:  0,
            width:    0,
            height:   0,
            margin:   0,
            padding:  0,
          }}
        />
        {/* Visible icon — filled box when checked, outline when unchecked */}
        <span
          aria-hidden="true"
          style={{
            fontSize:   15,
            lineHeight: 1,
            flexShrink: 0,
            color:      isChecked ? 'var(--green)' : 'var(--text-muted)',
          }}
        >
          {isChecked ? '☑' : '☐'}
        </span>
        <span
          style={{
            fontSize:       13,
            color:          isChecked ? 'var(--text-dim)' : 'var(--text)',
            textDecoration: isChecked ? 'line-through' : 'none',
            lineHeight:     1.4,
          }}
        >
          {ITEMS[i]}
        </span>
      </label>
    )
  }

  return (
    <div className="panel" data-testid="checklist">
      <div className="panel-title">
        CHECKLIST — {doneCount} / {ITEMS.length}
      </div>

      {/* Pending items — always visible */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {pendingIndices.map((i, pos) => renderItem(i, pos === 0))}
      </div>

      {/* Completed section — collapsed by default, toggled on demand */}
      {completedIndices.length > 0 && (
        <div>
          <button
            onClick={() => setShowCompleted((v) => !v)}
            style={{
              display:       'flex',
              alignItems:    'center',
              gap:           6,
              width:         '100%',
              background:    'none',
              border:        'none',
              borderTop:     pendingIndices.length > 0 ? '1px solid var(--border)' : undefined,
              padding:       '9px 0',
              cursor:        'pointer',
              color:         'var(--text-muted)',
              fontSize:      11,
              fontFamily:    'var(--mono)',
              letterSpacing: '0.05em',
              textAlign:     'left',
            }}
          >
            <span style={{ fontSize: 9 }}>{showCompleted ? '▼' : '▶'}</span>
            COMPLETED ({completedIndices.length})
          </button>

          {/*
            Completed items use display:none rather than conditional rendering
            so data-testid queries always find them regardless of collapse state.
          */}
          <div style={{ display: showCompleted ? 'flex' : 'none', flexDirection: 'column' }}>
            {completedIndices.map((i, pos) => renderItem(i, pos === 0))}
          </div>
        </div>
      )}
    </div>
  )
}
