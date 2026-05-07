/**
 * Enveloppe WGS84 (lon, lat) de l’île de La Réunion (hors îlets / océan lointain).
 * Sert de premier filtre avant accrochage au réseau routier (Map Matching).
 */
export const REUNION_ISLAND_BBOX = {
  west: 55.18,
  south: -21.39,
  east: 55.92,
  north: -20.85,
} as const

/** Chaîne `minLon,minLat,maxLon,maxLat` pour l’API de géocodage. */
export const REUNION_ISLAND_BBOX_GEOCODE = `${REUNION_ISLAND_BBOX.west},${REUNION_ISLAND_BBOX.south},${REUNION_ISLAND_BBOX.east},${REUNION_ISLAND_BBOX.north}` as const

export function isLngLatInsideReunionIsland(longitude: number, latitude: number): boolean {
  const { west, south, east, north } = REUNION_ISLAND_BBOX
  return longitude >= west && longitude <= east && latitude >= south && latitude <= north
}

/**
 * Marge en degrés autour de la bbox île pour `maxBounds` carte (pan limité, peu d’océan).
 * Coin sud-ouest puis nord-est : `[[west, south], [east, north]]`.
 */
const MAP_BOUNDS_MARGIN = { lon: 0.09, lat: 0.07 } as const

export const REUNION_MAP_MAX_BOUNDS: [[number, number], [number, number]] = [
  [REUNION_ISLAND_BBOX.west - MAP_BOUNDS_MARGIN.lon, REUNION_ISLAND_BBOX.south - MAP_BOUNDS_MARGIN.lat],
  [REUNION_ISLAND_BBOX.east + MAP_BOUNDS_MARGIN.lon, REUNION_ISLAND_BBOX.north + MAP_BOUNDS_MARGIN.lat],
]

/**
 * Zoom minimal (vue la plus « large » autorisée). Au-dessous, l’océan domine hors La Réunion.
 * Doit rester ≤ au zoom initial d’accueil (~8.6).
 */
export const REUNION_HOME_MIN_ZOOM = 8.45
