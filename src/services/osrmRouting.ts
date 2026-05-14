import type { Feature, LineString } from 'geojson'

export type LngLat = { longitude: number; latitude: number }

type RouteApiData = {
  geometry: LineString
  durationSeconds: number | null
  distanceMeters: number | null
}

async function fetchRouteData(
  origin: LngLat,
  destination: LngLat,
  profile: 'driving',
  signal?: AbortSignal
): Promise<RouteApiData | null> {
  const c1 = `${origin.longitude},${origin.latitude}`
  const c2 = `${destination.longitude},${destination.latitude}`
  const params = new URLSearchParams({
    alternatives: 'false',
    geometries: 'geojson',
    overview: 'full',
    steps: 'false',
    annotations: 'duration,distance',
  })
  const url = `https://router.project-osrm.org/route/v1/${profile}/${c1};${c2}?${params.toString()}`
  const res = await fetch(url, { signal })
  if (!res.ok) return null

  const data = (await res.json()) as {
    routes?: Array<{ geometry?: LineString; duration?: number; distance?: number }>
  }
  const route = data?.routes?.[0]
  const geometry = route?.geometry
  const durationSeconds =
    typeof route?.duration === 'number' && Number.isFinite(route.duration)
      ? Math.max(0, Math.round(route.duration))
      : null
  const distanceMeters =
    typeof route?.distance === 'number' && Number.isFinite(route.distance)
      ? Math.max(0, Math.round(route.distance))
      : null
  if (!geometry || geometry.type !== 'LineString' || !Array.isArray(geometry.coordinates)) {
    return null
  }
  return { geometry, durationSeconds, distanceMeters }
}

/**
 * Itinéraire routier (OSM) via **OSRM** public (profil driving).
 * Passer `signal` pour annuler une requête obsolète (évite la saturation navigateur / ERR_INSUFFICIENT_RESOURCES).
 */
export async function fetchDrivingRouteFeature(
  origin: LngLat,
  destination: LngLat,
  options?: { signal?: AbortSignal }
): Promise<Feature<LineString> | null> {
  const baseRoute = await fetchRouteData(origin, destination, 'driving', options?.signal)
  if (!baseRoute) return null

  return {
    type: 'Feature',
    properties: {
      durationSeconds: baseRoute.durationSeconds,
      durationTrafficSeconds: null,
      distanceMeters: baseRoute.distanceMeters,
    },
    geometry: baseRoute.geometry,
  }
}

/**
 * Accroche un point au réseau routier OSM via **OSRM nearest** (public).
 */
export async function snapLngLatToOsmRoad(
  longitude: number,
  latitude: number,
  options?: { searchRadiusMeters?: number; signal?: AbortSignal }
): Promise<{ longitude: number; latitude: number } | null> {
  const radius = Math.max(10, Math.min(300, options?.searchRadiusMeters ?? 75))
  const params = new URLSearchParams({
    number: '1',
  })
  const url = `https://router.project-osrm.org/nearest/v1/driving/${longitude},${latitude}?${params.toString()}`
  const res = await fetch(url, { signal: options?.signal })
  if (!res.ok) return null

  const data = (await res.json()) as {
    code?: string
    waypoints?: Array<{ location?: [number, number] }>
  }

  if (data.code && data.code !== 'Ok') return null

  const point = data.waypoints?.[0]
  if (!point || !Array.isArray(point.location) || point.location.length < 2) return null

  const [lng, lat] = point.location
  if (typeof lng !== 'number' || typeof lat !== 'number' || !Number.isFinite(lng) || !Number.isFinite(lat)) {
    return null
  }
  const dx = (lng - longitude) * 111_320 * Math.cos((latitude * Math.PI) / 180)
  const dy = (lat - latitude) * 110_540
  const distMeters = Math.hypot(dx, dy)
  if (distMeters > radius * 4) return null
  return { longitude: lng, latitude: lat }
}

/**
 * Accroche au réseau si possible ; sinon garde le point cliqué.
 */
export async function resolvePickOnRoad(
  longitude: number,
  latitude: number,
  options?: { searchRadiusMeters?: number; signal?: AbortSignal }
): Promise<{ longitude: number; latitude: number }> {
  const snapped = await snapLngLatToOsmRoad(longitude, latitude, options)
  if (snapped) return snapped
  return { longitude, latitude }
}
