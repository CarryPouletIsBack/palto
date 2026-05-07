import type { GeoPoint } from '../services/distanceGeo'

/** Adresse de travail / position utilisateur par défaut (Le Port, La Réunion). */
export const DEFAULT_USER_ORIGIN_LABEL = '3 Allée Dachau, 97420 Le Port, La Réunion'

/**
 * Coordonnées WGS84 correspondant à {@link DEFAULT_USER_ORIGIN_LABEL}
 * (géocodage OpenStreetMap Nominatim — node maison).
 */
export const DEFAULT_USER_ORIGIN: GeoPoint = {
  latitude: -20.9346219,
  longitude: 55.2983021,
}
