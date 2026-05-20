import { apiBaseUrl, useChauffeurRidesPersist } from '../constants/featureFlags'

const API_BASE_URL = apiBaseUrl()
const AUTH_TOKEN_KEY = 'dashboard_token'

function authHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {}
  const token = localStorage.getItem(AUTH_TOKEN_KEY)?.trim()
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

export function chauffeurPresenceApiEnabled(): boolean {
  return useChauffeurRidesPersist()
}

/** Heartbeat GPS chauffeur → table `chauffeur_presence` (via /api/chauffeur?resource=presence). */
export async function pushChauffeurPresence(params: {
  lng: number
  lat: number
  isAvailable?: boolean
}): Promise<boolean> {
  if (!chauffeurPresenceApiEnabled()) return false
  try {
    const res = await fetch(`${API_BASE_URL}/chauffeur?resource=presence`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lng: params.lng,
        lat: params.lat,
        isAvailable: params.isAvailable ?? true,
      }),
    })
    return res.ok
  } catch (e) {
    console.warn('[chauffeurPresenceApi] push failed', e)
    return false
  }
}
