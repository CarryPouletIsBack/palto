/** Accroche un point au reseau OSM via OSRM nearest. */
export async function snapLngLatToMapboxDriving(
  _accessToken: string,
  longitude: number,
  latitude: number,
  options?: { searchRadiusMeters?: number }
): Promise<{ longitude: number; latitude: number } | null> {
  const radius = Math.max(10, Math.min(300, options?.searchRadiusMeters ?? 75))
  const params = new URLSearchParams({
    number: '1',
  })
  const url = `https://router.project-osrm.org/nearest/v1/driving/${longitude},${latitude}?${params.toString()}`
  const res = await fetch(url)
  if (!res.ok) return null

  const data = (await res.json()) as {
    code?: string;
    waypoints?: Array<{ location?: [number, number] }>;
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
