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

export function chauffeurPresenceApiEnabled(): boolean {
  return useChauffeurPresenceApi()
}

/** Heartbeat GPS chauffeur → table `chauffeur_presence` (via /api/chauffeur?resource=presence). */
export async function pushChauffeurPresence(params: {
  lng: number
  lat: number
  isAvailable?: boolean
}): Promise<boolean> {
  if (!chauffeurPresenceApiEnabled() || !isChauffeurSession()) return false
  const headers = authHeaders()
  if (!('Authorization' in headers)) {
    console.warn('[chauffeurPresenceApi] pas de token chauffeur (connecte-toi au dashboard)')
    return false
  }
  try {
    const res = await fetch(`${API_BASE_URL}/chauffeur?resource=presence`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lng: params.lng,
        lat: params.lat,
        isAvailable: params.isAvailable ?? true,
      }),
    })
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      console.warn('[chauffeurPresenceApi] push', res.status, data.error ?? '')
    }
    return res.ok
  } catch (e) {
    console.warn('[chauffeurPresenceApi] push failed', e)
    return false
  }
}
