/** Départements / zones de desserte affichés sur l’accueil (select masqué pour l’instant). */
export type HeroDepartmentId =
  | '974'
  | '974-nord'
  | '974-ouest'
  | '974-sud'
  | '974-est'

export type HeroDepartment = {
  id: HeroDepartmentId
  labelFr: string
  labelEn: string
  /** Contexte géocodage / préremplissage page Go. */
  geocodeArea: string
}

export const HERO_DEPARTMENTS: readonly HeroDepartment[] = [
  { id: '974', labelFr: 'La Réunion', labelEn: 'Réunion Island', geocodeArea: 'La Réunion' },
  { id: '974-nord', labelFr: 'La Réunion — Nord', labelEn: 'Réunion — North', geocodeArea: 'La Réunion' },
  { id: '974-ouest', labelFr: 'La Réunion — Ouest', labelEn: 'Réunion — West', geocodeArea: 'La Réunion' },
  { id: '974-sud', labelFr: 'La Réunion — Sud', labelEn: 'Réunion — South', geocodeArea: 'La Réunion' },
  { id: '974-est', labelFr: 'La Réunion — Est', labelEn: 'Réunion — East', geocodeArea: 'La Réunion' },
] as const

export const DEFAULT_HERO_DEPARTMENT_ID: HeroDepartmentId = '974'

const byId = new Map(HERO_DEPARTMENTS.map((d) => [d.id, d]))

export function getHeroDepartment(id: string): HeroDepartment | undefined {
  return byId.get(id as HeroDepartmentId)
}

export function getHeroDepartmentLabel(id: string, language: 'fr' | 'en'): string {
  const row = getHeroDepartment(id)
  if (!row) return language === 'en' ? 'Réunion Island' : 'La Réunion'
  return language === 'en' ? row.labelEn : row.labelFr
}

export function getHeroDepartmentGeocodeArea(id: string): string {
  return getHeroDepartment(id)?.geocodeArea ?? 'La Réunion'
}
