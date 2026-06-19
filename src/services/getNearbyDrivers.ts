import type { NearbyDriver, NearbyDriversQuery } from '../data/nearbyDrivers'
import { getLocalDevNearbyDrivers } from '../data/localDevNearbyDriver'
import type { GeoPoint } from './distanceGeo'
import { nearbyDriversApiEnabled, fetchNearbyDriversFromApi } from './nearbyDriversApi'

function mergeWithLocalDevDrivers(apiDrivers: NearbyDriver[], origin?: GeoPoint): NearbyDriver[] {
  if (!import.meta.env.DEV) return apiDrivers
  const local = getLocalDevNearbyDrivers(origin)
  if (local.length === 0) return apiDrivers
  const ids = new Set(apiDrivers.map((d) => d.id))
  return [...apiDrivers, ...local.filter((d) => !ids.has(d.id))]
}

/**
 * Chauffeurs pour la page Go : tous les comptes chauffeur inscrits, triés par distance au pickup (API).
 * Retourne [] si l’API est désactivée ou sans origine.
 */
export async function getNearbyDrivers(query: NearbyDriversQuery = {}): Promise<NearbyDriver[]> {
  const origin = query.origin
  const radiusKm = query.radiusKm ?? 20
  const limit = query.limit ?? 9

  if (!nearbyDriversApiEnabled() || !origin) {
    return import.meta.env.DEV ? getLocalDevNearbyDrivers(origin) : [];
  }

  const apiDrivers = await fetchNearbyDriversFromApi({ origin, radiusKm, limit })
  const merged = mergeWithLocalDevDrivers(apiDrivers, origin)
  return merged.length > 0 ? merged : import.meta.env.DEV ? getLocalDevNearbyDrivers(origin) : []
}
