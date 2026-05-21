import type { GeoPoint } from '../services/distanceGeo'

/** Repère carte par défaut (centre administratif, pas une adresse de test). */
export const DEFAULT_USER_ORIGIN_LABEL = 'Saint-Denis, La Réunion'

/** Centre approximatif Saint-Denis — utilisé carte accueil / mocks si aucun départ validé. */
export const DEFAULT_USER_ORIGIN: GeoPoint = {
  latitude: -20.8789,
  longitude: 55.4481,
}

/** Ancienne origine de test (3 Allée Dachau, Le Port) — à ne plus utiliser pour les trajets /go. */
export const LEGACY_DEV_PICKUP_ORIGIN: GeoPoint = {
  latitude: -20.9346219,
  longitude: 55.2983021,
}
