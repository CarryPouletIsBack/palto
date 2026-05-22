import { apiBaseUrl, useClientRidesApi } from '../constants/featureFlags'
import { getClientAuthorizationHeader } from './authService'

const API_BASE_URL = apiBaseUrl()

/** Intervalle de relecture des courses si Realtime Supabase n’est pas configuré. */
export const CLIENT_RIDES_POLL_INTERVAL_MS = 8000

/** Secours lorsque Realtime est actif (évite tout dépendre du WebSocket). */
export const CLIENT_RIDES_POLL_FALLBACK_WHEN_REALTIME_MS = 60000

export type ClientRideItem = {
  id: string
  status: string
  pickupAddress: string
  dropoffAddress: string
  scheduledDate: string
  scheduledTime: string
  amountEur: number
  distanceKm: number | null
  pickupLng?: number | null
  pickupLat?: number | null
  dropoffLng?: number | null
  dropoffLat?: number | null
  createdAt: string
  startedAt?: string | null
  completedAt?: string | null
  driverName?: string | null
  vehicleLabel?: string | null
  driverProfilePhotoUrl?: string | null
}

export async function fetchClientRides(email: string, status: 'upcoming' | 'completed' | 'cancelled' | 'all' = 'all') {
  const auth = getClientAuthorizationHeader()
  if (!auth) {
    throw new Error('Connexion client requise')
  }
  const url = new URL(`${API_BASE_URL}/client/rides`, window.location.origin)
  url.searchParams.set('email', email)
  url.searchParams.set('status', status)
  const res = await fetch(url.toString(), { headers: { Authorization: auth } })
  const data = (await res.json().catch(() => ({}))) as { items?: ClientRideItem[]; error?: string }
  if (!res.ok) {
    throw new Error(data.error || `Erreur ${res.status}`)
  }
  return Array.isArray(data.items) ? data.items : []
}

export async function cancelClientRide(courseId: string): Promise<void> {
  const auth = getClientAuthorizationHeader()
  if (!auth) {
    throw new Error('Connexion client requise')
  }
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Authorization: auth,
  }
  const res = await fetch(`${API_BASE_URL}/client/rides`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ courseId }),
  })
  const data = (await res.json().catch(() => ({}))) as { error?: string }
  if (!res.ok) {
    throw new Error(data.error || `Erreur ${res.status}`)
  }
}

export function clientRidesApiEnabled(): boolean {
  return useClientRidesApi()
}

export type NearbyDriverMapItem = {
  id: string
  name: string
  longitude: number
  latitude: number
  distanceKm: number
}

/** Chauffeurs GPS réels (`chauffeur_presence`) autour du point de prise en charge. */
export async function fetchNearbyDriversAt(
  lat: number,
  lng: number,
  radiusKm = 30,
  limit = 12
): Promise<NearbyDriverMapItem[]> {
  const auth = getClientAuthorizationHeader()
  if (!auth) return []
  const url = new URL(`${API_BASE_URL}/client/rides`, window.location.origin)
  url.searchParams.set('mode', 'nearby')
  url.searchParams.set('lat', String(lat))
  url.searchParams.set('lng', String(lng))
  url.searchParams.set('radiusKm', String(radiusKm))
  url.searchParams.set('limit', String(limit))
  const res = await fetch(url.toString(), { headers: { Authorization: auth } })
  const data = (await res.json().catch(() => ({}))) as {
    drivers?: Array<{
      id: string
      name: string
      longitude: number
      latitude: number
      distanceKm?: number
    }>
  }
  if (!res.ok || !Array.isArray(data.drivers)) return []
  return data.drivers
    .filter(
      (d) =>
        d?.id &&
        Number.isFinite(d.longitude) &&
        Number.isFinite(d.latitude)
    )
    .map((d) => ({
      id: d.id,
      name: d.name,
      longitude: d.longitude,
      latitude: d.latitude,
      distanceKm: Number(d.distanceKm) || 0,
    }))
}
