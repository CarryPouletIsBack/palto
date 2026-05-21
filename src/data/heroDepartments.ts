import type { GeoPoint } from '../services/distanceGeo'

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

/** Centre de zone pour le départ par défaut sur /go (évite l’adresse dev Le Port). */
export const HERO_DEPARTMENT_ORIGIN: Record<HeroDepartmentId, GeoPoint> = {
  '974': { latitude: -20.8789, longitude: 55.4481 },
  '974-nord': { latitude: -20.8789, longitude: 55.4481 },
  '974-ouest': { latitude: -21.0092, longitude: 55.2708 },
  '974-sud': { latitude: -21.3158, longitude: 55.4784 },
  '974-est': { latitude: -21.0235, longitude: 55.7134 },
}

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

export function getHeroDepartmentOrigin(id: string): GeoPoint {
  return HERO_DEPARTMENT_ORIGIN[id as HeroDepartmentId] ?? HERO_DEPARTMENT_ORIGIN['974']
}
