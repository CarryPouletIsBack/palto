import { z } from 'zod'

const RidePricingFieldsSchema = z.object({
  baseFareEur: z.string().max(32).optional(),
  pricePerKmEur: z.string().max(32).optional(),
  nightSurchargePercent: z.string().max(32).optional(),
  elevationSurchargeEurPer100m: z.string().max(32).optional(),
  maxPickupKm: z.string().max(32).optional(),
  pricingMultiplierPercent: z.number().finite().min(90).max(110).optional(),
})

export type SanitizedRidePricingFields = z.infer<typeof RidePricingFieldsSchema>

const ChauffeurProfileSnapshotSchema = z
  .object({
    prenom: z.string().max(120).optional(),
    nom: z.string().max(120).optional(),
    email: z.string().max(320).optional(),
    telephone: z.string().max(40).optional(),
    adresse: z.string().max(200).optional(),
    ville: z.string().max(200).optional(),
    vehicule: z.string().max(80).optional(),
    vehicleModel: z.string().max(120).optional(),
    plaque: z.string().max(20).optional(),
    motorisation: z.enum(['thermique_hydrogene_hybride', 'electrique_100']).optional(),
    licenseYear: z.number().int().min(1970).max(2100).optional(),
    isVtc: z.boolean().optional(),
    profilePhotoUrl: z.string().max(600_000).nullable().optional(),
    organizationPhotoUrl: z.string().max(600_000).nullable().optional(),
    vehiclePhotoUrl: z.string().max(600_000).nullable().optional(),
    profilePhotoName: z.string().max(260).optional(),
    organizationPhotoName: z.string().max(260).optional(),
    vehiclePhotoName: z.string().max(260).optional(),
    ridePricing: RidePricingFieldsSchema.optional(),
  })
  .passthrough()

export type SanitizedChauffeurProfileSnapshot = z.infer<typeof ChauffeurProfileSnapshotSchema>

function sanitizeRidePricing(raw: unknown): SanitizedRidePricingFields | undefined {
  const parsed = RidePricingFieldsSchema.safeParse(raw)
  if (!parsed.success) return undefined
  const o = parsed.data
  const has =
    o.baseFareEur?.trim() ||
    o.pricePerKmEur?.trim() ||
    o.nightSurchargePercent?.trim() ||
    o.elevationSurchargeEurPer100m?.trim() ||
    o.maxPickupKm?.trim() ||
    o.pricingMultiplierPercent != null
  return has ? o : undefined
}

export function sanitizeChauffeurProfileSnapshot(raw: unknown): SanitizedChauffeurProfileSnapshot {
  const parsed = ChauffeurProfileSnapshotSchema.safeParse(raw ?? {})
  if (!parsed.success) return {}
  const base = parsed.data
  const ridePricing = sanitizeRidePricing(
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>).ridePricing
      : undefined
  )
  return ridePricing ? { ...base, ridePricing } : base
}

function ridePricingHasContent(rp: SanitizedRidePricingFields | undefined): boolean {
  if (!rp) return false
  return Boolean(
    rp.baseFareEur?.trim() ||
      rp.pricePerKmEur?.trim() ||
      rp.nightSurchargePercent?.trim() ||
      rp.elevationSurchargeEurPer100m?.trim() ||
      rp.maxPickupKm?.trim() ||
      rp.pricingMultiplierPercent != null
  )
}

export function chauffeurProfileSnapshotHasContent(s: SanitizedChauffeurProfileSnapshot): boolean {
  return Boolean(
    (s.prenom && s.prenom.trim()) ||
      (s.nom && s.nom.trim()) ||
      (s.telephone && s.telephone.trim()) ||
      (s.ville && s.ville.trim()) ||
      (s.plaque && s.plaque.trim()) ||
      (s.vehicule && s.vehicule.trim()) ||
      (s.profilePhotoUrl && String(s.profilePhotoUrl).trim()) ||
      ridePricingHasContent(s.ridePricing)
  )
}
