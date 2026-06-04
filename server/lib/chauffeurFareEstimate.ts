/** Copie serveur (Vercel) — garder alignée avec src/lib/chauffeurFareEstimate.ts */

export const MIN_CHAUFFEUR_FARE_EUR = 6

export type RidePricingFields = {
  baseFareEur?: string
  pricePerKmEur?: string
  nightSurchargePercent?: string
  elevationSurchargeEurPer100m?: string
  pricingMultiplierPercent?: number
  maxPickupKm?: string
}

const DEFAULT_BASE_FARE = 2.2
const DEFAULT_PRICE_PER_KM = 1.4
const DEFAULT_NIGHT_PCT = 18
const DEFAULT_ELEV_PER_100M = 1.5
const DEFAULT_MULTIPLIER_PCT = 100
const DEFAULT_MAX_PICKUP_KM = 15

export type NormalizedRidePricing = {
  baseFareEur: number
  pricePerKmEur: number
  nightSurchargeRate: number
  elevationEurPerM: number
  pricingMultiplier: number
  maxPickupKm: number
}

export type EstimateChauffeurFareInput = {
  ridePricing?: RidePricingFields | null
  routeKm: number | null
  elevationM?: number
  isNight?: boolean
  vehicleLabel?: string
  fallbackPriceEur?: number
}

function parseDecimalField(value: string | undefined, fallback: number): number {
  if (value == null || !String(value).trim()) return fallback
  const parsed = Number.parseFloat(String(value).replace(',', '.').trim())
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

export function vehicleCoefFromLabel(label: string): number {
  const lower = label.toLowerCase()
  if (lower.includes('maxi')) return 1.12
  if (lower.includes('scooter')) return 1.05
  return 1.0
}

export function parseRidePricingFromSnapshot(raw: unknown): RidePricingFields | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const rp = (raw as Record<string, unknown>).ridePricing
  if (!rp || typeof rp !== 'object' || Array.isArray(rp)) return null
  const o = rp as Record<string, unknown>
  const out: RidePricingFields = {}
  if (typeof o.baseFareEur === 'string') out.baseFareEur = o.baseFareEur
  if (typeof o.pricePerKmEur === 'string') out.pricePerKmEur = o.pricePerKmEur
  if (typeof o.nightSurchargePercent === 'string') out.nightSurchargePercent = o.nightSurchargePercent
  if (typeof o.elevationSurchargeEurPer100m === 'string') {
    out.elevationSurchargeEurPer100m = o.elevationSurchargeEurPer100m
  }
  if (typeof o.maxPickupKm === 'string') out.maxPickupKm = o.maxPickupKm
  if (typeof o.pricingMultiplierPercent === 'number' && Number.isFinite(o.pricingMultiplierPercent)) {
    out.pricingMultiplierPercent = o.pricingMultiplierPercent
  }
  return Object.keys(out).length > 0 ? out : null
}

export function normalizeRidePricing(fields?: RidePricingFields | null): NormalizedRidePricing {
  const baseFareEur = parseDecimalField(fields?.baseFareEur, DEFAULT_BASE_FARE)
  const pricePerKmEur = parseDecimalField(fields?.pricePerKmEur, DEFAULT_PRICE_PER_KM)
  const nightPct = parseDecimalField(fields?.nightSurchargePercent, DEFAULT_NIGHT_PCT)
  const elevPer100m = parseDecimalField(fields?.elevationSurchargeEurPer100m, DEFAULT_ELEV_PER_100M)
  const multPct =
    fields?.pricingMultiplierPercent != null && Number.isFinite(fields.pricingMultiplierPercent)
      ? fields.pricingMultiplierPercent
      : DEFAULT_MULTIPLIER_PCT
  const maxPickupKm = parseDecimalField(fields?.maxPickupKm, DEFAULT_MAX_PICKUP_KM)
  return {
    baseFareEur,
    pricePerKmEur,
    nightSurchargeRate: nightPct > 0 ? nightPct / 100 : 0,
    elevationEurPerM: elevPer100m > 0 ? elevPer100m / 100 : 0.015,
    pricingMultiplier: multPct > 0 ? multPct / 100 : 1,
    maxPickupKm: maxPickupKm > 0 ? maxPickupKm : DEFAULT_MAX_PICKUP_KM,
  }
}

export function estimateChauffeurFareTtc(input: EstimateChauffeurFareInput): number | null {
  const grid = normalizeRidePricing(input.ridePricing)
  const vehicleCoef = vehicleCoefFromLabel(input.vehicleLabel ?? '')
  const routeKm = input.routeKm
  const elevationM = input.elevationM ?? 0
  const isNight = input.isNight === true

  if (routeKm != null && Number.isFinite(routeKm) && routeKm >= 0) {
    const raw =
      (grid.baseFareEur + routeKm * grid.pricePerKmEur + elevationM * grid.elevationEurPerM) *
      vehicleCoef *
      grid.pricingMultiplier *
      (1 + (isNight ? grid.nightSurchargeRate : 0))
    const total = Math.max(MIN_CHAUFFEUR_FARE_EUR, raw)
    return Number.isFinite(total) && total > 0 ? Math.round(total * 100) / 100 : null
  }

  const fallback = input.fallbackPriceEur ?? 0
  if (fallback > 0) return Math.round(fallback * 100) / 100
  return null
}

export function formatFareEurDisplay(amount: number): string {
  return `${amount.toFixed(2).replace('.', ',')} €`
}
