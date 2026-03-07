import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'

import { DecisionTimeline } from '../components/DecisionTimeline'

const mockFetch = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch)
  mockFetch.mockReset()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function mockDecisionGet() {
  return {
    ok: true,
    json: async () => ({ entries: [], total: 0 }),
  }
}

describe('DecisionTimeline — refresh', () => {
  it('re-fetches decisions when savedAt changes', async () => {
    mockFetch.mockResolvedValue(mockDecisionGet())

    const { rerender } = render(<DecisionTimeline mode="live" savedAt={0} />)

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))

    rerender(<DecisionTimeline mode="live" savedAt={123456} />)

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2))
  })
})
