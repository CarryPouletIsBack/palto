import type { NearbyDriver } from '../data/nearbyDrivers'

export type NearbyDriverMapPoint = {
  id: string
  longitude: number
  latitude: number
  name?: string
  profilePhotoUrl?: string
}

/** Initiales affichées sur la carte (ex. « Karim L. » → « KL »). */
export function driverInitialsFromDisplayName(name: string): string {
  const cleaned = name.replace(/\./g, ' ').trim()
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'CH'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  const first = parts[0][0] ?? ''
  const last = parts[parts.length - 1][0] ?? ''
  return `${first}${last}`.toUpperCase()
}

/** Couleur de fond stable pour l’avatar initiales (seed = id ou nom). */
export function driverMapMarkerAccentColor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
    hash |= 0
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue} 52% 42%)`
}

/** Avatar généré pour démos / mocks locaux (ui-avatars, pas de dépendance npm). */
export function mockDriverProfilePhotoUrl(name: string): string {
  const encoded = encodeURIComponent(name.replace(/\./g, '').trim() || 'Chauffeur')
  return `https://ui-avatars.com/api/?name=${encoded}&size=128&background=7c3aed&color=ffffff&bold=true`
}

export function toNearbyDriverMapPoint(
  d: Pick<NearbyDriver, 'id' | 'longitude' | 'latitude' | 'name' | 'profilePhotoUrl'>
): NearbyDriverMapPoint {
  const photo = d.profilePhotoUrl?.trim()
  return {
    id: d.id,
    longitude: d.longitude,
    latitude: d.latitude,
    name: d.name,
    profilePhotoUrl: photo || undefined,
  }
}
