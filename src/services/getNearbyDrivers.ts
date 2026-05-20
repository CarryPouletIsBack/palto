import type { NearbyDriver, NearbyDriversQuery } from '../data/nearbyDrivers'
import { nearbyDriversApiEnabled, fetchNearbyDriversFromApi } from './nearbyDriversApi'

/**
 * Chauffeurs à proximité : uniquement la présence live (API).
 * Retourne [] si l’API est désactivée, sans origine, ou aucun chauffeur en ligne.
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
