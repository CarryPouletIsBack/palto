/**
 * Courses « programmées » affichées sur l’accueil pour un passager connecté.
 * Persistance optionnelle : `palto:client_scheduled_rides_home_v1` (JSON array).
 * Si la clé est absente, aucune course n’est affichée.
 */

export const CLIENT_SCHEDULED_RIDES_HOME_STORAGE_KEY = 'palto:client_scheduled_rides_home_v1'

export type ClientScheduledRideHome = {
  id: string
  departShort: string
  arriveShort: string
  /** Horodatage interprété en heure locale, ex. 2026-05-12T09:15:00 */
  startsAtIso: string
}

function isValidRide(x: unknown): x is ClientScheduledRideHome {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    typeof o.departShort === 'string' &&
    typeof o.arriveShort === 'string' &&
    typeof o.startsAtIso === 'string' &&
    !Number.isNaN(Date.parse(o.startsAtIso))
  )
}

/** `null` = clé absente (données par défaut). `[]` = aucune course enregistrée. */
export function loadClientScheduledRidesHomeRaw(): ClientScheduledRideHome[] | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(CLIENT_SCHEDULED_RIDES_HOME_STORAGE_KEY)
    if (raw === null) return null
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isValidRide)
  } catch {
    return []
  }
}

export function getUpcomingScheduledRidesForHomeBanner(now: Date = new Date()): ClientScheduledRideHome[] {
  const stored = loadClientScheduledRidesHomeRaw()
  const base = stored === null ? [] : stored
  const t0 = now.getTime()
  return base
    .map((r) => ({ r, t: new Date(r.startsAtIso).getTime() }))
    .filter(({ t }) => !Number.isNaN(t) && t > t0)
    .sort((a, b) => a.t - b.t)
    .map(({ r }) => r)
}
