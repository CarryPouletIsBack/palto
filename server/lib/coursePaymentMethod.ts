export type CoursePaymentMethod = 'card' | 'cash'

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
