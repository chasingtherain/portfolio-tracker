export const runtime = 'nodejs'

import { kv }          from '@vercel/kv'
import type { DecisionEntry } from '@/lib/decisions.types'

const DECISIONS_KEY = 'decisions'

/**
 * PATCH /api/decisions/:id — update the notes field of an existing entry.
 *
 * Notes are user-added context ("why I made this call") that don't affect
 * alignment scoring. Only the notes field is writable after creation.
 *
 * Implementation: sorted sets don't support in-place updates, so we
 * read the full set, find the entry, remove it, update notes, and re-add it.
 * This is acceptable for a personal tracker with a small dataset.
 */
export async function PATCH(
  req:     Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params

  let body: { notes: string }
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  if (typeof body.notes !== 'string') {
    return new Response('notes must be a string', { status: 400 })
  }

  // Fetch all members from the sorted set to find the target entry
  const raw = await kv.zrevrange(DECISIONS_KEY, 0, -1)
  const members = raw as string[]

  const targetRaw = members.find(m => {
    try {
      return (JSON.parse(m) as DecisionEntry).id === id
    } catch {
      return false
    }
  })

  if (!targetRaw) {
    return new Response('Decision not found', { status: 404 })
  }

  const entry: DecisionEntry = JSON.parse(targetRaw)
  const updated: DecisionEntry = { ...entry, notes: body.notes }

  // Remove old member and re-add with updated notes, preserving the timestamp score
  await kv.zrem(DECISIONS_KEY, targetRaw)
  await kv.zadd(DECISIONS_KEY, {
    score:  entry.timestamp,
    member: JSON.stringify(updated),
  })

  return Response.json(updated)
}
