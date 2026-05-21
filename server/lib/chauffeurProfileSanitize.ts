import { z } from 'zod'

const ChauffeurProfileSnapshotSchema = z
  .object({
    prenom: z.string().max(120).optional(),
    nom: z.string().max(120).optional(),
    email: z.string().max(320).optional(),
    telephone: z.string().max(40).optional(),
    ville: z.string().max(200).optional(),
    vehicule: z.string().max(80).optional(),
    plaque: z.string().max(20).optional(),
    profilePhotoUrl: z.string().max(600_000).nullable().optional(),
    organizationPhotoUrl: z.string().max(600_000).nullable().optional(),
    vehiclePhotoUrl: z.string().max(600_000).nullable().optional(),
    profilePhotoName: z.string().max(260).optional(),
    organizationPhotoName: z.string().max(260).optional(),
    vehiclePhotoName: z.string().max(260).optional(),
  })
  .passthrough()

export type SanitizedChauffeurProfileSnapshot = z.infer<typeof ChauffeurProfileSnapshotSchema>

export function sanitizeChauffeurProfileSnapshot(raw: unknown): SanitizedChauffeurProfileSnapshot {
  const parsed = ChauffeurProfileSnapshotSchema.safeParse(raw ?? {})
  if (!parsed.success) return {}
  return parsed.data
}

export function chauffeurProfileSnapshotHasContent(s: SanitizedChauffeurProfileSnapshot): boolean {
  return Boolean(
    (s.prenom && s.prenom.trim()) ||
      (s.nom && s.nom.trim()) ||
      (s.telephone && s.telephone.trim()) ||
      (s.ville && s.ville.trim()) ||
      (s.plaque && s.plaque.trim()) ||
      (s.vehicule && s.vehicule.trim()) ||
      (s.profilePhotoUrl && String(s.profilePhotoUrl).trim())
  )
}
