'use client'

import { useState, useEffect } from 'react'
import type { ClientHoldings } from '@/lib/types'

type AssetKey = 'btc' | 'mstr' | 'near' | 'uni' | 'link' | 'ondo' | 'eth'

interface AssetForm {
  qty:       string
  costBasis: string
}

interface FormState {
  assets:    Record<AssetKey, AssetForm>
  dryPowder: string
  nupl:      string
  password:  string
}

const ASSETS: { key: AssetKey; label: string }[] = [
  { key: 'btc',  label: 'BTC'  },
  { key: 'mstr', label: 'MSTR' },
  { key: 'near', label: 'NEAR' },
  { key: 'uni',  label: 'UNI'  },
  { key: 'link', label: 'LINK' },
  { key: 'ondo', label: 'ONDO' },
  { key: 'eth',  label: 'ETH'  },
]

function emptyAsset(): AssetForm {
  return { qty: '', costBasis: '' }
}

function defaultForm(): FormState {
  return {
    assets: {
      btc:  emptyAsset(),
      mstr: emptyAsset(),
      near: emptyAsset(),
      uni:  emptyAsset(),
      link: emptyAsset(),
      ondo: emptyAsset(),
      eth:  emptyAsset(),
    },
    dryPowder: '',
    nupl:      '',
    password:  '',
  }
}

const INPUT: React.CSSProperties = {
  background:   'var(--surface2)',
  border:       '1px solid var(--border)',
  borderRadius:  4,
  color:         'var(--text)',
  fontFamily:    'var(--mono)',
  fontSize:      12,
  padding:       '5px 8px',
  width:         '100%',
  outline:       'none',
}

const TH: React.CSSProperties = {
  fontFamily:    'var(--mono)',
  fontSize:       10,
  fontWeight:     500,
  letterSpacing: '0.06em',
  color:         'var(--text-dim)',
  paddingBottom:  8,
  textAlign:     'right',
}

interface EditHoldingsPanelProps {
  onHoldingsSaved: () => void
}

export function EditHoldingsPanel({ onHoldingsSaved }: EditHoldingsPanelProps) {
  const [isOpen,   setIsOpen]   = useState(false)
  const [form,     setForm]     = useState<FormState>(defaultForm())
  const [isSaving, setIsSaving] = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  // Pre-populate qty fields from KV on mount.
  // costBasis is server-side only and never returned — user enters it manually.
  // password is not in the response — user enters it once and it persists in state.
  useEffect(() => {
    fetch('/api/holdings')
      .then((r) => r.json())
      .then((data: ClientHoldings) => {
        setForm((prev) => ({
          ...prev,
          assets: {
            btc:  { ...prev.assets.btc,  qty: String(data.btc.qty)  },
            mstr: { ...prev.assets.mstr, qty: String(data.mstr.qty) },
            near: { ...prev.assets.near, qty: String(data.near.qty) },
            uni:  { ...prev.assets.uni,  qty: String(data.uni.qty)  },
            link: { ...prev.assets.link, qty: String(data.link.qty) },
            ondo: { ...prev.assets.ondo, qty: String(data.ondo.qty) },
            eth:  { ...prev.assets.eth,  qty: String(data.eth.qty)  },
          },
          dryPowder: String(data.dryPowder),
          nupl:      String(data.nupl),
          // password not touched — it's not in the API response
        }))
      })
      .catch(() => {})
  }, [])

  function updateAsset(key: AssetKey, field: keyof AssetForm, value: string) {
    setForm((prev) => ({
      ...prev,
      assets: {
        ...prev.assets,
        [key]: { ...prev.assets[key], [field]: value },
      },
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSaving(true)
    setError(null)

    const body = {
      password:  form.password,
      btc:       { qty: parseFloat(form.assets.btc.qty),  costBasis: parseFloat(form.assets.btc.costBasis)  },
      mstr:      { qty: parseFloat(form.assets.mstr.qty), costBasis: parseFloat(form.assets.mstr.costBasis) },
      near:      { qty: parseFloat(form.assets.near.qty), costBasis: parseFloat(form.assets.near.costBasis) },
      uni:       { qty: parseFloat(form.assets.uni.qty),  costBasis: parseFloat(form.assets.uni.costBasis)  },
      link:      { qty: parseFloat(form.assets.link.qty), costBasis: parseFloat(form.assets.link.costBasis) },
      ondo:      { qty: parseFloat(form.assets.ondo.qty), costBasis: parseFloat(form.assets.ondo.costBasis) },
      eth:       { qty: parseFloat(form.assets.eth.qty),  costBasis: parseFloat(form.assets.eth.costBasis)  },
      dryPowder: parseFloat(form.dryPowder),
      nupl:      parseFloat(form.nupl),
    }

    try {
      const res = await fetch('/api/holdings', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })

      if (!res.ok) {
        const text = await res.text()
        setError(text || 'Save failed')
        return
      }

      onHoldingsSaved()
    } catch {
      setError('Connection error — save failed')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="panel" data-testid="edit-holdings-panel">
      {/* Collapsible header */}
      <div
        style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          cursor:         'pointer',
          // Remove panel-title bottom margin when open (form provides its own spacing)
          marginBottom:   isOpen ? 16 : 0,
        }}
        onClick={() => setIsOpen((v) => !v)}
      >
        <div className="panel-title" style={{ marginBottom: 0 }}>EDIT HOLDINGS</div>
        <button
          data-testid="edit-holdings-toggle"
          type="button"
          aria-label={isOpen ? 'Collapse holdings editor' : 'Expand holdings editor'}
          aria-expanded={isOpen}
          style={{
            background:   'transparent',
            border:       'none',
            color:        'var(--text-muted)',
            fontFamily:   'var(--mono)',
            fontSize:     14,
            cursor:       'pointer',
            padding:      '0 4px',
            lineHeight:    1,
          }}
        >
          {isOpen ? '▴' : '▾'}
        </button>
      </div>

      {/* Form — stays mounted when collapsed so password is retained in state.
          CSS display:none hides it visually without unmounting. */}
      <div
        data-testid="edit-holdings-content"
        style={{ display: isOpen ? 'block' : 'none' }}
      >
        <form onSubmit={handleSubmit}>
          {/* Asset rows */}
          <div className="table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
            <thead>
              <tr>
                <th style={{ ...TH, textAlign: 'left', width: '20%' }}>ASSET</th>
                <th style={{ ...TH, width: '40%' }}>QTY</th>
                <th style={{ ...TH, width: '40%' }}>AVG COST</th>
              </tr>
            </thead>
            <tbody>
              {ASSETS.map(({ key, label }) => (
                <tr key={key} style={{ borderTop: '1px solid var(--border)' }}>
                  <td
                    className="mono"
                    style={{ padding: '6px 0', fontSize: 12, color: 'var(--text-muted)' }}
                  >
                    {label}
                  </td>
                  <td style={{ padding: '6px 0 6px 8px' }}>
                    <input
                      data-testid={`input-${key}-qty`}
                      type="number"
                      step="any"
                      min="0"
                      value={form.assets[key].qty}
                      onChange={(e) => updateAsset(key, 'qty', e.target.value)}
                      placeholder="0"
                      style={INPUT}
                    />
                  </td>
                  <td style={{ padding: '6px 0 6px 8px' }}>
                    <input
                      data-testid={`input-${key}-cost`}
                      type="number"
                      step="any"
                      min="0"
                      value={form.assets[key].costBasis}
                      onChange={(e) => updateAsset(key, 'costBasis', e.target.value)}
                      placeholder="0.00"
                      style={INPUT}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {/* Non-asset fields */}
          <div className="grid-fields-2">
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span className="mono" style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.06em' }}>
                DRY POWDER ($)
              </span>
              <input
                data-testid="input-dry-powder"
                type="number"
                step="any"
                min="0"
                value={form.dryPowder}
                onChange={(e) => setForm((prev) => ({ ...prev, dryPowder: e.target.value }))}
                placeholder="0"
                style={INPUT}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span className="mono" style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.06em' }}>
                NUPL (0–1)
              </span>
              <input
                data-testid="input-nupl"
                type="number"
                step="0.01"
                value={form.nupl}
                onChange={(e) => setForm((prev) => ({ ...prev, nupl: e.target.value }))}
                placeholder="0.55"
                style={INPUT}
              />
            </label>
          </div>

          {/* Password + submit row */}
          <div
            style={{
              display:      'flex',
              gap:           8,
              alignItems:   'flex-end',
              paddingTop:    12,
              borderTop:    '1px solid var(--border2)',
            }}
          >
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 auto' }}>
              <span className="mono" style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.06em' }}>
                PASSWORD
              </span>
              <input
                data-testid="input-password"
                type="password"
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="••••••"
                style={INPUT}
                autoComplete="current-password"
              />
            </label>

            <button
              data-testid="edit-holdings-save"
              type="submit"
              disabled={isSaving}
              style={{
                background:    isSaving ? 'var(--surface2)' : 'var(--orange)',
                border:        'none',
                borderRadius:   4,
                color:          isSaving ? 'var(--text-dim)' : '#000',
                fontFamily:    'var(--mono)',
                fontSize:       12,
                fontWeight:     500,
                letterSpacing: '0.06em',
                padding:       '7px 14px',
                cursor:         isSaving ? 'default' : 'pointer',
                whiteSpace:    'nowrap',
                flexShrink:     0,
              }}
            >
              {isSaving ? 'SAVING…' : 'SAVE'}
            </button>
          </div>

          {/* Inline error message */}
          {error && (
            <div
              data-testid="edit-holdings-error"
              className="mono"
              style={{
                marginTop:  10,
                fontSize:   12,
                color:      'var(--red)',
                lineHeight: 1.4,
              }}
            >
              {error}
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
