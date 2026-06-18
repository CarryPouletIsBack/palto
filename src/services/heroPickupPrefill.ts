import type { GoPrefillPayload } from '../constants/goPrefillStorage'
import { readGrantedUserGeolocation } from '../constants/userGeolocationSession'
import { queryGeolocationPermission } from '../lib/geolocationPlatform'

export type HeroPickupPrefill = Pick<GoPrefillPayload, 'pickup' | 'pickupLng' | 'pickupLat'>

export async function resolveHeroPickupPrefill(manualPickup: string): Promise<HeroPickupPrefill> {
  const trimmed = manualPickup.trim()
  if (trimmed) return { pickup: trimmed }

  const stored = readGrantedUserGeolocation()
  if (stored) {
    return {
      pickup: stored.label?.trim() ?? '',
      pickupLng: stored.longitude,
      pickupLat: stored.latitude,
    }
  }

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return { pickup: '' }
  }

  const perm = await queryGeolocationPermission()
  if (perm !== 'granted') {
    return { pickup: '' }
  }

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 120_000,
      })
    })
    const { longitude, latitude } = position.coords
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
      return { pickup: '' }
    }
    return { pickup: '', pickupLng: longitude, pickupLat: latitude }
  } catch {
    return { pickup: '' }
  }
}
