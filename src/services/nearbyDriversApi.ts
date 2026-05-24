import type { ChauffeurProfileRidePricingFields } from '../constants/chauffeurProfileStorage'
import { apiBaseUrl, useClientRidesApi } from '../constants/featureFlags'
import type { NearbyDriver } from '../data/nearbyDrivers'
import type { GeoPoint } from './distanceGeo'

function normalizeRidePricing(raw: unknown): ChauffeurProfileRidePricingFields | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const o = raw as Record<string, unknown>
  const out: ChauffeurProfileRidePricingFields = {}
  if (typeof o.baseFareEur === 'string') out.baseFareEur = o.baseFareEur
  if (typeof o.pricePerKmEur === 'string') out.pricePerKmEur = o.pricePerKmEur
  if (typeof o.nightSurchargePercent === 'string') out.nightSurchargePercent = o.nightSurchargePercent
  if (typeof o.elevationSurchargeEurPer100m === 'string') {
    out.elevationSurchargeEurPer100m = o.elevationSurchargeEurPer100m
  }
  if (typeof o.maxPickupKm === 'string') out.maxPickupKm = o.maxPickupKm
  if (typeof o.pricingMultiplierPercent === 'number' && Number.isFinite(o.pricingMultiplierPercent)) {
    out.pricingMultiplierPercent = o.pricingMultiplierPercent
  }
  return Object.keys(out).length > 0 ? out : undefined
}

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
    ridePricing: normalizeRidePricing(d.ridePricing),
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
