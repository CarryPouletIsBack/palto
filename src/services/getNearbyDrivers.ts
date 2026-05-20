import { getNearbyDriversMock, type NearbyDriver, type NearbyDriversQuery } from '../data/nearbyDrivers'

/**
 * Chauffeurs à proximité pour la page Go.
 * Aujourd’hui : mock géolocalisé autour du départ (API réelle à brancher plus tard).
 */
export function getNearbyDrivers(query: NearbyDriversQuery = {}): NearbyDriver[] {
  return getNearbyDriversMock(query)
}
