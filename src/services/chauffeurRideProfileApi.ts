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

/** Lit les préférences course depuis `app_accounts` (source de vérité pour la page Go). */
export async function fetchChauffeurRideProfileFromServer(): Promise<ChauffeurRideProfilePayload | null> {
  if (!chauffeurRideProfileApiEnabled() || !isChauffeurSession()) return null
  const headers = authHeaders()
  if (!('Authorization' in headers)) return null
  try {
    const res = await fetch(`${API_BASE_URL}/chauffeur?resource=ride-profile`, { headers })
    const data = (await res.json().catch(() => ({}))) as Partial<ChauffeurRideProfilePayload> & {
      error?: string
    }
    if (!res.ok) {
      console.warn('[chauffeurRideProfileApi] GET', res.status, data.error ?? '')
      return null
    }
    return {
      petFriendly: data.petFriendly === true,
      luggageAssistance: data.luggageAssistance === true,
      insulatedBag: data.insulatedBag === true,
    }
  } catch (e) {
    console.warn('[chauffeurRideProfileApi] GET failed', e)
    return null
  }
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
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      console.warn('[chauffeurRideProfileApi] PUT', res.status, data.error ?? '')
    }
    return res.ok
  } catch (e) {
    console.warn('[chauffeurRideProfileApi] PUT failed', e)
    return false
  }
}
