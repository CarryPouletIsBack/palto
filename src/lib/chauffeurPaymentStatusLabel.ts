import type { CourseStatut } from '../types/chauffeurCoursePlanning'

export type ChauffeurCoursePaymentUi = {
  statut: CourseStatut
  modePaiement?: 'carte' | 'especes'
  stripePaymentStatus?: string | null
  cancellationFeeCapturedCents?: number | null
  cancelledReason?: string | null
}

/** Libellé paiement / remboursement pour une course annulée (dashboard chauffeur). */
export function chauffeurCancelledPaymentLabel(course: ChauffeurCoursePaymentUi): string {
  if (course.statut !== 'Annulee') return ''
  const reason = (course.cancelledReason ?? '').trim()
  if (course.modePaiement !== 'carte') {
    return reason
      ? `Annulation — especes. ${reason}`
      : 'Annulation — paiement especes (hors Stripe).'
  }
  const st = (course.stripePaymentStatus ?? '').trim().toLowerCase()
  if (st === 'canceled' || st === 'cancelled') {
    return reason
      ? `Remboursement : autorisation carte liberee. ${reason}`
      : 'Remboursement : autorisation carte liberee (annulation).'
  }
  if (st === 'succeeded' && (course.cancellationFeeCapturedCents ?? 0) > 0) {
    const eur = ((course.cancellationFeeCapturedCents ?? 0) / 100).toFixed(2).replace('.', ',')
    return reason
      ? `Frais annulation ${eur} EUR captures sur la carte. ${reason}`
      : `Frais annulation ${eur} EUR captures sur la carte.`
  }
  if (st === 'requires_capture' || st === 'requires_confirmation' || st === 'requires_action') {
    return 'Paiement carte en attente — annulation en cours cote Stripe.'
  }
  if (reason) return `Course annulee. ${reason}`
  return 'Course annulee — statut paiement carte a verifier.'
}
