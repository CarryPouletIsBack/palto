import { apiBaseUrl, useClientRidesApi } from '../constants/featureFlags'
import type { NearbyDriver } from '../data/nearbyDrivers'
import type { GeoPoint } from './distanceGeo'

const API_BASE_URL = apiBaseUrl()

export function nearbyDriversApiEnabled(): boolean {
  return useClientRidesApi()
}

export async function fetchNearbyDriversFromApi(params: {
  origin: GeoPoint
  radiusKm: number
  limit?: number
}): Promise<NearbyDriver[]> {
  if (!nearbyDriversApiEnabled()) return []

  const url = new URL(`${API_BASE_URL}/client/rides`, window.location.origin)
  url.searchParams.set('mode', 'nearby')
  url.searchParams.set('lat', String(params.origin.latitude))
  url.searchParams.set('lng', String(params.origin.longitude))
  url.searchParams.set('radiusKm', String(params.radiusKm))
  if (params.limit != null) url.searchParams.set('limit', String(params.limit))

  try {
    const res = await fetch(url.toString())
    const data = (await res.json().catch(() => ({}))) as { drivers?: NearbyDriver[]; error?: string }
    if (!res.ok) {
      console.warn('[nearbyDriversApi]', data.error ?? res.status)
      return []
    }
    return Array.isArray(data.drivers) ? data.drivers : []
  } catch (e) {
    console.warn('[nearbyDriversApi] fetch failed', e)
    return []
  }
}
