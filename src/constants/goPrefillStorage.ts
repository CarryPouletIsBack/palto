const GO_PREFILL_STORAGE_KEY = 'palto:goPrefill'

export type GoPrefillPayload = {
  pickup: string
  destination: string
  timing?: 'now' | 'later'
  datetime?: string
  /** Commune d’accueil choisie sur l’accueil (sans préfixe « mairie »). */
  homeCommune?: string
}

export function saveGoPrefill(data: GoPrefillPayload): void {
  try {
    sessionStorage.setItem(GO_PREFILL_STORAGE_KEY, JSON.stringify(data))
  } catch {
    /* ignore */
  }
}

export function consumeGoPrefill(): GoPrefillPayload | null {
  try {
    const raw = sessionStorage.getItem(GO_PREFILL_STORAGE_KEY)
    if (!raw) return null
    sessionStorage.removeItem(GO_PREFILL_STORAGE_KEY)
    const parsed = JSON.parse(raw) as GoPrefillPayload
    if (!parsed || typeof parsed.pickup !== 'string' || typeof parsed.destination !== 'string') return null
    return parsed
  } catch {
    return null
  }
}
