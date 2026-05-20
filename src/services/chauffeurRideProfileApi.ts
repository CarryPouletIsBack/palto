import { apiBaseUrl, useChauffeurPresenceApi } from '../constants/featureFlags'
import { isChauffeurSession } from './authService'

const API_BASE_URL = apiBaseUrl()
const AUTH_TOKEN_KEY = 'dashboard_token'

function authHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {}
  const token = localStorage.getItem(AUTH_TOKEN_KEY)?.trim()
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

export function chauffeurRideProfileApiEnabled(): boolean {
  return useChauffeurPresenceApi()
}

export type ChauffeurRideProfilePayload = {
  petFriendly: boolean
  luggageAssistance: boolean
  insulatedBag: boolean
}

/** Sync préférences course (Animaux, bagages, etc.) → `app_accounts`. */
export async function syncChauffeurRideProfileToServer(
  profile: ChauffeurRideProfilePayload
): Promise<boolean> {
  if (!chauffeurRideProfileApiEnabled() || !isChauffeurSession()) return false
  const headers = authHeaders()
  if (!('Authorization' in headers)) return false
  try {
    const res = await fetch(`${API_BASE_URL}/chauffeur?resource=ride-profile`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    })
    return res.ok
  } catch {
    return false
  }
}
