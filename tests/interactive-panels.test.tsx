import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

import { Checklist } from '../components/Checklist'
import { EditHoldingsPanel } from '../components/EditHoldingsPanel'
import Page from '../app/page'
import { DEMO_PORTFOLIO_STATE } from '../lib/demo-data'
import type { ClientHoldings } from '../lib/types'

// ---------------------------------------------------------------------------
// Fetch mock — required for Checklist (live) and EditHoldingsPanel
// ---------------------------------------------------------------------------

const mockFetch = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch)
  mockFetch.mockReset()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ALL_FALSE: boolean[] = Array(8).fill(false)
const FIRST_TRUE: boolean[] = [true, false, false, false, false, false, false, false]

const MOCK_HOLDINGS: ClientHoldings = {
  btc:       { qty: 3.2  },
  mstr:      { qty: 200  },
  near:      { qty: 4000 },
  uni:       { qty: 800  },
  link:      { qty: 600  },
  ondo:      { qty: 8000 },
  eth:       { qty: 2.5  },
  dryPowder: 12000,
  nupl:      0.55,
  updatedAt: '2025-01-15T09:45:00.000Z',
}

function mockChecklistGet(state = ALL_FALSE) {
  return { ok: true, json: async () => state }
}

function mockHoldingsGet(holdings = MOCK_HOLDINGS) {
  return { ok: true, json: async () => holdings }
}

function mockOkPut() {
  return { ok: true, json: async () => ({ ok: true }) }
}

// ---------------------------------------------------------------------------
// Checklist — demo mode
// ---------------------------------------------------------------------------

describe('Checklist — demo mode — structure', () => {
  it('renders the container', () => {
    render(<Checklist mode="demo" savedAt={0} />)
    expect(screen.getByTestId('checklist')).toBeInTheDocument()
  })

  it('renders 8 items', () => {
    render(<Checklist mode="demo" savedAt={0} />)
    for (let i = 0; i < 8; i++) {
      expect(screen.getByTestId(`checklist-item-${i}`)).toBeInTheDocument()
    }
  })

  it('all checkboxes start unchecked', () => {
    render(<Checklist mode="demo" savedAt={0} />)
    for (let i = 0; i < 8; i++) {
      expect(screen.getByTestId(`checklist-checkbox-${i}`)).not.toBeChecked()
    }
  })
})

describe('Checklist — demo mode — interaction', () => {
  it('clicking a checkbox checks it', () => {
    render(<Checklist mode="demo" savedAt={0} />)
    fireEvent.click(screen.getByTestId('checklist-checkbox-2'))
    expect(screen.getByTestId('checklist-checkbox-2')).toBeChecked()
  })

  it('clicking a checked checkbox unchecks it', () => {
    render(<Checklist mode="demo" savedAt={0} />)
    fireEvent.click(screen.getByTestId('checklist-checkbox-2'))
    expect(screen.getByTestId('checklist-checkbox-2')).toBeChecked()
    fireEvent.click(screen.getByTestId('checklist-checkbox-2'))
    expect(screen.getByTestId('checklist-checkbox-2')).not.toBeChecked()
  })

  it('does NOT call fetch when toggling in demo mode', () => {
    render(<Checklist mode="demo" savedAt={0} />)
    fireEvent.click(screen.getByTestId('checklist-checkbox-0'))
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Checklist — live mode
// ---------------------------------------------------------------------------

describe('Checklist — live mode — initial fetch', () => {
  it('fetches /api/checklist on mount', async () => {
    mockFetch.mockResolvedValue(mockChecklistGet())
    render(<Checklist mode="live" savedAt={0} />)
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/checklist')
    })
  })

  it('populates checkboxes from API response', async () => {
    // API returns first item checked
    mockFetch.mockResolvedValue(mockChecklistGet(FIRST_TRUE))
    render(<Checklist mode="live" savedAt={0} />)
    await waitFor(() => {
      expect(screen.getByTestId('checklist-checkbox-0')).toBeChecked()
    })
    expect(screen.getByTestId('checklist-checkbox-1')).not.toBeChecked()
  })
})

describe('Checklist — live mode — toggle persistence', () => {
  it('calls PUT /api/checklist when a checkbox is toggled', async () => {
    mockFetch.mockResolvedValue(mockChecklistGet())
    render(<Checklist mode="live" savedAt={0} />)
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1)) // initial GET

    fireEvent.click(screen.getByTestId('checklist-checkbox-3'))

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2))
    const [url, opts] = mockFetch.mock.calls[1]
    expect(url).toBe('/api/checklist')
    expect(opts.method).toBe('PUT')
  })

  it('PUT body contains the toggled state', async () => {
    mockFetch.mockResolvedValue(mockChecklistGet())
    render(<Checklist mode="live" savedAt={0} />)
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))

    fireEvent.click(screen.getByTestId('checklist-checkbox-0'))

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2))
    const [, opts] = mockFetch.mock.calls[1]
    const body = JSON.parse(opts.body)
    // index 0 should now be true, rest false
    expect(body[0]).toBe(true)
    expect(body[1]).toBe(false)
    expect(body.length).toBe(8)
  })
})

describe('Checklist — live mode — savedAt reset', () => {
  it('re-fetches when savedAt prop changes (holdings saved → checklist reset)', async () => {
    mockFetch.mockResolvedValue(mockChecklistGet())
    const { rerender } = render(<Checklist mode="live" savedAt={0} />)
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))

    // Simulate holdings saved → savedAt changes
    rerender(<Checklist mode="live" savedAt={99999} />)

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2))
    expect(mockFetch).toHaveBeenLastCalledWith('/api/checklist')
  })
})

// ---------------------------------------------------------------------------
// EditHoldingsPanel — structure
// ---------------------------------------------------------------------------

// Helper: render EditHoldingsPanel and drain the mount-time GET /api/holdings effect
// so there are no pending state updates after the test's synchronous assertions.
async function renderPanel(onSaved = vi.fn()) {
  const result = render(<EditHoldingsPanel onHoldingsSaved={onSaved} />)
  await waitFor(() => expect(mockFetch).toHaveBeenCalledWith('/api/holdings'))
  return result
}

describe('EditHoldingsPanel — structure', () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue(mockHoldingsGet())
  })

  it('renders the panel container', async () => {
    await renderPanel()
    expect(screen.getByTestId('edit-holdings-panel')).toBeInTheDocument()
  })

  it('form content is hidden by default (collapsed)', async () => {
    await renderPanel()
    expect(screen.getByTestId('edit-holdings-content')).not.toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// EditHoldingsPanel — toggle
// ---------------------------------------------------------------------------

describe('EditHoldingsPanel — toggle', () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue(mockHoldingsGet())
  })

  it('clicking the toggle button opens the panel', async () => {
    await renderPanel()
    fireEvent.click(screen.getByTestId('edit-holdings-toggle'))
    expect(screen.getByTestId('edit-holdings-content')).toBeVisible()
  })

  it('clicking toggle again closes the panel', async () => {
    await renderPanel()
    const toggle = screen.getByTestId('edit-holdings-toggle')
    fireEvent.click(toggle) // open
    expect(screen.getByTestId('edit-holdings-content')).toBeVisible()
    fireEvent.click(toggle) // close
    expect(screen.getByTestId('edit-holdings-content')).not.toBeVisible()
  })

  it('has inputs for all assets when open', async () => {
    await renderPanel()
    fireEvent.click(screen.getByTestId('edit-holdings-toggle'))
    for (const key of ['btc', 'mstr', 'near', 'uni', 'link', 'ondo', 'eth']) {
      expect(screen.getByTestId(`input-${key}-qty`)).toBeInTheDocument()
      expect(screen.getByTestId(`input-${key}-cost`)).toBeInTheDocument()
    }
  })

  it('has dry powder, NUPL, and password inputs', async () => {
    await renderPanel()
    fireEvent.click(screen.getByTestId('edit-holdings-toggle'))
    expect(screen.getByTestId('input-dry-powder')).toBeInTheDocument()
    expect(screen.getByTestId('input-nupl')).toBeInTheDocument()
    expect(screen.getByTestId('input-password')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// EditHoldingsPanel — password retention
// ---------------------------------------------------------------------------

describe('EditHoldingsPanel — password retention', () => {
  it('password is retained when panel is closed and reopened', async () => {
    mockFetch.mockResolvedValue(mockHoldingsGet())
    await renderPanel()

    const toggle = screen.getByTestId('edit-holdings-toggle')

    // Open, type password
    fireEvent.click(toggle)
    fireEvent.change(screen.getByTestId('input-password'), {
      target: { value: 'secret123' },
    })
    expect(screen.getByTestId('input-password')).toHaveValue('secret123')

    // Close — form is hidden with display:none, NOT unmounted
    fireEvent.click(toggle)

    // Reopen — password must still be in the input
    fireEvent.click(toggle)
    expect(screen.getByTestId('input-password')).toHaveValue('secret123')
  })
})

// ---------------------------------------------------------------------------
// EditHoldingsPanel — pre-population from API
// ---------------------------------------------------------------------------

describe('EditHoldingsPanel — pre-population', () => {
  it('fetches GET /api/holdings on mount', async () => {
    mockFetch.mockResolvedValue(mockHoldingsGet())
    render(<EditHoldingsPanel onHoldingsSaved={vi.fn()} />)
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/holdings')
    })
  })

  it('pre-populates BTC qty from API response', async () => {
    mockFetch.mockResolvedValue(mockHoldingsGet())
    render(<EditHoldingsPanel onHoldingsSaved={vi.fn()} />)
    fireEvent.click(screen.getByTestId('edit-holdings-toggle'))
    await waitFor(() => {
      // MOCK_HOLDINGS.btc.qty = 3.2 → String(3.2) = '3.2'
      expect(screen.getByTestId('input-btc-qty')).toHaveValue(3.2)
    })
  })

  it('pre-populates dry powder from API response', async () => {
    mockFetch.mockResolvedValue(mockHoldingsGet())
    render(<EditHoldingsPanel onHoldingsSaved={vi.fn()} />)
    fireEvent.click(screen.getByTestId('edit-holdings-toggle'))
    await waitFor(() => {
      expect(screen.getByTestId('input-dry-powder')).toHaveValue(12000)
    })
  })
})

// ---------------------------------------------------------------------------
// EditHoldingsPanel — save behaviour
// ---------------------------------------------------------------------------

describe('EditHoldingsPanel — save', () => {
  it('calls PUT /api/holdings on form submit', async () => {
    // First call: GET /api/holdings (mount)
    // Second call: PUT /api/holdings (save)
    mockFetch
      .mockResolvedValueOnce(mockHoldingsGet())
      .mockResolvedValueOnce(mockOkPut())

    render(<EditHoldingsPanel onHoldingsSaved={vi.fn()} />)
    fireEvent.click(screen.getByTestId('edit-holdings-toggle'))

    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith('/api/holdings'))

    fireEvent.click(screen.getByTestId('edit-holdings-save'))

    await waitFor(() => {
      const putCall = mockFetch.mock.calls.find(
        ([url, opts]) => url === '/api/holdings' && opts?.method === 'PUT'
      )
      expect(putCall).toBeDefined()
    })
  })

  it('calls onHoldingsSaved after successful save', async () => {
    const onSaved = vi.fn()
    mockFetch
      .mockResolvedValueOnce(mockHoldingsGet())
      .mockResolvedValueOnce(mockOkPut())

    render(<EditHoldingsPanel onHoldingsSaved={onSaved} />)
    fireEvent.click(screen.getByTestId('edit-holdings-toggle'))
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith('/api/holdings'))

    fireEvent.click(screen.getByTestId('edit-holdings-save'))

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1))
  })

  it('shows error message on 401 response', async () => {
    mockFetch
      .mockResolvedValueOnce(mockHoldingsGet())
      .mockResolvedValueOnce({
        ok: false,
        text: async () => 'Unauthorized',
      })

    render(<EditHoldingsPanel onHoldingsSaved={vi.fn()} />)
    fireEvent.click(screen.getByTestId('edit-holdings-toggle'))
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith('/api/holdings'))

    fireEvent.click(screen.getByTestId('edit-holdings-save'))

    await waitFor(() => {
      expect(screen.getByTestId('edit-holdings-error')).toHaveTextContent('Unauthorized')
    })
  })
})

// ---------------------------------------------------------------------------
// Page — demo mode: EditHoldingsPanel absent from DOM
// ---------------------------------------------------------------------------

describe('Page — EditHoldingsPanel absent in demo mode', () => {
  it('EditHoldingsPanel is not in the DOM when mode is demo', async () => {
    // page.tsx fetches /api/portfolio on mount — return demo portfolio
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => DEMO_PORTFOLIO_STATE,
    })

    render(<Page />)

    // Wait for portfolio to load (skeleton disappears, content appears)
    await waitFor(() => {
      // Checklist is rendered in demo mode
      expect(screen.getByTestId('checklist')).toBeInTheDocument()
    })

    // EditHoldingsPanel must be completely absent (not hidden — absent)
    expect(screen.queryByTestId('edit-holdings-panel')).not.toBeInTheDocument()
  })
})
