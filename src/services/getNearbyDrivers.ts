import type { NearbyDriver, NearbyDriversQuery } from '../data/nearbyDrivers'
import { nearbyDriversApiEnabled, fetchNearbyDriversFromApi } from './nearbyDriversApi'

/**
 * Chauffeurs pour la page Go : tous les comptes chauffeur inscrits, triés par distance au pickup (API).
 * Retourne [] si l’API est désactivée ou sans origine.
 */
export async function getNearbyDrivers(query: NearbyDriversQuery = {}): Promise<NearbyDriver[]> {
  const origin = query.origin
  const radiusKm = query.radiusKm ?? 20
  const limit = query.limit ?? 9

  if (!nearbyDriversApiEnabled() || !origin) {
    return []
  }

  return fetchNearbyDriversFromApi({ origin, radiusKm, limit })
}
