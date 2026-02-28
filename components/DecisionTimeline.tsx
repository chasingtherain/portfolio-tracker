'use client'

import { useState, useEffect, useCallback } from 'react'
import type { DecisionEntry, Alignment } from '@/lib/decisions.types'
import { formatCurrency } from '@/lib/formatters'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(ms: number): string {
  const seconds = Math.floor((Date.now() - ms) / 1000)
  if (seconds < 60)  return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60)  return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24)    return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function absoluteTime(ms: number): string {
  return new Date(ms).toLocaleString()
}

function deltaDisplay(before: number, after: number): string {
  const diff = after - before
  const sign = diff >= 0 ? '+' : '−'
  return `${sign}${formatCurrency(Math.abs(diff))}`
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const ACTION_COLORS: Record<string, string> = {
  buy:       'var(--green)',
  sell:      'var(--red)',
  rebalance: 'var(--text-muted)',
}

const ALIGNMENT_COLORS: Record<Alignment, string> = {
  aligned:    'var(--green)',
  misaligned: 'var(--red)',
  neutral:    'var(--text-muted)',
}

function Badge({
  label,
  color,
}: {
  label: string
  color: string
}) {
  return (
    <span
      className="mono"
      style={{
        fontSize:      10,
        fontWeight:    500,
        letterSpacing: '0.08em',
        color,
        border:        `1px solid ${color}`,
        borderRadius:  3,
        padding:       '1px 5px',
      }}
    >
      {label}
    </span>
  )
}

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
      <span style={{ color: 'var(--text-dim)', fontFamily: 'var(--mono)', fontSize: 11 }}>{label}</span>
      <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--mono)', fontSize: 11 }}>{value}</span>
    </div>
  )
}

function DecisionCard({ entry, onNotesChange }: {
  entry:          DecisionEntry
  onNotesChange:  (id: string, notes: string) => void
}) {
  const [expanded, setExpanded]   = useState(false)
  const [notes,    setNotes]      = useState(entry.notes ?? '')
  const [saving,   setSaving]     = useState(false)

  async function handleNotesBlur() {
    if (notes === (entry.notes ?? '')) return  // no change
    setSaving(true)
    try {
      const res = await fetch(`/api/decisions/${entry.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ notes }),
      })
      if (res.ok) onNotesChange(entry.id, notes)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{
        background:   'var(--surface)',
        border:       '1px solid var(--border)',
        borderRadius:  8,
        padding:       16,
        display:      'flex',
        flexDirection: 'column',
        gap:           10,
      }}
    >
      {/* Top row: timestamp + badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span
          className="mono"
          title={absoluteTime(entry.timestamp)}
          style={{ fontSize: 11, color: 'var(--text-dim)', cursor: 'help' }}
        >
          {relativeTime(entry.timestamp)}
        </span>
        <Badge label={entry.action.toUpperCase()} color={ACTION_COLORS[entry.action]} />
        <Badge
          label={entry.alignment.toUpperCase()}
          color={ALIGNMENT_COLORS[entry.alignment]}
        />
      </div>

      {/* Asset + delta */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span className="mono" style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>
          {entry.asset}
        </span>
        <span
          className="mono"
          style={{
            fontSize: 13,
            color:    entry.amountAfter >= entry.amountBefore ? 'var(--green)' : 'var(--red)',
          }}
        >
          {deltaDisplay(entry.amountBefore, entry.amountAfter)}
        </span>
      </div>

      {/* Alignment reason */}
      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)' }}>
        {entry.alignmentReason}
      </div>

      {/* Expandable market snapshot */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        style={{
          background:    'transparent',
          border:        'none',
          color:         'var(--text-dim)',
          fontFamily:    'var(--mono)',
          fontSize:      10,
          letterSpacing: '0.06em',
          cursor:        'pointer',
          padding:        0,
          textAlign:     'left',
        }}
      >
        {expanded ? '▴ HIDE SNAPSHOT' : '▾ SHOW SNAPSHOT'}
      </button>

      {expanded && (
        <div
          style={{
            background:   'var(--surface2)',
            borderRadius:  4,
            padding:      '10px 12px',
            display:      'flex',
            flexDirection: 'column',
            gap:            6,
          }}
        >
          <SnapshotRow label="BTC PRICE"     value={`$${entry.snapshot.btcPrice.toLocaleString()}`} />
          <SnapshotRow label="FEAR & GREED"  value={String(entry.snapshot.fearGreed)} />
          <SnapshotRow label="BTC DOMINANCE" value={`${entry.snapshot.btcDominance.toFixed(1)}%`} />
          <SnapshotRow label="NUPL"          value={entry.snapshot.nupl.toFixed(2)} />
          <SnapshotRow label="STAGE"         value={entry.snapshot.positionStage.toUpperCase()} />
          <SnapshotRow label="ZONE"          value={entry.snapshot.btcPriceZone} />
          {entry.snapshot.activeTriggers.length > 0 && (
            <SnapshotRow
              label="ACTIVE TRIGGERS"
              value={entry.snapshot.activeTriggers.join(', ')}
            />
          )}
        </div>
      )}

      {/* Inline notes editor */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span className="mono" style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.06em' }}>
          {saving ? 'SAVING…' : 'NOTES'}
        </span>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          onBlur={handleNotesBlur}
          placeholder="Add context for this decision…"
          rows={2}
          style={{
            background:  'var(--surface2)',
            border:      '1px solid var(--border)',
            borderRadius: 4,
            color:       'var(--text)',
            fontFamily:  'var(--mono)',
            fontSize:     12,
            padding:     '6px 8px',
            resize:      'vertical',
            outline:     'none',
            width:       '100%',
            boxSizing:   'border-box',
          }}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Filters bar
// ---------------------------------------------------------------------------

type DateRange = '30d' | '90d' | 'all'

const ASSETS = ['ALL', 'BTC', 'MSTR', 'NEAR', 'UNI', 'LINK', 'ONDO', 'ETH']
const ALIGNMENTS: { label: string; value: '' | Alignment }[] = [
  { label: 'All',        value: '' },
  { label: 'Aligned',    value: 'aligned' },
  { label: 'Misaligned', value: 'misaligned' },
  { label: 'Neutral',    value: 'neutral' },
]

const SELECT: React.CSSProperties = {
  background:   'var(--surface2)',
  border:       '1px solid var(--border)',
  borderRadius:  4,
  color:        'var(--text)',
  fontFamily:   'var(--mono)',
  fontSize:      11,
  padding:      '4px 8px',
  outline:      'none',
  cursor:       'pointer',
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function DecisionTimeline({ mode }: { mode: 'live' | 'demo' }) {
  const [entries,   setEntries]   = useState<DecisionEntry[]>([])
  const [total,     setTotal]     = useState(0)
  const [page,      setPage]      = useState(0)
  const [loading,   setLoading]   = useState(true)

  const [asset,     setAsset]     = useState('ALL')
  const [alignment, setAlignment] = useState<'' | Alignment>('')
  const [dateRange, setDateRange] = useState<DateRange>('all')

  const PAGE_SIZE = 20

  const fetchEntries = useCallback(async (pageIndex: number) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit:  String(PAGE_SIZE),
        offset: String(pageIndex * PAGE_SIZE),
      })
      if (asset !== 'ALL')   params.set('asset', asset)
      if (alignment)         params.set('alignment', alignment)
      if (dateRange !== 'all') {
        const days = dateRange === '30d' ? 30 : 90
        params.set('from', String(Date.now() - days * 86_400_000))
      }

      const res  = await fetch(`/api/decisions?${params}`)
      const data = await res.json() as { entries: DecisionEntry[]; total: number }
      setEntries(data.entries)
      setTotal(data.total)
    } catch {
      // leave stale data visible
    } finally {
      setLoading(false)
    }
  }, [asset, alignment, dateRange])

  // Refetch whenever filters change, reset to page 0
  useEffect(() => {
    setPage(0)
    fetchEntries(0)
  }, [fetchEntries])

  // Refetch when page changes (but not on filter change — that already resets page)
  useEffect(() => {
    if (page > 0) fetchEntries(page)
  }, [page, fetchEntries])

  function handleNotesChange(id: string, notes: string) {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, notes } : e))
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  // Hidden in demo mode — no KV, no decisions to show
  if (mode === 'demo') return null

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="panel-title">DECISION JOURNAL</div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={asset} onChange={e => setAsset(e.target.value)} style={SELECT}>
          {ASSETS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        <select
          value={alignment}
          onChange={e => setAlignment(e.target.value as '' | Alignment)}
          style={SELECT}
        >
          {ALIGNMENTS.map(({ label, value }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        <select
          value={dateRange}
          onChange={e => setDateRange(e.target.value as DateRange)}
          style={SELECT}
        >
          <option value="all">All time</option>
          <option value="30d">Last 30d</option>
          <option value="90d">Last 90d</option>
        </select>

        <span className="mono" style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 'auto' }}>
          {total} {total === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      {/* Entry list */}
      {loading && entries.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: 100, borderRadius: 8 }} />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="mono" style={{ fontSize: 12, color: 'var(--text-dim)', padding: '24px 0', textAlign: 'center' }}>
          No decisions recorded yet. Holdings changes are logged automatically.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {entries.map(entry => (
            <DecisionCard key={entry.id} entry={entry} onNotesChange={handleNotesChange} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
            style={{
              ...SELECT,
              opacity: page === 0 ? 0.4 : 1,
              cursor:  page === 0 ? 'default' : 'pointer',
            }}
          >
            ← PREV
          </button>
          <span className="mono" style={{ fontSize: 11, color: 'var(--text-dim)' }}>
            {page + 1} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
            style={{
              ...SELECT,
              opacity: page >= totalPages - 1 ? 0.4 : 1,
              cursor:  page >= totalPages - 1 ? 'default' : 'pointer',
            }}
          >
            NEXT →
          </button>
        </div>
      )}
    </div>
  )
}
