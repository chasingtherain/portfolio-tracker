import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import { DemoBadge } from '../components/DemoBadge'
import { Header } from '../components/Header'

// ---------------------------------------------------------------------------
// DemoBadge
// ---------------------------------------------------------------------------

describe('DemoBadge — demo mode enabled', () => {
  beforeEach(() => vi.stubEnv('NEXT_PUBLIC_IS_DEMO', 'true'))
  afterEach(() => vi.unstubAllEnvs())

  it('renders the badge', () => {
    render(<DemoBadge />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('contains the word "DEMO"', () => {
    render(<DemoBadge />)
    expect(screen.getByText(/demo/i)).toBeInTheDocument()
  })
})

describe('DemoBadge — demo mode disabled', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('renders nothing when NEXT_PUBLIC_IS_DEMO is "false"', () => {
    vi.stubEnv('NEXT_PUBLIC_IS_DEMO', 'false')
    const { container } = render(<DemoBadge />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when NEXT_PUBLIC_IS_DEMO is not set', () => {
    vi.stubEnv('NEXT_PUBLIC_IS_DEMO', '')
    const { container } = render(<DemoBadge />)
    expect(container.firstChild).toBeNull()
  })

  it('is completely absent from the DOM (not hidden with CSS)', () => {
    vi.stubEnv('NEXT_PUBLIC_IS_DEMO', 'false')
    const { container } = render(<DemoBadge />)
    // null means no element was rendered — not display:none, not visibility:hidden
    expect(container.innerHTML).toBe('')
  })
})

// ---------------------------------------------------------------------------
// Header — structure
// ---------------------------------------------------------------------------

describe('Header — structure', () => {
  const onRefresh = vi.fn()

  it('renders a refresh button', () => {
    render(<Header fetchedAt={null} onRefresh={onRefresh} isRefreshing={false} />)
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument()
  })

  it('contains the app title', () => {
    render(<Header fetchedAt={null} onRefresh={onRefresh} isRefreshing={false} />)
    expect(screen.getByText(/portfolio/i)).toBeInTheDocument()
  })

  it('renders no timestamp when fetchedAt is null', () => {
    render(<Header fetchedAt={null} onRefresh={onRefresh} isRefreshing={false} />)
    expect(screen.queryByTestId('timestamp')).not.toBeInTheDocument()
  })

  it('renders timestamp when fetchedAt is provided', () => {
    render(
      <Header
        fetchedAt="2025-01-15T10:30:00.000Z"
        onRefresh={onRefresh}
        isRefreshing={false}
      />
    )
    expect(screen.getByTestId('timestamp')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Header — timestamp formatting
// ---------------------------------------------------------------------------

describe('Header — timestamp formatting', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Pin time so the timestamp is always "fresh" (not stale) in these tests
    vi.setSystemTime(new Date('2025-01-15T10:35:00.000Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('displays the time portion of fetchedAt in HH:MM format', () => {
    render(
      <Header
        fetchedAt="2025-01-15T10:30:00.000Z"
        onRefresh={vi.fn()}
        isRefreshing={false}
      />
    )
    // The timestamp element should contain a HH:MM pattern
    const ts = screen.getByTestId('timestamp')
    expect(ts.textContent).toMatch(/\d{2}:\d{2}/)
  })
})

// ---------------------------------------------------------------------------
// Header — stale detection
// ---------------------------------------------------------------------------

describe('Header — stale detection', () => {
  afterEach(() => vi.useRealTimers())

  it('shows stale indicator when fetchedAt is more than 10 minutes ago', () => {
    vi.useFakeTimers()
    // Current time: 11:15 — fetchedAt was 11:00 → 15 minutes ago
    vi.setSystemTime(new Date('2025-01-15T11:15:00.000Z'))

    render(
      <Header
        fetchedAt="2025-01-15T11:00:00.000Z"
        onRefresh={vi.fn()}
        isRefreshing={false}
      />
    )
    expect(screen.getByTestId('stale-indicator')).toBeInTheDocument()
  })

  it('does not show stale indicator when fetchedAt is less than 10 minutes ago', () => {
    vi.useFakeTimers()
    // Current time: 11:05 — fetchedAt was 11:00 → 5 minutes ago
    vi.setSystemTime(new Date('2025-01-15T11:05:00.000Z'))

    render(
      <Header
        fetchedAt="2025-01-15T11:00:00.000Z"
        onRefresh={vi.fn()}
        isRefreshing={false}
      />
    )
    expect(screen.queryByTestId('stale-indicator')).not.toBeInTheDocument()
  })

  it('does not show stale indicator exactly at 10 minutes (threshold is exclusive)', () => {
    vi.useFakeTimers()
    // Current time: 11:10:00 — fetchedAt was 11:00:00 → exactly 10 minutes, not stale
    vi.setSystemTime(new Date('2025-01-15T11:10:00.000Z'))

    render(
      <Header
        fetchedAt="2025-01-15T11:00:00.000Z"
        onRefresh={vi.fn()}
        isRefreshing={false}
      />
    )
    expect(screen.queryByTestId('stale-indicator')).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Header — refresh button interaction
// ---------------------------------------------------------------------------

describe('Header — refresh button', () => {
  it('calls onRefresh when the button is clicked', () => {
    const onRefresh = vi.fn()
    render(<Header fetchedAt={null} onRefresh={onRefresh} isRefreshing={false} />)

    fireEvent.click(screen.getByRole('button', { name: /refresh/i }))
    expect(onRefresh).toHaveBeenCalledOnce()
  })

  it('disables the button while refreshing', () => {
    render(<Header fetchedAt={null} onRefresh={vi.fn()} isRefreshing={true} />)
    expect(screen.getByRole('button', { name: /refresh/i })).toBeDisabled()
  })

  it('enables the button when not refreshing', () => {
    render(<Header fetchedAt={null} onRefresh={vi.fn()} isRefreshing={false} />)
    expect(screen.getByRole('button', { name: /refresh/i })).not.toBeDisabled()
  })
})
