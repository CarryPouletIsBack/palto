import { apiBaseUrl, useClientRidesApi } from '../constants/featureFlags'

const API_BASE_URL = apiBaseUrl()

export type ClientRideItem = {
  id: string
  status: string
  pickupAddress: string
  dropoffAddress: string
  scheduledDate: string
  scheduledTime: string
  amountEur: number
  distanceKm: number | null
  createdAt: string
}

export async function fetchClientRides(email: string, status: 'upcoming' | 'completed' | 'cancelled' | 'all' = 'all') {
  const url = new URL(`${API_BASE_URL}/client/rides`, window.location.origin)
  url.searchParams.set('email', email)
  url.searchParams.set('status', status)
  const res = await fetch(url.toString())
  const data = (await res.json().catch(() => ({}))) as { items?: ClientRideItem[]; error?: string }
  if (!res.ok) {
    throw new Error(data.error || `Erreur ${res.status}`)
  }
  return Array.isArray(data.items) ? data.items : []
}

export function clientRidesApiEnabled(): boolean {
  return useClientRidesApi()
}
