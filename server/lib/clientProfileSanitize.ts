import { z } from 'zod'

const PreferredPaymentSchema = z.enum(['indifferent', 'card', 'cash'])

const AccountSnapshotSchema = z
  .object({
    prenom: z.string().max(120).optional(),
    nom: z.string().max(120).optional(),
    email: z.string().max(320).optional(),
    telephone: z.string().max(40).optional(),
    ville: z.string().max(200).optional(),
    preferredPayment: PreferredPaymentSchema.optional(),
    profilePhotoUrl: z.string().max(600_000).nullable().optional(),
    profilePhotoName: z.string().max(260).optional(),
  })
  .passthrough()

const CoordsSchema = z
  .object({
    lng: z.number().finite(),
    lat: z.number().finite(),
  })
  .strict()

const PlaceExtraSchema = z
  .object({
    id: z.string().max(80),
    label: z.string().max(200),
    address: z.string().max(500),
    coords: CoordsSchema.nullable().optional(),
  })
  .strict()

const SavedPlacesSchema = z
  .object({
    domicile: z.string().max(500).optional(),
    domicileCoords: CoordsSchema.nullable().optional(),
    travail: z.string().max(500).optional(),
    travailCoords: CoordsSchema.nullable().optional(),
    extras: z.array(PlaceExtraSchema).max(30).optional(),
  })
  .passthrough()

export type SanitizedClientAccountSnapshot = z.infer<typeof AccountSnapshotSchema>
export type SanitizedClientSavedPlacesSnapshot = z.infer<typeof SavedPlacesSchema>

export function sanitizeAccountSnapshot(raw: unknown): SanitizedClientAccountSnapshot {
  const parsed = AccountSnapshotSchema.safeParse(raw ?? {})
  if (!parsed.success) return {}
  return parsed.data
}

export function sanitizeSavedPlacesSnapshot(raw: unknown): SanitizedClientSavedPlacesSnapshot {
  const parsed = SavedPlacesSchema.safeParse(raw ?? {})
  if (!parsed.success) return { domicile: '', travail: '', extras: [] }
  return {
    domicile: parsed.data.domicile ?? '',
    travail: parsed.data.travail ?? '',
    domicileCoords: parsed.data.domicileCoords ?? null,
    travailCoords: parsed.data.travailCoords ?? null,
    extras: parsed.data.extras ?? [],
  }
}

export function accountSnapshotHasContent(s: SanitizedClientAccountSnapshot): boolean {
  return Boolean(
    (s.prenom && s.prenom.trim()) ||
      (s.nom && s.nom.trim()) ||
      (s.telephone && s.telephone.trim()) ||
      (s.ville && s.ville.trim()) ||
      (s.profilePhotoUrl && String(s.profilePhotoUrl).trim())
  )
}

export function savedPlacesSnapshotHasContent(s: SanitizedClientSavedPlacesSnapshot): boolean {
  const dom = (s.domicile ?? '').trim()
  const trav = (s.travail ?? '').trim()
  const extras = Array.isArray(s.extras) ? s.extras : []
  return Boolean(dom || trav || extras.length > 0)
}
