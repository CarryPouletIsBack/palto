/**
 * Types et mock local pour chauffeurs à proximité.
 * La page Go utilise `getNearbyDrivers()` (`src/services/`) → API présence live uniquement.
 */
import { DEFAULT_USER_ORIGIN } from '../constants/defaultUserOrigin'
import type { GeoPoint } from '../services/distanceGeo'

/** Chauffeur fictif pour l’overlay + marqueurs carte. */
export type NearbyDriver = {
  id: string
  name: string
  moto: string
  distance: string
  price: string
  longitude: number
  latitude: number
}

export type NearbyDriversQuery = {
  origin?: GeoPoint
  radiusKm?: number
  limit?: number
}

type DriverTemplate = {
  id: string
  name: string
  moto: string
  basePriceEur: number
  speedKmh: number
}

/** Comptes chauffeur réels (UUID) → libellé affiché sur la page Go. */
const ACCOUNT_DISPLAY_OVERRIDES: Record<string, Pick<DriverTemplate, 'name' | 'moto'>> = {
  'e09f65c3-f47e-413c-ba41-2ea2749f86ec': { name: 'Océane P.', moto: 'Moto' },
}

const DRIVER_TEMPLATES: DriverTemplate[] = [
  { id: 'd1', name: 'Karim L.', moto: 'Maxi-scooter', basePriceEur: 8.5, speedKmh: 25 },
  { id: 'd2', name: 'Sophie R.', moto: 'Scooter', basePriceEur: 9, speedKmh: 22 },
  { id: 'd3', name: 'Jean-Marc P.', moto: 'Moto', basePriceEur: 7.5, speedKmh: 28 },
  { id: 'd4', name: 'Nadia T.', moto: 'Scooter', basePriceEur: 8, speedKmh: 23 },
  { id: 'd5', name: 'Romain C.', moto: 'Maxi-scooter', basePriceEur: 10, speedKmh: 24 },
  { id: 'd6', name: 'Leila M.', moto: 'Moto', basePriceEur: 7.8, speedKmh: 27 },
  { id: 'd7', name: 'Damien V.', moto: 'Scooter', basePriceEur: 9.2, speedKmh: 21 },
  { id: 'd8', name: 'Sarah B.', moto: 'Moto', basePriceEur: 8.3, speedKmh: 26 },
  { id: 'd9', name: 'Yanis D.', moto: 'Maxi-scooter', basePriceEur: 10.5, speedKmh: 24 },
]

/**
 * Remplace les ids mock (d1, …) par des UUID `app_accounts` chauffeur si
 * `VITE_NEARBY_DRIVER_ACCOUNT_IDS` est défini (liste séparée par des virgules, même ordre que les templates).
 */
function driverTemplatesWithOptionalAccountIds(): DriverTemplate[] {
  const raw = (import.meta.env.VITE_NEARBY_DRIVER_ACCOUNT_IDS as string | undefined)?.trim() ?? ''
  const ids = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (ids.length === 0) return DRIVER_TEMPLATES
  return DRIVER_TEMPLATES.map((t, i) => (ids[i] ? { ...t, id: ids[i] } : t))
}

/**
 * Génère des chauffeurs mock autour d'une origine donnée.
 * Scalable: la signature (`origin`, `radiusKm`, `limit`) est alignée avec un futur backend.
 */
export function getNearbyDriversMock({
  origin = DEFAULT_USER_ORIGIN,
  radiusKm = 20,
  limit = 9,
}: NearbyDriversQuery = {}): NearbyDriver[] {
  const maxDistanceKm = Math.max(1, radiusKm * 0.95)
  const baseTemplates = driverTemplatesWithOptionalAccountIds()
  const templates = baseTemplates.slice(0, Math.max(1, Math.min(limit, baseTemplates.length)))
  const seedShift = Math.abs(Math.round((origin.latitude + origin.longitude) * 1000)) % templates.length

  return templates.map((tpl, index) => {
    const shiftedIndex = (index + seedShift) % templates.length
    const distanceKm = Math.min(maxDistanceKm, 1 + ((shiftedIndex * 2.3) % maxDistanceKm))
    const bearingDeg = (37 + shiftedIndex * 53) % 360
    const pos = moveFrom(origin, distanceKm, bearingDeg)
    const minutes = Math.max(2, Math.round((distanceKm / tpl.speedKmh) * 60))
    const price = Math.max(6, tpl.basePriceEur + distanceKm * 1.15)
    const display = ACCOUNT_DISPLAY_OVERRIDES[tpl.id]
    return {
      id: tpl.id,
      name: display?.name ?? tpl.name,
      moto: display?.moto ?? tpl.moto,
      distance: `${distanceKm.toFixed(1).replace('.', ',')} km · ~${minutes} min`,
      price: `${Math.round(price)} EUR`,
      longitude: pos.longitude,
      latitude: pos.latitude,
    }
  })
}

function moveFrom(origin: GeoPoint, distanceKm: number, bearingDeg: number): GeoPoint {
  const earthRadiusKm = 6371.0088
  const bearing = (bearingDeg * Math.PI) / 180
  const lat1 = (origin.latitude * Math.PI) / 180
  const lon1 = (origin.longitude * Math.PI) / 180
  const dByR = distanceKm / earthRadiusKm

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(dByR) + Math.cos(lat1) * Math.sin(dByR) * Math.cos(bearing)
  )
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(dByR) * Math.cos(lat1),
      Math.cos(dByR) - Math.sin(lat1) * Math.sin(lat2)
    )

  return {
    latitude: (lat2 * 180) / Math.PI,
    longitude: (lon2 * 180) / Math.PI,
  }
}
