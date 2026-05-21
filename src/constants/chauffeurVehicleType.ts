/** Types véhicule alignés sur `app_accounts.vehicle_type` et la page Go. */
export const CHAUFFEUR_VEHICLE_TYPES = ['berline', 'utilitaire', 'moto', 'scooter'] as const

export type ChauffeurVehicleType = (typeof CHAUFFEUR_VEHICLE_TYPES)[number]

export const CHAUFFEUR_VEHICLE_TYPE_LABELS: Record<ChauffeurVehicleType, string> = {
  berline: 'Berline',
  utilitaire: 'Utilitaire',
  moto: 'Moto',
  scooter: 'Scooter',
}

export function isChauffeurVehicleType(value: string): value is ChauffeurVehicleType {
  return (CHAUFFEUR_VEHICLE_TYPES as readonly string[]).includes(value)
}

/** Slug stocké en base → libellé affiché (dashboard, Go). */
export function chauffeurVehicleTypeLabel(slug: string | null | undefined): string {
  const key = (slug ?? '').trim().toLowerCase()
  if (!key || !isChauffeurVehicleType(key)) return ''
  return CHAUFFEUR_VEHICLE_TYPE_LABELS[key]
}

/** Valeur fiable pour `<select>` (slug ou libellé legacy → slug). */
export function normalizeVehicleSlugForSelect(value: string | null | undefined): ChauffeurVehicleType | '' {
  const raw = (value ?? '').trim()
  if (!raw) return ''
  const lower = raw.toLowerCase()
  if (isChauffeurVehicleType(lower)) return lower
  const fromLabel = (
    Object.entries(CHAUFFEUR_VEHICLE_TYPE_LABELS) as [ChauffeurVehicleType, string][]
  ).find(([, label]) => label.toLowerCase() === lower)
  return fromLabel?.[0] ?? ''
}
