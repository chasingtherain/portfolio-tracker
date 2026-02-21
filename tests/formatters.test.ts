import { describe, it, expect } from 'vitest'
import {
  formatCurrency,
  formatPct,
  formatQty,
  formatPnl,
  formatPnlPct,
} from '@/lib/formatters'

describe('formatCurrency', () => {
  it('returns — for null', () => {
    expect(formatCurrency(null)).toBe('—')
  })

  it('formats large values with 0 decimal places and commas', () => {
    expect(formatCurrency(258121)).toBe('$258,121')
    expect(formatCurrency(1500000)).toBe('$1,500,000')
    expect(formatCurrency(1000)).toBe('$1,000')
  })

  it('formats values $1–$999 with 2 decimal places', () => {
    expect(formatCurrency(8.69)).toBe('$8.69')
    expect(formatCurrency(999.99)).toBe('$999.99')
    expect(formatCurrency(1)).toBe('$1.00')
  })

  it('formats values under $1 with 4 decimal places', () => {
    expect(formatCurrency(0.2714)).toBe('$0.2714')
    expect(formatCurrency(0.0001)).toBe('$0.0001')
  })

  it('uses en dash for negative values', () => {
    expect(formatCurrency(-500)).toBe('–$500.00')
    expect(formatCurrency(-1500000)).toBe('–$1,500,000')
  })
})

describe('formatPct', () => {
  it('returns — for null', () => {
    expect(formatPct(null)).toBe('—')
  })

  it('formats to 1 decimal place', () => {
    expect(formatPct(63.2)).toBe('63.2%')
    expect(formatPct(58.4)).toBe('58.4%')
  })

  it('shows + prefix when showSign is true and value is positive', () => {
    expect(formatPct(21.3, true)).toBe('+21.3%')
    expect(formatPct(7.0, true)).toBe('+7.0%')
  })

  it('does not show + prefix when showSign is false (default)', () => {
    expect(formatPct(21.3)).toBe('21.3%')
  })

  it('uses en dash for negative values', () => {
    expect(formatPct(-2.0, true)).toBe('–2.0%')
    expect(formatPct(-74.1)).toBe('–74.1%')
  })

  it('formats zero without sign', () => {
    expect(formatPct(0, true)).toBe('0.0%')
  })
})

describe('formatQty', () => {
  it('returns — for null', () => {
    expect(formatQty(null, 'BTC')).toBe('—')
    expect(formatQty(null, 'UNI')).toBe('—')
  })

  it('formats BTC with 4 decimal places always', () => {
    expect(formatQty(3.1421, 'BTC')).toBe('3.1421 BTC')
    expect(formatQty(1, 'BTC')).toBe('1.0000 BTC')
    expect(formatQty(0.5, 'BTC')).toBe('0.5000 BTC')
  })

  it('formats token quantities ≥ 1 with 0 decimal places and commas', () => {
    expect(formatQty(2400, 'UNI')).toBe('2,400 UNI')
    expect(formatQty(10960, 'NEAR')).toBe('10,960 NEAR')
    expect(formatQty(1, 'LINK')).toBe('1 LINK')
  })

  it('formats token quantities < 1 with 4 decimal places', () => {
    expect(formatQty(0.37, 'ETH')).toBe('0.3700 ETH')
    expect(formatQty(0.1234, 'ETH')).toBe('0.1234 ETH')
  })
})

describe('formatPnl', () => {
  it('returns — for null', () => {
    expect(formatPnl(null)).toBe('—')
  })

  it('shows + prefix for positive P&L', () => {
    expect(formatPnl(80656)).toBe('+$80,656')
    expect(formatPnl(8.69)).toBe('+$8.69')
    expect(formatPnl(0.27)).toBe('+$0.2700')
  })

  it('uses en dash for negative P&L', () => {
    expect(formatPnl(-9325)).toBe('–$9,325')
    expect(formatPnl(-8.69)).toBe('–$8.69')
  })

  it('shows no sign for zero', () => {
    expect(formatPnl(0)).toBe('$0.0000')
  })
})

describe('formatPnlPct', () => {
  it('returns — for null', () => {
    expect(formatPnlPct(null)).toBe('—')
  })

  it('shows + prefix for positive percentage', () => {
    expect(formatPnlPct(63.2)).toBe('+63.2%')
    expect(formatPnlPct(100)).toBe('+100.0%')
  })

  it('uses en dash for negative percentage', () => {
    expect(formatPnlPct(-74.1)).toBe('–74.1%')
    expect(formatPnlPct(-18.3)).toBe('–18.3%')
  })

  it('shows no sign for zero', () => {
    expect(formatPnlPct(0)).toBe('0.0%')
  })
})
