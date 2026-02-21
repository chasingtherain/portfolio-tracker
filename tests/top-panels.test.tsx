import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

import { StatBar } from '../components/StatBar'
import { ProgressBar } from '../components/ProgressBar'
import { PhaseIndicator } from '../components/PhaseIndicator'

// ---------------------------------------------------------------------------
// StatBar
// ---------------------------------------------------------------------------

describe('StatBar — normal data', () => {
  const defaultProps = {
    totalValue: 460920,
    gapToTarget: -539080,
    btcPrice:   97500,
    fearGreed:  72,
  }

  it('renders the stat bar container', () => {
    render(<StatBar {...defaultProps} />)
    expect(screen.getByTestId('stat-bar')).toBeInTheDocument()
  })

  it('displays the total portfolio value', () => {
    render(<StatBar {...defaultProps} />)
    expect(screen.getByTestId('stat-total-value').textContent).toMatch(/460/)
  })

  it('displays the gap to target', () => {
    render(<StatBar {...defaultProps} />)
    expect(screen.getByTestId('stat-gap').textContent).toMatch(/539/)
  })

  it('displays the BTC price', () => {
    render(<StatBar {...defaultProps} />)
    expect(screen.getByTestId('stat-btc-price').textContent).toMatch(/97/)
  })

  it('displays the Fear & Greed value', () => {
    render(<StatBar {...defaultProps} />)
    expect(screen.getByTestId('stat-fear-greed').textContent).toBe('72')
  })
})

describe('StatBar — gap sign', () => {
  it('shows + prefix when portfolio is above target', () => {
    render(
      <StatBar totalValue={1_100_000} gapToTarget={100_000} btcPrice={null} fearGreed={null} />
    )
    expect(screen.getByTestId('stat-gap').textContent).toMatch(/^\+/)
  })

  it('shows no + prefix when portfolio is below target', () => {
    render(
      <StatBar totalValue={460_920} gapToTarget={-539_080} btcPrice={null} fearGreed={null} />
    )
    const text = screen.getByTestId('stat-gap').textContent ?? ''
    expect(text.startsWith('+')).toBe(false)
  })

  it('shows no + or – when gap is exactly zero', () => {
    render(
      <StatBar totalValue={1_000_000} gapToTarget={0} btcPrice={null} fearGreed={null} />
    )
    // formatCurrency(0) = '$0' — no sign
    const text = screen.getByTestId('stat-gap').textContent ?? ''
    expect(text).not.toMatch(/^-/)
    // gapToTarget === 0 is not > 0 so no '+' prefix added either
    expect(text.startsWith('+')).toBe(false)
  })
})

describe('StatBar — null prices', () => {
  it('shows em-dash when btcPrice is null', () => {
    render(
      <StatBar totalValue={460920} gapToTarget={-539080} btcPrice={null} fearGreed={null} />
    )
    // formatCurrency(null) returns '—'
    expect(screen.getByTestId('stat-btc-price').textContent).toBe('—')
  })

  it('shows em-dash when fearGreed is null', () => {
    render(
      <StatBar totalValue={460920} gapToTarget={-539080} btcPrice={null} fearGreed={null} />
    )
    expect(screen.getByTestId('stat-fear-greed').textContent).toBe('—')
  })

  it('sets data-severity="unknown" when fearGreed is null', () => {
    render(
      <StatBar totalValue={460920} gapToTarget={-539080} btcPrice={null} fearGreed={null} />
    )
    expect(screen.getByTestId('stat-fear-greed').dataset.severity).toBe('unknown')
  })
})

describe('StatBar — Fear & Greed severity levels', () => {
  function renderFG(value: number) {
    return render(
      <StatBar totalValue={0} gapToTarget={0} btcPrice={null} fearGreed={value} />
    )
  }

  it('severity=watch for value < 50', () => {
    renderFG(40)
    expect(screen.getByTestId('stat-fear-greed').dataset.severity).toBe('watch')
  })

  it('severity=caution for value 50–64', () => {
    renderFG(55)
    expect(screen.getByTestId('stat-fear-greed').dataset.severity).toBe('caution')
  })

  it('severity=caution at exactly 50', () => {
    renderFG(50)
    expect(screen.getByTestId('stat-fear-greed').dataset.severity).toBe('caution')
  })

  it('severity=near for value 65–79', () => {
    renderFG(72)
    expect(screen.getByTestId('stat-fear-greed').dataset.severity).toBe('near')
  })

  it('severity=near at exactly 65', () => {
    renderFG(65)
    expect(screen.getByTestId('stat-fear-greed').dataset.severity).toBe('near')
  })

  it('severity=fired for value >= 80', () => {
    renderFG(85)
    expect(screen.getByTestId('stat-fear-greed').dataset.severity).toBe('fired')
  })

  it('severity=fired at exactly 80', () => {
    renderFG(80)
    expect(screen.getByTestId('stat-fear-greed').dataset.severity).toBe('fired')
  })
})

// ---------------------------------------------------------------------------
// ProgressBar
// ---------------------------------------------------------------------------

describe('ProgressBar — normal data', () => {
  const defaultProps = {
    totalValue:  460920,
    target:      1_000_000,
    progressPct: 46.09,
    gapToTarget: -539080,
  }

  it('renders the container', () => {
    render(<ProgressBar {...defaultProps} />)
    expect(screen.getByTestId('progress-bar-container')).toBeInTheDocument()
  })

  it('displays the total value', () => {
    render(<ProgressBar {...defaultProps} />)
    expect(screen.getByTestId('progress-value').textContent).toMatch(/460/)
  })

  it('displays the progress percentage', () => {
    render(<ProgressBar {...defaultProps} />)
    expect(screen.getByTestId('progress-pct').textContent).toMatch(/46/)
  })

  it('sets bar fill width to progressPct', () => {
    render(<ProgressBar {...defaultProps} />)
    const fill = screen.getByTestId('progress-bar-fill')
    expect(fill).toHaveStyle({ width: '46.09%' })
  })

  it('shows gap to target', () => {
    render(<ProgressBar {...defaultProps} />)
    expect(screen.getByTestId('progress-gap').textContent).toMatch(/539/)
  })
})

describe('ProgressBar — gap sign', () => {
  it('shows + prefix when portfolio is above target', () => {
    render(
      <ProgressBar totalValue={1_100_000} target={1_000_000} progressPct={110} gapToTarget={100_000} />
    )
    expect(screen.getByTestId('progress-gap').textContent).toMatch(/^\+/)
  })

  it('shows no + prefix when below target', () => {
    render(
      <ProgressBar totalValue={460920} target={1_000_000} progressPct={46.09} gapToTarget={-539080} />
    )
    const text = screen.getByTestId('progress-gap').textContent ?? ''
    expect(text.startsWith('+')).toBe(false)
  })
})

describe('ProgressBar — progress > 100% edge case', () => {
  it('caps bar fill width at 100% even when progressPct exceeds 100', () => {
    render(
      <ProgressBar totalValue={1_200_000} target={1_000_000} progressPct={120} gapToTarget={200_000} />
    )
    // The bar width is capped via Math.min(progressPct, 100)
    const fill = screen.getByTestId('progress-bar-fill')
    expect(fill).toHaveStyle({ width: '100%' })
  })

  it('still shows the real percentage value in the label (not capped)', () => {
    render(
      <ProgressBar totalValue={1_200_000} target={1_000_000} progressPct={120} gapToTarget={200_000} />
    )
    // formatPct(120) should show the full value; bar is capped, label is not
    expect(screen.getByTestId('progress-pct').textContent).toMatch(/120/)
  })
})

// ---------------------------------------------------------------------------
// PhaseIndicator
// ---------------------------------------------------------------------------

describe('PhaseIndicator — active zone detection', () => {
  it('marks below_150k as active when BTC < $150K', () => {
    render(<PhaseIndicator btcPrice={97_500} />)
    expect(screen.getByTestId('phase-segment-below_150k').dataset.state).toBe('active')
  })

  it('marks 150k_250k as active when BTC is between $150K and $250K', () => {
    render(<PhaseIndicator btcPrice={200_000} />)
    expect(screen.getByTestId('phase-segment-150k_250k').dataset.state).toBe('active')
  })

  it('marks 250k_350k as active when BTC is between $250K and $350K', () => {
    render(<PhaseIndicator btcPrice={300_000} />)
    expect(screen.getByTestId('phase-segment-250k_350k').dataset.state).toBe('active')
  })

  it('marks above_350k as active when BTC >= $350K', () => {
    render(<PhaseIndicator btcPrice={400_000} />)
    expect(screen.getByTestId('phase-segment-above_350k').dataset.state).toBe('active')
  })
})

describe('PhaseIndicator — completed and future zones', () => {
  it('zones before active are marked completed', () => {
    // BTC at $200K → 150k_250k is active → below_150k should be completed
    render(<PhaseIndicator btcPrice={200_000} />)
    expect(screen.getByTestId('phase-segment-below_150k').dataset.state).toBe('completed')
  })

  it('zones after active are marked future', () => {
    // BTC at $200K → 150k_250k is active → 250k_350k and above_350k should be future
    render(<PhaseIndicator btcPrice={200_000} />)
    expect(screen.getByTestId('phase-segment-250k_350k').dataset.state).toBe('future')
    expect(screen.getByTestId('phase-segment-above_350k').dataset.state).toBe('future')
  })

  it('all four zones are future when BTC is in the first zone (none completed)', () => {
    render(<PhaseIndicator btcPrice={97_500} />)
    // below_150k is active, nothing before it
    expect(screen.getByTestId('phase-segment-150k_250k').dataset.state).toBe('future')
    expect(screen.getByTestId('phase-segment-250k_350k').dataset.state).toBe('future')
    expect(screen.getByTestId('phase-segment-above_350k').dataset.state).toBe('future')
  })

  it('all zones except above_350k are completed when in the last zone', () => {
    render(<PhaseIndicator btcPrice={400_000} />)
    expect(screen.getByTestId('phase-segment-below_150k').dataset.state).toBe('completed')
    expect(screen.getByTestId('phase-segment-150k_250k').dataset.state).toBe('completed')
    expect(screen.getByTestId('phase-segment-250k_350k').dataset.state).toBe('completed')
  })
})

describe('PhaseIndicator — null BTC price', () => {
  it('marks all segments as unknown when btcPrice is null', () => {
    render(<PhaseIndicator btcPrice={null} />)
    const segments = screen.getAllByTestId(/^phase-segment-/)
    expect(segments).toHaveLength(4)
    for (const seg of segments) {
      expect(seg.dataset.state).toBe('unknown')
    }
  })
})

describe('PhaseIndicator — boundary values', () => {
  it('exactly $150K is in the 150k_250k zone (lower bound is exclusive)', () => {
    // calcProceedsSplit: btcPrice < 150_000 → below_150k, else if btcPrice < 250_000 → 150k_250k
    render(<PhaseIndicator btcPrice={150_000} />)
    expect(screen.getByTestId('phase-segment-150k_250k').dataset.state).toBe('active')
    expect(screen.getByTestId('phase-segment-below_150k').dataset.state).toBe('completed')
  })

  it('exactly $350K is in the above_350k zone (lower bound is exclusive)', () => {
    render(<PhaseIndicator btcPrice={350_000} />)
    expect(screen.getByTestId('phase-segment-above_350k').dataset.state).toBe('active')
  })
})

describe('PhaseIndicator — renders all four segments', () => {
  it('always renders exactly 4 zone segments', () => {
    render(<PhaseIndicator btcPrice={97_500} />)
    expect(screen.getAllByTestId(/^phase-segment-/)).toHaveLength(4)
  })

  it('renders the phase indicator container', () => {
    render(<PhaseIndicator btcPrice={97_500} />)
    expect(screen.getByTestId('phase-indicator')).toBeInTheDocument()
  })
})
