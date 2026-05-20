function isEnabled(raw: string | boolean | undefined): boolean {
  if (typeof raw === 'boolean') return raw
  if (typeof raw !== 'string') return false
  const v = raw.trim().toLowerCase()
  return v === '1' || v === 'true' || v === 'yes' || v === 'on'
}

export function apiBaseUrl(): string {
  return (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || '/api'
}

/** Vercel Hobby : max 12 fichiers sous `api/` = 12 Serverless Functions. Fusionner les routes avant d’en ajouter. */
export const VERCEL_HOBBY_MAX_SERVERLESS_FUNCTIONS = 12

/**
 * En `vite dev`, `/api` est proxifié vers `localhost:3000` (souvent sans `vercel dev`) → ECONNREFUSED + logs bruyants.
 * Sans `VITE_API_BASE_URL`, le géocodage forward/reverse n’appelle pas ce proxy : BAN / Nominatim côté navigateur uniquement.
 */
export function isGeocodeHttpProxyAvailable(): boolean {
  if (!import.meta.env.DEV) return true
  return Boolean((import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim())
}

export function useChauffeurRidesPersist(): boolean {
  const raw = import.meta.env.VITE_CHAUFFEUR_RIDES_PERSIST as string | undefined
  if (typeof raw !== 'string') return true
  const v = raw.trim().toLowerCase()
  if (v === '0' || v === 'false' || v === 'no' || v === 'off') return false
  return true
}

/** GPS chauffeur → page Go (indépendant de VITE_CHAUFFEUR_RIDES_PERSIST). */
export function useChauffeurPresenceApi(): boolean {
  const raw = import.meta.env.VITE_CHAUFFEUR_PRESENCE_API as string | undefined
  if (typeof raw === 'string') {
    const v = raw.trim().toLowerCase()
    if (v === '0' || v === 'false' || v === 'no' || v === 'off') return false
    return true
  }
  return useClientRidesApi()
}

export function useOrgApi(): boolean {
  return isEnabled(import.meta.env.VITE_USE_ORG_API as string | undefined)
}

export function useComplianceApi(): boolean {
  return isEnabled(import.meta.env.VITE_USE_COMPLIANCE_API as string | undefined)
}

export function useStatsApi(): boolean {
  return isEnabled(import.meta.env.VITE_USE_STATS_API as string | undefined)
}

export function useClientRidesApi(): boolean {
  const raw = import.meta.env.VITE_USE_CLIENT_RIDES_API as string | undefined
  if (typeof raw !== 'string') return true
  const v = raw.trim().toLowerCase()
  if (v === '0' || v === 'false' || v === 'no' || v === 'off') return false
  return true
}

export function usePricingApi(): boolean {
  return isEnabled(import.meta.env.VITE_USE_PRICING_API as string | undefined)
}

/** Realtime Supabase (courses / course_events) : URL + clé anon + endpoint /api/auth/realtime-token + SUPABASE_JWT_SECRET côté serveur. */
export function supabaseRealtimeConfigured(): boolean {
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
  const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()
  return Boolean(url && key)
}
