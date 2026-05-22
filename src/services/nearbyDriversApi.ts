import { apiBaseUrl, useClientRidesApi } from '../constants/featureFlags'
import type { NearbyDriver } from '../data/nearbyDrivers'
import type { GeoPoint } from './distanceGeo'

const API_BASE_URL = apiBaseUrl()

function normalizeNearbyDriver(raw: unknown): NearbyDriver {
  const d = (raw ?? {}) as Record<string, unknown>
  return {
    id: String(d.id ?? ''),
    name: String(d.name ?? ''),
    moto: String(d.moto ?? ''),
    distance: String(d.distance ?? ''),
    price: String(d.price ?? ''),
    longitude: Number(d.longitude),
    latitude: Number(d.latitude),
    petFriendly: d.petFriendly === true || d.pet_friendly === true,
    luggageAssistance: d.luggageAssistance === true || d.luggage_assistance === true,
    insulatedBag: d.insulatedBag === true || d.insulated_bag === true,
    deliveryEquipped: d.deliveryEquipped === true || d.delivery_equipped === true,
    profilePhotoUrl:
      typeof d.profilePhotoUrl === 'string' && d.profilePhotoUrl.trim()
        ? d.profilePhotoUrl.trim()
        : undefined,
  }
}

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
    if (!Array.isArray(data.drivers)) return []
    return data.drivers
      .map((raw) => normalizeNearbyDriver(raw))
      .filter((d) => Number.isFinite(d.longitude) && Number.isFinite(d.latitude))
  } catch (e) {
    console.warn('[nearbyDriversApi] fetch failed', e)
    return []
  }
}
