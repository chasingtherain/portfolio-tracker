/**
 * All number formatting for the UI lives here.
 * Every function returns '—' when passed null.
 * Never format numbers inline in components — always import from here.
 */

// Currency formatting thresholds
// ≥ $1,000  → $258,121   (0 dp, comma-separated)
// $1–$999   → $8.69      (2 dp)
// < $1      → $0.2714    (4 dp)
function formatAbsCurrency(abs: number): string {
  if (abs >= 1000) return '$' + Math.round(abs).toLocaleString('en-US')
  if (abs >= 1)    return '$' + abs.toFixed(2)
  return '$' + abs.toFixed(4)
}

/** Price or value — always non-negative in practice. Handles negative for safety. */
export function formatCurrency(n: number | null): string {
  if (n === null) return '—'
  const abs = Math.abs(n)
  const formatted = formatAbsCurrency(abs)
  return n < 0 ? '–' + formatted : formatted
}

/**
 * General percentage — 1 decimal place.
 * showSign: prepend '+' for positive values (use for allocation gaps etc.)
 * Always uses en dash for negatives.
 */
export function formatPct(n: number | null, showSign = false): string {
  if (n === null) return '—'
  const abs = Math.abs(n).toFixed(1) + '%'
  if (n < 0) return '–' + abs
  if (showSign && n > 0) return '+' + abs
  return abs
}

/**
 * Token quantity.
 * BTC:       always 4 decimal places  e.g. 3.1421 BTC
 * token ≥ 1: 0 decimal places, comma  e.g. 2,400 UNI
 * token < 1: 4 decimal places          e.g. 0.3700 ETH
 */
export function formatQty(n: number | null, ticker: string): string {
  if (n === null) return '—'
  let qty: string
  if (ticker === 'BTC') {
    qty = n.toFixed(4)
  } else if (n >= 1) {
    qty = Math.round(n).toLocaleString('en-US')
  } else {
    qty = n.toFixed(4)
  }
  return `${qty} ${ticker}`
}

/**
 * P&L dollar value — always shows sign.
 * +$80,656 for profit, –$9,325 for loss.
 * Uses same currency precision rules as formatCurrency.
 */
export function formatPnl(n: number | null): string {
  if (n === null) return '—'
  const abs = Math.abs(n)
  const formatted = formatAbsCurrency(abs)
  if (n < 0) return '–' + formatted
  if (n > 0) return '+' + formatted
  return formatted
}

/**
 * P&L percentage — always shows sign.
 * +63.2% for profit, –74.1% for loss.
 * Uses en dash for negatives (not hyphen).
 */
export function formatPnlPct(n: number | null): string {
  if (n === null) return '—'
  const abs = Math.abs(n).toFixed(1) + '%'
  if (n < 0) return '–' + abs
  if (n > 0) return '+' + abs
  return abs
}

/**
 * Privacy masking — replaces every digit with a bullet character.
 * Non-numeric characters ($, commas, %, dashes, —) are preserved so the
 * layout width stays stable and the value type remains legible.
 * '—' passes through unchanged (no digits to replace).
 */
export function maskValue(formatted: string): string {
  return formatted.replace(/\d/g, '*')
}
