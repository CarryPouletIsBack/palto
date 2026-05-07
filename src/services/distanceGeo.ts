/** Point géographique WGS84 (degrés). */
export type GeoPoint = {
  latitude: number
  longitude: number
}

const EARTH_RADIUS_KM = 6371.0088

/**
 * Distance orthodromique (à vol d’oiseau) entre deux points, en kilomètres.
 * Pour une distance **routière**, utiliser l’API Directions en complément.
 */
export function haversineDistanceKm(from: GeoPoint, to: GeoPoint): number {
  const φ1 = (from.latitude * Math.PI) / 180
  const φ2 = (to.latitude * Math.PI) / 180
  const Δφ = ((to.latitude - from.latitude) * Math.PI) / 180
  const Δλ = ((to.longitude - from.longitude) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_KM * c
}

/** Distance orthodromique en mètres (ex. navigation chauffeur, écart à la polyline). */
export function haversineDistanceMeters(from: GeoPoint, to: GeoPoint): number {
  return haversineDistanceKm(from, to) * 1000
}

/**
 * Retourne la distance **aller-retour** (×2) et indique si un plafond a été appliqué.
 *
 * Règle fréquente pour le **domicile – travail** (un seul aller-retour par jour) :
 * voir [Frais de transport | impots.gouv.fr](https://www.impots.gouv.fr/particulier/frais-de-transport).
 * Le plafond de **40 km** (distance domicile–lieu de travail, pas l’itinéraire le plus long)
 * s’applique au **kilométrage retenu fiscalement** sauf cas justifiés — ici on ne fait qu’une
 * approximation optionnelle sur la distance **aller** fournie par l’app.
 */
export function allerRetourKm(distanceAllerKm: number): { allerRetourKm: number } {
  return { allerRetourKm: Math.max(0, distanceAllerKm) * 2 }
}

/**
 * Applique le plafond « au-delà de 40 km seuls 40 km sont pris en compte » pour la distance
 * **simple** domicile → travail (pas aller-retour), conformément à l’article rappelé sur
 * [impots.gouv.fr – frais de transport](https://www.impots.gouv.fr/particulier/frais-de-transport).
 */
export function appliquerPlafond40KmDomicileTravail(distanceAllerKm: number): {
  distanceAllerRetenuKm: number
  plafondApplique: boolean
} {
  const max = 40
  if (distanceAllerKm <= max) {
    return { distanceAllerRetenuKm: distanceAllerKm, plafondApplique: false }
  }
  return { distanceAllerRetenuKm: max, plafondApplique: true }
}
