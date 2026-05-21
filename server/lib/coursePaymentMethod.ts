import type { SupabaseClient } from '@supabase/supabase-js'

export type CoursePaymentMethod = 'card' | 'cash'

/** Colonnes courses pour GET chauffeur (hors payment_method si migration 0011 absente). */
export const CHAUFFEUR_RIDES_SELECT_BASE =
  'id, external_code, client_id, scheduled_date, scheduled_time, pickup_address, dropoff_address, status, amount_eur, distance_km, pickup_lng, pickup_lat, dropoff_lng, dropoff_lat, booking_kind, requested_driver_external_key, assigned_driver_external_key, accepted_at, started_at, completed_at, cancelled_at, created_at'

export const CHAUFFEUR_RIDES_SELECT_WITH_PAYMENT = `${CHAUFFEUR_RIDES_SELECT_BASE}, payment_method, stripe_payment_intent_id`

export const PAYMENT_METHOD_COLUMN_MISSING_HINT =
  'Colonne courses.payment_method absente : executez scripts/apply-migration-0011.sql dans le SQL Editor Supabase.'

export function isCoursePaymentMethodColumnMissing(error: {
  code?: string
  message?: string
  details?: string
  hint?: string
} | null): boolean {
  if (!error) return false
  const code = String(error.code ?? '')
  const msg = `${error.message ?? ''} ${error.details ?? ''} ${error.hint ?? ''}`.toLowerCase()
  if (code === '42703') return msg.includes('payment_method')
  return (
    msg.includes('payment_method') &&
    (msg.includes('does not exist') ||
      msg.includes('not found') ||
      msg.includes('schema cache') ||
      msg.includes('could not find'))
  )
}

export function parseCoursePaymentMethod(raw: unknown): CoursePaymentMethod {
  const v = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  if (v === 'card' || v === 'carte') return 'card'
  if (v === 'cash' || v === 'especes' || v === 'espèces') return 'cash'
  return 'cash'
}

/** Mode affiché chauffeur (carte / espèces). */
export function modePaiementFromCourse(row: {
  payment_method?: string | null
  stripe_payment_intent_id?: string | null
}): 'carte' | 'especes' {
  const pm = parseCoursePaymentMethod(row.payment_method)
  if (pm === 'card') return 'carte'
  if (row.stripe_payment_intent_id?.trim()) return 'carte'
  return 'especes'
}

export async function queryChauffeurCoursesList(supabase: SupabaseClient) {
  const full = await supabase
    .from('courses')
    .select(CHAUFFEUR_RIDES_SELECT_WITH_PAYMENT)
    .order('created_at', { ascending: false })
    .limit(200)
  if (!full.error || !isCoursePaymentMethodColumnMissing(full.error)) {
    return full
  }
  console.warn('[courses] payment_method column missing, fallback select without it')
  return supabase
    .from('courses')
    .select(`${CHAUFFEUR_RIDES_SELECT_BASE}, stripe_payment_intent_id`)
    .order('created_at', { ascending: false })
    .limit(200)
}
