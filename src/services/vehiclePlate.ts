/**
 * Plaque d’immatriculation française (format SIV courant : AA-123-BB).
 * Validation locale ; la recherche véhicule peut être branchée sur une API plus tard.
 */

const SIV_PLATE_RE = /^[A-HJ-NPR-TV-Z]{2}-\d{3}-[A-HJ-NPR-TV-Z]{2}$/

export function normalizeFrenchPlate(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9-]/g, '')
    .replace(/^-+|-+$/g, '')
}

export function isValidFrenchPlate(normalized: string): boolean {
  if (!normalized) return false
  return SIV_PLATE_RE.test(normalized)
}

export type PlateLookupResult = {
  vehicleLabel?: string
  source: string
}

/** Placeholder : retourne null pour laisser le dashboard afficher le hint générique. */
export async function lookupVehicleByPlate(_normalizedPlate: string): Promise<PlateLookupResult | null> {
  return null
}
