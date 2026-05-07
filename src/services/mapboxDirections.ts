import type { Feature, LineString } from 'geojson'

export type LngLat = { longitude: number; latitude: number }

type RouteApiData = { geometry: LineString; durationSeconds: number | null; distanceMeters: number | null }

async function fetchRouteData(
  _accessToken: string,
  origin: LngLat,
  destination: LngLat,
  profile: 'driving'
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
  const res = await fetch(url)
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
 * Itinéraire routier OSM via OSRM (profil driving).
 */
export async function fetchDrivingRouteFeature(
  accessToken: string,
  origin: LngLat,
  destination: LngLat
): Promise<Feature<LineString> | null> {
  const baseRoute = await fetchRouteData(accessToken, origin, destination, 'driving')
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
