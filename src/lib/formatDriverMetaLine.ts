import type { NearbyDriver } from '../data/nearbyDrivers'
import { haversineDistanceKm, type GeoPoint } from '../services/distanceGeo'
import { driverServiceBadges } from './driverServiceBadges'

/** Ligne secondaire carte chauffeur : véhicule · distance · services. */
export function formatDriverMetaLine(driver: NearbyDriver, pickup: GeoPoint | null): string {
  const parts: string[] = []
  const vehicle = driver.moto.trim()
  if (vehicle) parts.push(vehicle)
  if (pickup) {
    const km = haversineDistanceKm(pickup, {
      latitude: driver.latitude,
      longitude: driver.longitude,
    })
    const minEst = Math.max(1, Math.round((km / 22) * 60))
    parts.push(`${km.toFixed(1).replace('.', ',')} km · ~${minEst} min`)
  } else if (driver.distance.trim()) {
    parts.push(driver.distance.trim())
  }
  const badges = driverServiceBadges(driver)
  if (badges.length > 0) {
    parts.push(badges.join(' · '))
  }
  return parts.join(' · ')
}
