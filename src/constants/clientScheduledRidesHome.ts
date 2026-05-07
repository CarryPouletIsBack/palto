/**
 * Courses « programmées » affichées sur l’accueil pour un passager connecté.
 * Persistance optionnelle : `palto:client_scheduled_rides_home_v1` (JSON array).
 * Si la clé est absente, des exemples relatifs à la date du jour sont utilisés.
 */

export const CLIENT_SCHEDULED_RIDES_HOME_STORAGE_KEY = 'palto:client_scheduled_rides_home_v1'

export type ClientScheduledRideHome = {
  id: string
  departShort: string
  arriveShort: string
  /** Horodatage interprété en heure locale, ex. 2026-05-12T09:15:00 */
  startsAtIso: string
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function toLocalIso(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:00`
}

function buildDemoUpcomingFromNow(now: Date): ClientScheduledRideHome[] {
  const c = new Date(now)
  c.setDate(c.getDate() + 1)
  c.setHours(7, 0, 0, 0)
  const a = new Date(now)
  a.setDate(a.getDate() + 2)
  a.setHours(9, 15, 0, 0)
  const b = new Date(now)
  b.setDate(b.getDate() + 5)
  b.setHours(17, 45, 0, 0)
  return [
    { id: 'palto-demo-1', departShort: 'Saint-Denis', arriveShort: 'Roland-Garros', startsAtIso: toLocalIso(c) },
    { id: 'palto-demo-2', departShort: 'Le Port', arriveShort: 'Saint-Pierre', startsAtIso: toLocalIso(a) },
    { id: 'palto-demo-3', departShort: 'Saint-Paul', arriveShort: 'Saint-Leu', startsAtIso: toLocalIso(b) },
  ]
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

/** `null` = clé absente (utiliser la démo). `[]` = aucune course enregistrée. */
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
  const base = stored === null ? buildDemoUpcomingFromNow(now) : stored
  const t0 = now.getTime()
  return base
    .map((r) => ({ r, t: new Date(r.startsAtIso).getTime() }))
    .filter(({ t }) => !Number.isNaN(t) && t > t0)
    .sort((a, b) => a.t - b.t)
    .map(({ r }) => r)
}
