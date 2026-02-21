import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'

import { PriceWarningBanner } from '../components/PriceWarningBanner'
import { KvFallbackBanner } from '../components/KvFallbackBanner'
import { ErrorToast } from '../components/ErrorToast'

// ---------------------------------------------------------------------------
// PriceWarningBanner
// ---------------------------------------------------------------------------

describe('PriceWarningBanner — pricesPartial = true', () => {
  it('renders the banner', () => {
    render(<PriceWarningBanner pricesPartial={true} />)
    expect(screen.getByTestId('price-warning-banner')).toBeInTheDocument()
  })

  it('contains a warning symbol', () => {
    render(<PriceWarningBanner pricesPartial={true} />)
    expect(screen.getByTestId('price-warning-banner').textContent).toContain('⚠')
  })

  it('mentions that prices are unavailable', () => {
    render(<PriceWarningBanner pricesPartial={true} />)
    expect(screen.getByTestId('price-warning-banner').textContent).toMatch(/unavailable/i)
  })
})

describe('PriceWarningBanner — pricesPartial = false', () => {
  it('renders nothing', () => {
    const { container } = render(<PriceWarningBanner pricesPartial={false} />)
    expect(container.firstChild).toBeNull()
  })

  it('is completely absent from the DOM', () => {
    const { container } = render(<PriceWarningBanner pricesPartial={false} />)
    expect(container.innerHTML).toBe('')
  })
})

// ---------------------------------------------------------------------------
// KvFallbackBanner
// ---------------------------------------------------------------------------

describe('KvFallbackBanner — kvFallback = true', () => {
  it('renders the banner', () => {
    render(<KvFallbackBanner kvFallback={true} />)
    expect(screen.getByTestId('kv-fallback-banner')).toBeInTheDocument()
  })

  it('tells the user holdings are not set', () => {
    render(<KvFallbackBanner kvFallback={true} />)
    expect(screen.getByTestId('kv-fallback-banner').textContent).toMatch(/holdings not set/i)
  })

  it('prompts the user to open the edit panel', () => {
    render(<KvFallbackBanner kvFallback={true} />)
    expect(screen.getByTestId('kv-fallback-banner').textContent).toMatch(/edit/i)
  })
})

describe('KvFallbackBanner — kvFallback = false', () => {
  it('renders nothing', () => {
    const { container } = render(<KvFallbackBanner kvFallback={false} />)
    expect(container.firstChild).toBeNull()
  })

  it('is completely absent from the DOM', () => {
    const { container } = render(<KvFallbackBanner kvFallback={false} />)
    expect(container.innerHTML).toBe('')
  })
})

// ---------------------------------------------------------------------------
// ErrorToast
// ---------------------------------------------------------------------------

describe('ErrorToast — rendering', () => {
  afterEach(() => vi.useRealTimers())

  it('renders the toast', () => {
    vi.useFakeTimers()
    render(<ErrorToast onDismiss={vi.fn()} />)
    expect(screen.getByTestId('error-toast')).toBeInTheDocument()
  })

  it('has role="alert" for screen-reader accessibility', () => {
    vi.useFakeTimers()
    render(<ErrorToast onDismiss={vi.fn()} />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('mentions the refresh failure', () => {
    vi.useFakeTimers()
    render(<ErrorToast onDismiss={vi.fn()} />)
    expect(screen.getByRole('alert').textContent).toMatch(/refresh failed/i)
  })
})

describe('ErrorToast — auto-dismiss', () => {
  afterEach(() => vi.useRealTimers())

  it('calls onDismiss after 4 seconds', () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    render(<ErrorToast onDismiss={onDismiss} />)

    expect(onDismiss).not.toHaveBeenCalled()

    act(() => { vi.advanceTimersByTime(4000) })

    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('does not call onDismiss before 4 seconds', () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    render(<ErrorToast onDismiss={onDismiss} />)

    act(() => { vi.advanceTimersByTime(3999) })

    expect(onDismiss).not.toHaveBeenCalled()
  })

  it('calls onDismiss exactly once even if time advances further', () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    render(<ErrorToast onDismiss={onDismiss} />)

    act(() => { vi.advanceTimersByTime(10000) })

    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('does not call onDismiss if the component unmounts before 4 seconds', () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    const { unmount } = render(<ErrorToast onDismiss={onDismiss} />)

    act(() => { vi.advanceTimersByTime(2000) })
    unmount()
    act(() => { vi.advanceTimersByTime(2000) })

    expect(onDismiss).not.toHaveBeenCalled()
  })
})
