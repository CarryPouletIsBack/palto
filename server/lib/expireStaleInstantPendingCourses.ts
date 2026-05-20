import type { SupabaseClient } from '@supabase/supabase-js'

/** Délai max pour qu'un chauffeur accepte une course « partir maintenant ». */
export const INSTANT_PENDING_ACCEPT_TIMEOUT_MS = 6 * 60 * 1000

const CANCEL_REASON = 'Delai acceptation depasse (6 minutes)'

export type ExpireStaleInstantPendingResult = {
  expiredCount: number
  courseIds: string[]
}

/**
 * Annule les courses instantanées restées `pending` sans acceptation après le délai.
 * Source de vérité : `created_at` (commande enregistrée).
 */
export async function expireStaleInstantPendingCourses(
  supabase: SupabaseClient,
  options?: { timeoutMs?: number; now?: Date }
): Promise<ExpireStaleInstantPendingResult> {
  const timeoutMs = options?.timeoutMs ?? INSTANT_PENDING_ACCEPT_TIMEOUT_MS
  const now = options?.now ?? new Date()
  const cutoffIso = new Date(now.getTime() - timeoutMs).toISOString()

  const { data: stale, error: selectErr } = await supabase
    .from('courses')
    .select('id')
    .eq('status', 'pending')
    .eq('booking_kind', 'instant')
    .lt('created_at', cutoffIso)

  if (selectErr) {
    console.error('[expireStaleInstantPendingCourses] select', selectErr)
    throw selectErr
  }

  const courseIds = (stale ?? []).map((r) => String(r.id)).filter(Boolean)
  if (courseIds.length === 0) {
    return { expiredCount: 0, courseIds: [] }
  }

  const nowIso = now.toISOString()
  const { data: updated, error: updateErr } = await supabase
    .from('courses')
    .update({
      status: 'cancelled',
      cancelled_at: nowIso,
      cancelled_reason: CANCEL_REASON,
      updated_at: nowIso,
    })
    .in('id', courseIds)
    .eq('status', 'pending')
    .eq('booking_kind', 'instant')
    .select('id')

  if (updateErr) {
    console.error('[expireStaleInstantPendingCourses] update', updateErr)
    throw updateErr
  }

  const expiredIds = (updated ?? []).map((r) => String(r.id))
  if (expiredIds.length > 0) {
    await supabase.from('course_events').insert(
      expiredIds.map((courseId) => ({
        course_id: courseId,
        event_type: 'cancelled',
        event_note: CANCEL_REASON,
        payload: { reason: 'instant_pending_timeout' },
      }))
    )
  }

  return { expiredCount: expiredIds.length, courseIds: expiredIds }
}
