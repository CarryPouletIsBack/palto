import type { Feature, LineString } from 'geojson'
import type { GeoPoint } from '../services/distanceGeo'
import { isValidMapLngLat } from './mapLngLat'

/** Clé stable : un changement déclenche un cadrage auto ; le suivi GPS ne doit pas la faire bouger. */
export function computeMapAutoCameraKey(input: {
  routeFeature: Feature<LineString> | null | undefined
  userOrigin: GeoPoint | null | undefined
  selectedDestination: { longitude: number; latitude: number } | null | undefined
  flyToTarget: { longitude: number; latitude: number; zoom?: number } | null | undefined
  nearbyDriverIds: string
}): string {
  const coords = input.routeFeature?.geometry?.coordinates as [number, number][] | undefined
  if (coords && coords.length >= 2) {
    const first = coords[0]
    const last = coords[coords.length - 1]
    return `route:${coords.length}:${first[0]},${first[1]}:${last[0]},${last[1]}`
  }

  const o = input.userOrigin
  const d = input.selectedDestination
  if (isValidMapLngLat(o) && isValidMapLngLat(d)) {
    return `od:${o.longitude},${o.latitude}:${d.longitude},${d.latitude}`
  }

  const t = input.flyToTarget
  if (t && Number.isFinite(t.longitude) && Number.isFinite(t.latitude)) {
    const lng = Math.round(t.longitude * 1e4) / 1e4
    const lat = Math.round(t.latitude * 1e4) / 1e4
    const z = Math.round((t.zoom ?? 14) * 10) / 10
    return `fly:${lng},${lat}:${z}`
  }

  if (input.nearbyDriverIds) return `drivers:${input.nearbyDriverIds}`

  return 'island'
}

export function hasMapAutoFrameContent(key: string): boolean {
  return key !== 'island' && !key.startsWith('drivers:')
}
