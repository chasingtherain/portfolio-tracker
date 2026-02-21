import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'

import { TriggerMonitor } from '../components/TriggerMonitor'
import { ExitLadder } from '../components/ExitLadder'
import { ScenarioTable } from '../components/ScenarioTable'
import type { TriggerState, ProceedsSplit } from '../lib/types'

// ---------------------------------------------------------------------------
// TriggerMonitor fixtures
// ---------------------------------------------------------------------------

const WATCH_TRIGGER: TriggerState = {
  label:     'FEAR & GREED',
  value:     '42',
  status:    'FEAR — ACCUMULATE',
  severity:  'watch',
  condition: 'Near active ≥ 65 · T1/T2 active ≥ 80 · T3 active ≥ 85',
}

const NEAR_TRIGGER: TriggerState = {
  label:     'BTC DOMINANCE',
  value:     '53.4%',
  status:    'ALTCOIN SEASON APPROACHING',
  severity:  'near',
  condition: 'Near when 52–55% · T2 fired below 52%',
}

const FIRED_TRIGGER: TriggerState = {
  label:     'NUPL',
  value:     '0.77',
  status:    'EUPHORIA — T3 ACTIVE',
  severity:  'fired',
  condition: 'Near at 0.60–0.74 · T3 euphoria ≥ 0.75',
}

const WARN_TRIGGER: TriggerState = {
  label:     'BTC PRICE ZONE',
  value:     '—',
  status:    'UNKNOWN',
  severity:  'warn',
  condition: 'Exit ladder activates above $200K',
}

// ---------------------------------------------------------------------------
// ExitLadder fixtures
// ---------------------------------------------------------------------------

const BELOW_150K_SPLIT: ProceedsSplit = {
  zone:      'below_150k',
  zoneLabel: 'BELOW $150K',
  cashPct:   30,
  btcPct:    70,
}

const ABOVE_350K_SPLIT: ProceedsSplit = {
  zone:      'above_350k',
  zoneLabel: 'ABOVE $350K',
  cashPct:   90,
  btcPct:    10,
}

// ---------------------------------------------------------------------------
// TriggerMonitor — structure
// ---------------------------------------------------------------------------

describe('TriggerMonitor — structure', () => {
  it('renders the container', () => {
    render(<TriggerMonitor triggers={[WATCH_TRIGGER]} />)
    expect(screen.getByTestId('trigger-monitor')).toBeInTheDocument()
  })

  it('renders a card for each trigger', () => {
    render(<TriggerMonitor triggers={[WATCH_TRIGGER, NEAR_TRIGGER, FIRED_TRIGGER, WARN_TRIGGER]} />)
    expect(screen.getByTestId('trigger-card-fear-greed')).toBeInTheDocument()
    expect(screen.getByTestId('trigger-card-btc-dominance')).toBeInTheDocument()
    expect(screen.getByTestId('trigger-card-nupl')).toBeInTheDocument()
    expect(screen.getByTestId('trigger-card-btc-price-zone')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// TriggerMonitor — severity data attribute
// ---------------------------------------------------------------------------

describe('TriggerMonitor — severity attribute', () => {
  it('watch trigger has data-severity="watch"', () => {
    render(<TriggerMonitor triggers={[WATCH_TRIGGER]} />)
    expect(screen.getByTestId('trigger-card-fear-greed')).toHaveAttribute('data-severity', 'watch')
  })

  it('near trigger has data-severity="near"', () => {
    render(<TriggerMonitor triggers={[NEAR_TRIGGER]} />)
    expect(screen.getByTestId('trigger-card-btc-dominance')).toHaveAttribute('data-severity', 'near')
  })

  it('fired trigger has data-severity="fired"', () => {
    render(<TriggerMonitor triggers={[FIRED_TRIGGER]} />)
    expect(screen.getByTestId('trigger-card-nupl')).toHaveAttribute('data-severity', 'fired')
  })

  it('warn trigger has data-severity="warn"', () => {
    render(<TriggerMonitor triggers={[WARN_TRIGGER]} />)
    expect(screen.getByTestId('trigger-card-btc-price-zone')).toHaveAttribute('data-severity', 'warn')
  })
})

// ---------------------------------------------------------------------------
// TriggerMonitor — card content
// ---------------------------------------------------------------------------

describe('TriggerMonitor — card content', () => {
  it('shows trigger label', () => {
    render(<TriggerMonitor triggers={[WATCH_TRIGGER]} />)
    const card = screen.getByTestId('trigger-card-fear-greed')
    expect(within(card).getByText('FEAR & GREED')).toBeInTheDocument()
  })

  it('shows trigger value', () => {
    render(<TriggerMonitor triggers={[WATCH_TRIGGER]} />)
    const card = screen.getByTestId('trigger-card-fear-greed')
    expect(within(card).getByText('42')).toBeInTheDocument()
  })

  it('shows trigger status', () => {
    render(<TriggerMonitor triggers={[WATCH_TRIGGER]} />)
    const card = screen.getByTestId('trigger-card-fear-greed')
    expect(within(card).getByText('FEAR — ACCUMULATE')).toBeInTheDocument()
  })

  it('shows trigger condition', () => {
    render(<TriggerMonitor triggers={[WATCH_TRIGGER]} />)
    const card = screen.getByTestId('trigger-card-fear-greed')
    expect(within(card).getByText('Near active ≥ 65 · T1/T2 active ≥ 80 · T3 active ≥ 85')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// ExitLadder — structure
// ---------------------------------------------------------------------------

describe('ExitLadder — structure', () => {
  it('renders the container', () => {
    render(<ExitLadder btcPrice={100_000} proceedsSplit={BELOW_150K_SPLIT} />)
    expect(screen.getByTestId('exit-ladder')).toBeInTheDocument()
  })

  it('renders all 5 tranche rows', () => {
    render(<ExitLadder btcPrice={100_000} proceedsSplit={BELOW_150K_SPLIT} />)
    expect(screen.getByTestId('tranche-row-T1')).toBeInTheDocument()
    expect(screen.getByTestId('tranche-row-T2')).toBeInTheDocument()
    expect(screen.getByTestId('tranche-row-T3')).toBeInTheDocument()
    expect(screen.getByTestId('tranche-row-T4')).toBeInTheDocument()
    expect(screen.getByTestId('tranche-row-T5')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// ExitLadder — no hits (BTC below all tranches)
// ---------------------------------------------------------------------------

describe('ExitLadder — BTC below all tranches', () => {
  it('shows no ✓ HIT indicators', () => {
    render(<ExitLadder btcPrice={100_000} proceedsSplit={BELOW_150K_SPLIT} />)
    expect(screen.queryByTestId('tranche-hit-T1')).not.toBeInTheDocument()
    expect(screen.queryByTestId('tranche-hit-T2')).not.toBeInTheDocument()
    expect(screen.queryByTestId('tranche-hit-T3')).not.toBeInTheDocument()
  })

  it('shows distance % for T1 when BTC = $100K', () => {
    // T1 = $150K, distance = (150K - 100K) / 100K * 100 = 50.0%
    render(<ExitLadder btcPrice={100_000} proceedsSplit={BELOW_150K_SPLIT} />)
    expect(screen.getByTestId('tranche-dist-T1')).toHaveTextContent('+50.0%')
  })

  it('shows distance % for T2 when BTC = $100K', () => {
    // T2 = $200K, distance = (200K - 100K) / 100K * 100 = 100.0%
    render(<ExitLadder btcPrice={100_000} proceedsSplit={BELOW_150K_SPLIT} />)
    expect(screen.getByTestId('tranche-dist-T2')).toHaveTextContent('+100.0%')
  })
})

// ---------------------------------------------------------------------------
// ExitLadder — partial hit (BTC at $160K)
// ---------------------------------------------------------------------------

describe('ExitLadder — BTC at $160K (T1 hit, T2–T5 not)', () => {
  it('T1 shows ✓ HIT', () => {
    render(<ExitLadder btcPrice={160_000} proceedsSplit={BELOW_150K_SPLIT} />)
    expect(screen.getByTestId('tranche-hit-T1')).toBeInTheDocument()
  })

  it('T2 shows distance, not hit', () => {
    // T2 = $200K, distance = (200K - 160K) / 160K * 100 = 25.0%
    render(<ExitLadder btcPrice={160_000} proceedsSplit={BELOW_150K_SPLIT} />)
    expect(screen.queryByTestId('tranche-hit-T2')).not.toBeInTheDocument()
    expect(screen.getByTestId('tranche-dist-T2')).toHaveTextContent('+25.0%')
  })

  it('T5 shows distance, not hit', () => {
    render(<ExitLadder btcPrice={160_000} proceedsSplit={BELOW_150K_SPLIT} />)
    expect(screen.queryByTestId('tranche-hit-T5')).not.toBeInTheDocument()
    expect(screen.getByTestId('tranche-dist-T5')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// ExitLadder — all tranches hit (BTC above T5)
// ---------------------------------------------------------------------------

describe('ExitLadder — BTC above all tranches ($400K)', () => {
  it('all 5 tranches show ✓ HIT', () => {
    render(<ExitLadder btcPrice={400_000} proceedsSplit={ABOVE_350K_SPLIT} />)
    expect(screen.getByTestId('tranche-hit-T1')).toBeInTheDocument()
    expect(screen.getByTestId('tranche-hit-T2')).toBeInTheDocument()
    expect(screen.getByTestId('tranche-hit-T3')).toBeInTheDocument()
    expect(screen.getByTestId('tranche-hit-T4')).toBeInTheDocument()
    expect(screen.getByTestId('tranche-hit-T5')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// ExitLadder — null btcPrice
// ---------------------------------------------------------------------------

describe('ExitLadder — null btcPrice', () => {
  it('shows — for all distance cells', () => {
    render(<ExitLadder btcPrice={null} proceedsSplit={BELOW_150K_SPLIT} />)
    // formatPct(null, true) → '—'
    const distCells = ['T1', 'T2', 'T3', 'T4', 'T5'].map(
      (t) => screen.getByTestId(`tranche-dist-${t}`)
    )
    distCells.forEach((cell) => expect(cell).toHaveTextContent('—'))
  })

  it('shows no ✓ HIT indicators', () => {
    render(<ExitLadder btcPrice={null} proceedsSplit={BELOW_150K_SPLIT} />)
    expect(screen.queryByTestId('tranche-hit-T1')).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// ExitLadder — exact boundary: BTC exactly at tranche price
// ---------------------------------------------------------------------------

describe('ExitLadder — BTC exactly at T1 price ($150K)', () => {
  it('T1 shows ✓ HIT at exact boundary', () => {
    render(<ExitLadder btcPrice={150_000} proceedsSplit={BELOW_150K_SPLIT} />)
    expect(screen.getByTestId('tranche-hit-T1')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// ExitLadder — proceeds split section
// ---------------------------------------------------------------------------

describe('ExitLadder — proceeds split', () => {
  it('renders the proceeds split section', () => {
    render(<ExitLadder btcPrice={100_000} proceedsSplit={BELOW_150K_SPLIT} />)
    expect(screen.getByTestId('proceeds-split')).toBeInTheDocument()
  })

  it('shows the zone label', () => {
    render(<ExitLadder btcPrice={100_000} proceedsSplit={BELOW_150K_SPLIT} />)
    expect(screen.getByText('BELOW $150K')).toBeInTheDocument()
  })

  it('shows cash % from proceedsSplit', () => {
    render(<ExitLadder btcPrice={100_000} proceedsSplit={BELOW_150K_SPLIT} />)
    // formatPct(30) → '30.0%'
    expect(screen.getByTestId('proceeds-cash-pct')).toHaveTextContent('30.0%')
  })

  it('shows btc % from proceedsSplit', () => {
    render(<ExitLadder btcPrice={100_000} proceedsSplit={BELOW_150K_SPLIT} />)
    // formatPct(70) → '70.0%'
    expect(screen.getByTestId('proceeds-btc-pct')).toHaveTextContent('70.0%')
  })

  it('updates split values for different zone', () => {
    render(<ExitLadder btcPrice={400_000} proceedsSplit={ABOVE_350K_SPLIT} />)
    expect(screen.getByTestId('proceeds-cash-pct')).toHaveTextContent('90.0%')
    expect(screen.getByTestId('proceeds-btc-pct')).toHaveTextContent('10.0%')
    expect(screen.getByText('ABOVE $350K')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// ScenarioTable — structure
// ---------------------------------------------------------------------------

describe('ScenarioTable — structure', () => {
  it('renders the container', () => {
    render(<ScenarioTable />)
    expect(screen.getByTestId('scenario-table')).toBeInTheDocument()
  })

  it('renders exactly 5 scenario rows', () => {
    render(<ScenarioTable />)
    const rows = screen.getAllByTestId(/^scenario-row-/)
    expect(rows).toHaveLength(5)
  })
})

// ---------------------------------------------------------------------------
// ScenarioTable — target row
// ---------------------------------------------------------------------------

describe('ScenarioTable — target row', () => {
  it('exactly one row has data-target="true"', () => {
    render(<ScenarioTable />)
    const rows = screen.getAllByTestId(/^scenario-row-/)
    const targetRows = rows.filter((r) => r.getAttribute('data-target') === 'true')
    expect(targetRows).toHaveLength(1)
  })

  it('the $250K row is the target', () => {
    render(<ScenarioTable />)
    expect(screen.getByTestId('scenario-row-250000')).toHaveAttribute('data-target', 'true')
  })

  it('other rows do not have data-target', () => {
    render(<ScenarioTable />)
    expect(screen.getByTestId('scenario-row-100000')).not.toHaveAttribute('data-target')
    expect(screen.getByTestId('scenario-row-200000')).not.toHaveAttribute('data-target')
    expect(screen.getByTestId('scenario-row-350000')).not.toHaveAttribute('data-target')
  })
})

// ---------------------------------------------------------------------------
// ScenarioTable — content
// ---------------------------------------------------------------------------

describe('ScenarioTable — content', () => {
  it('renders all BTC price scenarios', () => {
    render(<ScenarioTable />)
    // formatCurrency for each hardcoded price
    expect(screen.getByTestId('scenario-row-100000')).toHaveTextContent('$100,000')
    expect(screen.getByTestId('scenario-row-150000')).toHaveTextContent('$150,000')
    expect(screen.getByTestId('scenario-row-200000')).toHaveTextContent('$200,000')
    expect(screen.getByTestId('scenario-row-250000')).toHaveTextContent('$250,000')
    expect(screen.getByTestId('scenario-row-350000')).toHaveTextContent('$350,000')
  })

  it('target row portfolio value is above $1M', () => {
    render(<ScenarioTable />)
    // $1,182,000 → formatCurrency → '$1,182,000'
    expect(screen.getByTestId('scenario-row-250000')).toHaveTextContent('$1,182,000')
  })

  it('target row vs $1M is positive', () => {
    render(<ScenarioTable />)
    // formatPnl(1_182_000 - 1_000_000) = formatPnl(182_000) → '+$182,000'
    expect(screen.getByTestId('scenario-row-250000')).toHaveTextContent('+$182,000')
  })

  it('rows below target have negative vs $1M', () => {
    render(<ScenarioTable />)
    // formatPnl(472_000 - 1_000_000) = formatPnl(-528_000) → '–$528,000'
    expect(screen.getByTestId('scenario-row-100000')).toHaveTextContent('–$528,000')
  })

  it('$200K row is below target (negative vs $1M)', () => {
    render(<ScenarioTable />)
    // formatPnl(945_000 - 1_000_000) = formatPnl(-55_000) → '–$55,000'
    expect(screen.getByTestId('scenario-row-200000')).toHaveTextContent('–$55,000')
  })
})
