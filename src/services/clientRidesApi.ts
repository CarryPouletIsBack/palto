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
  pickupLng?: number | null
  pickupLat?: number | null
  dropoffLng?: number | null
  dropoffLat?: number | null
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

export async function cancelClientRide(courseId: string): Promise<void> {
  const token =
    (typeof window !== 'undefined' && (localStorage.getItem('palto:client_token') || localStorage.getItem('dashboard_token'))) ||
    ''
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }
  if (token) headers.Authorization = `Bearer ${token}`
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
