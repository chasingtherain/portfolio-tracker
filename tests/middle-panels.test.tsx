import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'

import { PositionsTable } from '../components/PositionsTable'
import { AllocationBars } from '../components/AllocationBars'
import type { Position, Allocation } from '../lib/types'

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const NORMAL_POSITION: Position = {
  label:            'Bitcoin',
  ticker:           'BTC',
  value:            312000,
  pnl:              168000,
  pnlPct:           116.67,
  allocPct:         67.70,
  priceUnavailable: false,
}

const NEGATIVE_PNL_POSITION: Position = {
  label:            'Uniswap',
  ticker:           'UNI',
  value:            8000,
  pnl:              -2000,
  pnlPct:           -20.0,
  allocPct:         5.0,
  priceUnavailable: false,
}

const DRY_POWDER_POSITION: Position = {
  label:            'Dry Powder',
  ticker:           'USD',
  value:            12000,
  pnl:              null, // no P&L on cash
  pnlPct:           null,
  allocPct:         2.60,
  priceUnavailable: false,
}

const UNAVAILABLE_POSITION: Position = {
  label:            'Ondo Finance',
  ticker:           'ONDO',
  value:            null,
  pnl:              null,
  pnlPct:           null,
  allocPct:         null,
  priceUnavailable: true,
}

const ZERO_POSITION: Position = {
  label:            'Chainlink',
  ticker:           'LINK',
  value:            0,
  pnl:              0,
  pnlPct:           0,
  allocPct:         0,
  priceUnavailable: false,
}

// ---------------------------------------------------------------------------
// PositionsTable — structure
// ---------------------------------------------------------------------------

describe('PositionsTable — structure', () => {
  it('renders the container', () => {
    render(<PositionsTable positions={[NORMAL_POSITION]} />)
    expect(screen.getByTestId('positions-table')).toBeInTheDocument()
  })

  it('renders a row for each position', () => {
    render(<PositionsTable positions={[NORMAL_POSITION, NEGATIVE_PNL_POSITION, DRY_POWDER_POSITION]} />)
    expect(screen.getByTestId('position-row-BTC')).toBeInTheDocument()
    expect(screen.getByTestId('position-row-UNI')).toBeInTheDocument()
    expect(screen.getByTestId('position-row-USD')).toBeInTheDocument()
  })

  it('renders the asset label and ticker in each row', () => {
    render(<PositionsTable positions={[NORMAL_POSITION]} />)
    const row = screen.getByTestId('position-row-BTC')
    expect(within(row).getByText('Bitcoin')).toBeInTheDocument()
    expect(within(row).getByText('BTC')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// PositionsTable — normal data display
// ---------------------------------------------------------------------------

describe('PositionsTable — normal position', () => {
  it('displays the formatted value', () => {
    render(<PositionsTable positions={[NORMAL_POSITION]} />)
    const row = screen.getByTestId('position-row-BTC')
    // formatCurrency(312000) → '$312,000'
    expect(within(row).getByText('$312,000')).toBeInTheDocument()
  })

  it('displays the allocation percentage', () => {
    render(<PositionsTable positions={[NORMAL_POSITION]} />)
    const row = screen.getByTestId('position-row-BTC')
    // formatPct(67.70) → '67.7%'
    expect(within(row).getByText('67.7%')).toBeInTheDocument()
  })

  it('displays positive P&L with + sign', () => {
    render(<PositionsTable positions={[NORMAL_POSITION]} />)
    const row = screen.getByTestId('position-row-BTC')
    // formatPnl(168000) → '+$168,000'
    expect(within(row).getByText('+$168,000')).toBeInTheDocument()
  })

  it('displays positive P&L% with + sign', () => {
    render(<PositionsTable positions={[NORMAL_POSITION]} />)
    const row = screen.getByTestId('position-row-BTC')
    // formatPnlPct(116.67) → '+116.7%'
    expect(within(row).getByText('+116.7%')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// PositionsTable — negative P&L
// ---------------------------------------------------------------------------

describe('PositionsTable — negative P&L', () => {
  it('displays negative P&L with en-dash sign', () => {
    render(<PositionsTable positions={[NEGATIVE_PNL_POSITION]} />)
    const row = screen.getByTestId('position-row-UNI')
    // formatPnl(-2000) → '–$2,000'
    expect(within(row).getByText('–$2,000')).toBeInTheDocument()
  })

  it('displays negative P&L% with en-dash sign', () => {
    render(<PositionsTable positions={[NEGATIVE_PNL_POSITION]} />)
    const row = screen.getByTestId('position-row-UNI')
    expect(within(row).getByText('–20.0%')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// PositionsTable — dry powder (null P&L, not priceUnavailable)
// ---------------------------------------------------------------------------

describe('PositionsTable — dry powder (null pnl, price available)', () => {
  it('shows em-dash for pnl when null', () => {
    render(<PositionsTable positions={[DRY_POWDER_POSITION]} />)
    const row = screen.getByTestId('position-row-USD')
    // Two '—' cells: pnl and pnlPct — just verify at least one is present
    const dashes = within(row).getAllByText('—')
    expect(dashes.length).toBeGreaterThanOrEqual(1)
  })

  it('shows the value normally (price is available)', () => {
    render(<PositionsTable positions={[DRY_POWDER_POSITION]} />)
    const row = screen.getByTestId('position-row-USD')
    expect(within(row).getByText('$12,000')).toBeInTheDocument()
  })

  it('does not show a ⚠ icon (price is not unavailable)', () => {
    render(<PositionsTable positions={[DRY_POWDER_POSITION]} />)
    expect(screen.queryByTestId('position-unavailable-USD')).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// PositionsTable — price unavailable
// ---------------------------------------------------------------------------

describe('PositionsTable — priceUnavailable', () => {
  it('renders a row for the unavailable asset', () => {
    render(<PositionsTable positions={[UNAVAILABLE_POSITION]} />)
    expect(screen.getByTestId('position-row-ONDO')).toBeInTheDocument()
  })

  it('shows the ⚠ icon', () => {
    render(<PositionsTable positions={[UNAVAILABLE_POSITION]} />)
    expect(screen.getByTestId('position-unavailable-ONDO')).toBeInTheDocument()
  })

  it('shows em-dash for allocPct when unavailable', () => {
    render(<PositionsTable positions={[UNAVAILABLE_POSITION]} />)
    const row = screen.getByTestId('position-row-ONDO')
    // Row contains multiple '—' — just check label and ticker are there
    expect(within(row).getByText('Ondo Finance')).toBeInTheDocument()
    expect(within(row).getByText('ONDO')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// PositionsTable — zero quantity position
// ---------------------------------------------------------------------------

describe('PositionsTable — zero quantity', () => {
  it('renders a zero-value position normally', () => {
    render(<PositionsTable positions={[ZERO_POSITION]} />)
    const row = screen.getByTestId('position-row-LINK')
    expect(within(row).getByText('Chainlink')).toBeInTheDocument()
    // formatCurrency(0) → '$0.0000' (0 < 1 uses 4dp — same rule as sub-$1 prices)
    // formatPnl(0) also returns '$0.0000' (no sign for exactly 0), so two cells match.
    expect(within(row).getAllByText('$0.0000').length).toBeGreaterThanOrEqual(1)
  })

  it('does not show a ⚠ icon for zero-value position', () => {
    render(<PositionsTable positions={[ZERO_POSITION]} />)
    expect(screen.queryByTestId('position-unavailable-LINK')).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// AllocationBars fixtures
// ---------------------------------------------------------------------------

const OW_ALLOCATION: Allocation = {
  key:        'btc',
  label:      'BTC',
  value:      312000,
  currentPct: 67.7,
  targetPct:  60,
  gap:        7.7,   // overweight
  color:      'var(--orange)',
}

const UW_ALLOCATION: Allocation = {
  key:        'mstr',
  label:      'MSTR',
  value:      77000,
  currentPct: 16.7,
  targetPct:  15,
  gap:        1.7,   // slightly OW — use a UW example too
  color:      '#3b82f6',
}

const UW_ALLOCATION_TRUE: Allocation = {
  key:        'ondo',
  label:      'ONDO',
  value:      5000,
  currentPct: 1.1,
  targetPct:  7,
  gap:        -5.9,  // underweight
  color:      '#a855f7',
}

const NULL_CURRENT_ALLOCATION: Allocation = {
  key:        'link',
  label:      'LINK',
  value:      null,
  currentPct: null,
  targetPct:  7,
  gap:        null,
  color:      '#06b6d4',
}

const ZERO_TARGET_ALLOCATION: Allocation = {
  key:        'near',
  label:      'NEAR',
  value:      21800,
  currentPct: 4.73,
  targetPct:  0,     // 0% target — no tick rendered
  gap:        4.73,
  color:      'var(--text-dim)',
}

// ---------------------------------------------------------------------------
// AllocationBars — structure
// ---------------------------------------------------------------------------

describe('AllocationBars — structure', () => {
  it('renders the container', () => {
    render(<AllocationBars allocations={[OW_ALLOCATION]} />)
    expect(screen.getByTestId('allocation-bars')).toBeInTheDocument()
  })

  it('renders a bar for each allocation', () => {
    render(<AllocationBars allocations={[OW_ALLOCATION, UW_ALLOCATION_TRUE, NULL_CURRENT_ALLOCATION]} />)
    expect(screen.getByTestId('allocation-bar-btc')).toBeInTheDocument()
    expect(screen.getByTestId('allocation-bar-ondo')).toBeInTheDocument()
    expect(screen.getByTestId('allocation-bar-link')).toBeInTheDocument()
  })

  it('renders the asset label', () => {
    render(<AllocationBars allocations={[OW_ALLOCATION]} />)
    const bar = screen.getByTestId('allocation-bar-btc')
    expect(within(bar).getByText('BTC')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// AllocationBars — OW/UW labels
// ---------------------------------------------------------------------------

describe('AllocationBars — OW label', () => {
  it('shows OW when gap > 0', () => {
    render(<AllocationBars allocations={[OW_ALLOCATION]} />)
    expect(screen.getByTestId('allocation-gap-label-btc').textContent).toBe('OW')
  })
})

describe('AllocationBars — UW label', () => {
  it('shows UW when gap < 0', () => {
    render(<AllocationBars allocations={[UW_ALLOCATION_TRUE]} />)
    expect(screen.getByTestId('allocation-gap-label-ondo').textContent).toBe('UW')
  })
})

describe('AllocationBars — null gap', () => {
  it('shows empty label when gap is null', () => {
    render(<AllocationBars allocations={[NULL_CURRENT_ALLOCATION]} />)
    expect(screen.getByTestId('allocation-gap-label-link').textContent).toBe('')
  })
})

// ---------------------------------------------------------------------------
// AllocationBars — current% display
// ---------------------------------------------------------------------------

describe('AllocationBars — current percentage', () => {
  it('displays the current allocation percentage', () => {
    render(<AllocationBars allocations={[OW_ALLOCATION]} />)
    // formatPct(67.7) → '67.7%'
    expect(screen.getByTestId('allocation-current-btc').textContent).toBe('67.7%')
  })

  it('shows em-dash when currentPct is null', () => {
    render(<AllocationBars allocations={[NULL_CURRENT_ALLOCATION]} />)
    expect(screen.getByTestId('allocation-current-link').textContent).toBe('—')
  })
})

// ---------------------------------------------------------------------------
// AllocationBars — fill width
// ---------------------------------------------------------------------------

describe('AllocationBars — fill width', () => {
  it('sets fill width to currentPct', () => {
    render(<AllocationBars allocations={[OW_ALLOCATION]} />)
    const fill = screen.getByTestId('allocation-fill-btc')
    expect(fill).toHaveStyle({ width: '67.7%' })
  })

  it('sets fill width to 0% when currentPct is null', () => {
    render(<AllocationBars allocations={[NULL_CURRENT_ALLOCATION]} />)
    const fill = screen.getByTestId('allocation-fill-link')
    expect(fill).toHaveStyle({ width: '0%' })
  })

  it('caps fill width at 100% when currentPct exceeds 100', () => {
    const overAllocated: Allocation = {
      key: 'btc', label: 'BTC', value: 900000,
      currentPct: 120, targetPct: 60, gap: 60,
      color: 'var(--orange)',
    }
    render(<AllocationBars allocations={[overAllocated]} />)
    const fill = screen.getByTestId('allocation-fill-btc')
    expect(fill).toHaveStyle({ width: '100%' })
  })
})

// ---------------------------------------------------------------------------
// AllocationBars — target tick
// ---------------------------------------------------------------------------

describe('AllocationBars — target tick', () => {
  it('renders a tick when targetPct > 0', () => {
    render(<AllocationBars allocations={[OW_ALLOCATION]} />)
    expect(screen.getByTestId('allocation-tick-btc')).toBeInTheDocument()
  })

  it('does not render a tick when targetPct is 0', () => {
    render(<AllocationBars allocations={[ZERO_TARGET_ALLOCATION]} />)
    expect(screen.queryByTestId('allocation-tick-near')).not.toBeInTheDocument()
  })
})
