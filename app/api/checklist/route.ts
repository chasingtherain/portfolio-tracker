export const runtime = 'nodejs'

import type { ChecklistState } from '@/lib/types'
import { getChecklist, setChecklist } from '@/lib/kv'

// Checklist is live mode only — in demo mode, state lives in React (client-side)
function isDemoMode(): boolean {
  return process.env.MODE !== 'live'
}

export async function GET(): Promise<Response> {
  if (isDemoMode()) {
    return new Response('Not found', { status: 404 })
  }

  const state = await getChecklist()
  return Response.json(state)
}

export async function PUT(request: Request): Promise<Response> {
  if (isDemoMode()) {
    return new Response('Not found', { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  if (
    !Array.isArray(body) ||
    body.length !== 8 ||
    !body.every(v => typeof v === 'boolean')
  ) {
    return new Response('Invalid checklist: expected 8-element boolean array', { status: 400 })
  }

  await setChecklist(body as ChecklistState)
  return Response.json({ ok: true })
}
