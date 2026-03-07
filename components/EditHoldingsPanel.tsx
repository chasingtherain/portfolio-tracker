'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import type { ClientHoldings } from '@/lib/types'

type AssetKey = 'btc' | 'mstr' | 'near' | 'uni' | 'link' | 'ondo'

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

function parseNumberInput(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === '') return 0
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

export function EditHoldingsPanel({ onHoldingsSaved }: EditHoldingsPanelProps) {
  const [isOpen,   setIsOpen]   = useState(false)
  const [form,     setForm]     = useState<FormState>(defaultForm())
  const [isSaving, setIsSaving] = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [success,  setSuccess]  = useState(false)
  const [decisionWarning, setDecisionWarning] = useState<string | null>(null)

  // Tracks the qty values last loaded from the server.
  // Used by logDecisions to detect which assets actually changed.
  const serverQty = useRef<Record<AssetKey, number>>({
    btc: 0, mstr: 0, near: 0, uni: 0, link: 0, ondo: 0,
  })

  const numericValidation = useMemo(() => {
    const qty: Record<AssetKey, boolean> = { btc: true, mstr: true, near: true, uni: true, link: true, ondo: true }
    const costBasis: Record<AssetKey, boolean> = { btc: true, mstr: true, near: true, uni: true, link: true, ondo: true }

    for (const { key } of ASSETS) {
      const qtyValue = parseNumberInput(form.assets[key].qty)
      qty[key] = qtyValue !== null && qtyValue >= 0

      const costValue = parseNumberInput(form.assets[key].costBasis)
      costBasis[key] = costValue !== null && costValue >= 0
    }

    const dryPowderValue = parseNumberInput(form.dryPowder)
    const nuplValue = parseNumberInput(form.nupl)

    const dryPowderValid = dryPowderValue !== null && dryPowderValue >= 0
    const nuplValid = nuplValue !== null
    const passwordValid = form.password.trim().length > 0

    const hasInvalidAsset = Object.values(qty).some(v => !v) || Object.values(costBasis).some(v => !v)
    const isValid = !hasInvalidAsset && dryPowderValid && nuplValid

    return {
      qty,
      costBasis,
      dryPowderValid,
      nuplValid,
      passwordValid,
      isValid,
    }
  }, [form])

  // Pre-populate qty fields from KV on mount.
  // costBasis is server-side only and never returned — user enters it manually.
  // password is not in the response — user enters it once and it persists in state.
  useEffect(() => {
    fetch('/api/holdings')
      .then((r) => r.json())
      .then((data: ClientHoldings) => {
        serverQty.current = {
          btc:  data.btc.qty,
          mstr: data.mstr.qty,
          near: data.near.qty,
          uni:  data.uni.qty,
          link: data.link.qty,
          ondo: data.ondo.qty,
        }
        setForm((prev) => ({
          ...prev,
          assets: {
            btc:  { ...prev.assets.btc,  qty: String(data.btc.qty)  },
            mstr: { ...prev.assets.mstr, qty: String(data.mstr.qty) },
            near: { ...prev.assets.near, qty: String(data.near.qty) },
            uni:  { ...prev.assets.uni,  qty: String(data.uni.qty)  },
            link: { ...prev.assets.link, qty: String(data.link.qty) },
            ondo: { ...prev.assets.ondo, qty: String(data.ondo.qty) },
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
    setError(null)
    setSuccess(false)
    setDecisionWarning(null)

    if (!numericValidation.passwordValid) {
      setError('Password is required')
      return
    }

    if (!numericValidation.isValid) {
      setError('Please fix highlighted fields before saving')
      return
    }

    setIsSaving(true)

    const holdingFields = {
      btc:       { qty: parseNumberInput(form.assets.btc.qty)!,  costBasis: parseNumberInput(form.assets.btc.costBasis)!  },
      mstr:      { qty: parseNumberInput(form.assets.mstr.qty)!, costBasis: parseNumberInput(form.assets.mstr.costBasis)! },
      near:      { qty: parseNumberInput(form.assets.near.qty)!, costBasis: parseNumberInput(form.assets.near.costBasis)! },
      uni:       { qty: parseNumberInput(form.assets.uni.qty)!,  costBasis: parseNumberInput(form.assets.uni.costBasis)!  },
      link:      { qty: parseNumberInput(form.assets.link.qty)!, costBasis: parseNumberInput(form.assets.link.costBasis)! },
      ondo:      { qty: parseNumberInput(form.assets.ondo.qty)!, costBasis: parseNumberInput(form.assets.ondo.costBasis)! },
      dryPowder: parseNumberInput(form.dryPowder)!,
      nupl:      parseNumberInput(form.nupl)!,
    }

    // Mobile sessions are two-step: get a one-time token first, then use it for the write.
    // This means a picked-up phone can't replay the submission after 5 minutes or after
    // one successful save — the token is consumed server-side on first use.
    // Desktop sends the password inline on every request, unchanged.
    const isMobile = window.innerWidth < 768

    try {
      if (isMobile) {
        // Step 1 — exchange password for a one-time session token
        const sessionRes = await fetch('/api/session', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ password: form.password }),
        })
        if (!sessionRes.ok) {
          const text = await sessionRes.text()
          setError(text || 'Authentication failed')
          return
        }
        const { token } = await sessionRes.json() as { token: string }

        // Step 2 — use token for the write (token is deleted server-side on use)
        const res = await fetch('/api/holdings', {
          method:  'PUT',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ token, ...holdingFields }),
        })
        if (!res.ok) {
          const text = await res.text()
          setError(text || 'Save failed')
          return
        }

        // Clear password after a successful mobile save — the token is consumed,
        // so retaining it in state offers no benefit.
        setForm((prev) => ({ ...prev, password: '' }))
      } else {
        // Desktop: single request with password inline
        const res = await fetch('/api/holdings', {
          method:  'PUT',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ password: form.password, ...holdingFields }),
        })
        if (!res.ok) {
          const text = await res.text()
          setError(text || 'Save failed')
          return
        }
      }

      // Log decisions before notifying the parent so DecisionTimeline refresh
      // sees newly written entries instead of racing ahead of this write.
      const decisionError = await logDecisions(holdingFields)
      serverQty.current = {
        btc: holdingFields.btc.qty,
        mstr: holdingFields.mstr.qty,
        near: holdingFields.near.qty,
        uni: holdingFields.uni.qty,
        link: holdingFields.link.qty,
        ondo: holdingFields.ondo.qty,
      }
      if (decisionError) {
        setDecisionWarning(`Holdings saved, but journal update failed: ${decisionError}`)
      }
      onHoldingsSaved()
      setSuccess(true)
    } catch {
      setError('Connection error — save failed')
    } finally {
      setIsSaving(false)
    }
  }

  async function logDecisions(saved: Record<AssetKey, { qty: number }>): Promise<string | null> {
    const assetKeys: AssetKey[] = ['btc', 'mstr', 'near', 'uni', 'link', 'ondo']

    const changed = assetKeys.filter((key) => {
      const priorQty = serverQty.current[key] || 0
      const newQty = saved[key].qty || 0
      return priorQty !== newQty
    })

    if (changed.length === 0) return null

    const results = await Promise.allSettled(
      changed.map(async (key) => {
        const priorQty = serverQty.current[key] || 0
        const newQty   = saved[key].qty || 0
        const action: 'buy' | 'sell' = newQty > priorQty ? 'buy' : 'sell'

        const res = await fetch('/api/decisions', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            asset:        key.toUpperCase(),
            action,
            amountBefore: priorQty,
            amountAfter:  newQty,
          }),
        })

        if (!res.ok) {
          const text = await res.text()
          throw new Error(text || `HTTP ${res.status}`)
        }
      })
    )

    const firstFailure = results.find(r => r.status === 'rejected')
    if (!firstFailure || firstFailure.status !== 'rejected') return null
    return firstFailure.reason instanceof Error
      ? firstFailure.reason.message
      : 'unknown error'
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
                      style={{
                        ...INPUT,
                        borderColor: numericValidation.qty[key] ? 'var(--border)' : 'var(--red)',
                      }}
                      aria-invalid={!numericValidation.qty[key]}
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
                      style={{
                        ...INPUT,
                        borderColor: numericValidation.costBasis[key] ? 'var(--border)' : 'var(--red)',
                      }}
                      aria-invalid={!numericValidation.costBasis[key]}
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
                style={{
                  ...INPUT,
                  borderColor: numericValidation.dryPowderValid ? 'var(--border)' : 'var(--red)',
                }}
                aria-invalid={!numericValidation.dryPowderValid}
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
                style={{
                  ...INPUT,
                  borderColor: numericValidation.nuplValid ? 'var(--border)' : 'var(--red)',
                }}
                aria-invalid={!numericValidation.nuplValid}
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
                style={{
                  ...INPUT,
                  borderColor: numericValidation.passwordValid ? 'var(--border)' : 'var(--red)',
                }}
                aria-invalid={!numericValidation.passwordValid}
                autoComplete="current-password"
              />
            </label>

            <button
              data-testid="edit-holdings-save"
              type="submit"
              disabled={isSaving || !numericValidation.isValid || !numericValidation.passwordValid}
              style={{
                background:    isSaving || !numericValidation.isValid || !numericValidation.passwordValid ? 'var(--surface2)' : 'var(--orange)',
                border:        'none',
                borderRadius:   4,
                color:          isSaving || !numericValidation.isValid || !numericValidation.passwordValid ? 'var(--text-dim)' : '#000',
                fontFamily:    'var(--mono)',
                fontSize:       12,
                fontWeight:     500,
                letterSpacing: '0.06em',
                padding:       '7px 14px',
                cursor:         isSaving || !numericValidation.isValid || !numericValidation.passwordValid ? 'default' : 'pointer',
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

          {success && (
            <div
              data-testid="edit-holdings-success"
              className="mono"
              style={{
                marginTop:  10,
                fontSize:   12,
                color:      'var(--green)',
                lineHeight: 1.4,
              }}
            >
              Holdings saved.
            </div>
          )}

          {decisionWarning && (
            <div
              data-testid="edit-holdings-warning"
              className="mono"
              style={{
                marginTop:  10,
                fontSize:   12,
                color:      'var(--orange)',
                lineHeight: 1.4,
              }}
            >
              {decisionWarning}
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
