/** Commission Palto ajoutée au tarif chauffeur (EUR). */
export const PALTO_PLATFORM_FEE_EUR = 2

/** Frais d’annulation client (course en cours / no-show), en EUR. */
export const CLIENT_CANCELLATION_FEE_EUR = 5

/** Part chauffeur sur les frais d’annulation (MVP : enregistrée, versement Connect plus tard). */
export const CANCELLATION_DRIVER_SHARE_EUR = 4

/** Part Palto sur les frais d’annulation. */
export const CANCELLATION_PALTO_SHARE_EUR = 1

/** Annulation « juste après acceptation » : remboursement intégral (release). */
export const ACCEPT_CANCEL_GRACE_MS = 3 * 60 * 1000

/** Client annule alors que le chauffeur est considéré « en route ». */
export const CLIENT_CANCEL_EN_ROUTE_MS = 5 * 60 * 1000

export function eurosToCents(eur: number): number {
  return Math.max(0, Math.round(eur * 100))
}

export function totalChargeEur(driverAmountEur: number, paltoFeeEur = PALTO_PLATFORM_FEE_EUR): number {
  const driver = Number.isFinite(driverAmountEur) ? Math.max(0, driverAmountEur) : 0
  const fee = Number.isFinite(paltoFeeEur) ? Math.max(0, paltoFeeEur) : PALTO_PLATFORM_FEE_EUR
  return Math.round((driver + fee) * 100) / 100
}

export function stripeSecretConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim())
}

export function stripeWebhookConfigured(): boolean {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
  if (!secret || secret.includes('...')) return false
  return secret.startsWith('whsec_')
}
