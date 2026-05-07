function isEnabled(raw: string | boolean | undefined): boolean {
  if (typeof raw === 'boolean') return raw
  if (typeof raw !== 'string') return false
  const v = raw.trim().toLowerCase()
  return v === '1' || v === 'true' || v === 'yes' || v === 'on'
}

export function apiBaseUrl(): string {
  return (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || '/api'
}

export function useChauffeurRidesPersist(): boolean {
  const raw = import.meta.env.VITE_CHAUFFEUR_RIDES_PERSIST as string | undefined
  if (typeof raw !== 'string') return true
  const v = raw.trim().toLowerCase()
  if (v === '0' || v === 'false' || v === 'no' || v === 'off') return false
  return true
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
  return isEnabled(import.meta.env.VITE_USE_CLIENT_RIDES_API as string | undefined)
}

export function usePricingApi(): boolean {
  return isEnabled(import.meta.env.VITE_USE_PRICING_API as string | undefined)
}
