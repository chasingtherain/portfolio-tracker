import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../lib/kv', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/kv')>()
  return {
    ...actual,
    getChecklist: vi.fn(),
    setChecklist: vi.fn(),
  }
})

import { GET, PUT } from '../app/api/checklist/route'
import { getChecklist, setChecklist } from '../lib/kv'
import type { ChecklistState } from '../lib/types'

const mockGetChecklist = vi.mocked(getChecklist)
const mockSetChecklist = vi.mocked(setChecklist)

const ALL_FALSE: ChecklistState = Array(8).fill(false) as ChecklistState
const PARTIAL: ChecklistState   = [true, false, true, false, false, false, true, false]

function makePutRequest(body: unknown): Request {
  return new Request('http://localhost/api/checklist', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ---------------------------------------------------------------------------
// Demo mode — both GET and PUT return 404
// ---------------------------------------------------------------------------

describe('checklist — demo mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('MODE', 'demo')
  })
  afterEach(() => vi.unstubAllEnvs())

  it('GET returns 404', async () => {
    const res = await GET()
    expect(res.status).toBe(404)
  })

  it('GET does not call getChecklist', async () => {
    await GET()
    expect(mockGetChecklist).not.toHaveBeenCalled()
  })

  it('PUT returns 404', async () => {
    const req = makePutRequest(ALL_FALSE)
    const res = await PUT(req)
    expect(res.status).toBe(404)
  })

  it('PUT does not call setChecklist', async () => {
    const req = makePutRequest(ALL_FALSE)
    await PUT(req)
    expect(mockSetChecklist).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Live mode — GET
// ---------------------------------------------------------------------------

describe('GET /api/checklist — live mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('MODE', 'live')
  })
  afterEach(() => vi.unstubAllEnvs())

  it('returns 200', async () => {
    mockGetChecklist.mockResolvedValue(ALL_FALSE)
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it('returns the checklist state from KV', async () => {
    mockGetChecklist.mockResolvedValue(PARTIAL)
    const res = await GET()
    const body = await res.json()
    expect(body).toEqual(PARTIAL)
  })

  it('calls getChecklist', async () => {
    mockGetChecklist.mockResolvedValue(ALL_FALSE)
    await GET()
    expect(mockGetChecklist).toHaveBeenCalledOnce()
  })
})

// ---------------------------------------------------------------------------
// Live mode — PUT
// ---------------------------------------------------------------------------

describe('PUT /api/checklist — live mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('MODE', 'live')
    mockSetChecklist.mockResolvedValue(undefined)
  })
  afterEach(() => vi.unstubAllEnvs())

  it('returns 200 for valid 8-element boolean array', async () => {
    const req = makePutRequest(PARTIAL)
    const res = await PUT(req)
    expect(res.status).toBe(200)
  })

  it('returns { ok: true }', async () => {
    const req = makePutRequest(PARTIAL)
    const res = await PUT(req)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it('calls setChecklist with the submitted state', async () => {
    const req = makePutRequest(PARTIAL)
    await PUT(req)
    expect(mockSetChecklist).toHaveBeenCalledWith(PARTIAL)
  })

  it('returns 400 for invalid JSON', async () => {
    const req = new Request('http://localhost/api/checklist', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: 'bad json',
    })
    const res = await PUT(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when array has wrong length (7 items)', async () => {
    const req = makePutRequest([true, false, false, false, false, false, false])
    const res = await PUT(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when array contains non-boolean values', async () => {
    const req = makePutRequest([1, 0, 0, 0, 0, 0, 0, 0])
    const res = await PUT(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when body is not an array', async () => {
    const req = makePutRequest({ checked: true })
    const res = await PUT(req)
    expect(res.status).toBe(400)
  })
})
