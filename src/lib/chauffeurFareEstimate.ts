import type { ChauffeurProfileRidePricingFields } from '../constants/chauffeurProfileStorage'
import { DEFAULT_CHAUFFEUR_RIDE_SETTINGS } from '../constants/chauffeurRideSettingsStorage'

export const MIN_CHAUFFEUR_FARE_EUR = 6

export type NormalizedRidePricing = {
  baseFareEur: number
  pricePerKmEur: number
  nightSurchargeRate: number
  elevationEurPerM: number
  pricingMultiplier: number
  maxPickupKm: number
}

export type EstimateChauffeurFareInput = {
  ridePricing?: ChauffeurProfileRidePricingFields | null
  routeKm: number | null
  elevationM?: number
  isNight?: boolean
  vehicleLabel?: string
  /** Prix indicatif API (liste) si pas de trajet calculé. */
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

export function parsePriceEurFromDisplay(price: string): number {
  const parsed = Number.parseFloat(price.replace(',', '.').replace(/[^\d.]/g, ''))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

export function parseRidePricingFromSnapshot(raw: unknown): ChauffeurProfileRidePricingFields | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const rp = (raw as Record<string, unknown>).ridePricing
  if (!rp || typeof rp !== 'object' || Array.isArray(rp)) return null
  const o = rp as Record<string, unknown>
  const out: ChauffeurProfileRidePricingFields = {}
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

export function normalizeRidePricing(
  fields?: ChauffeurProfileRidePricingFields | null
): NormalizedRidePricing {
  const d = DEFAULT_CHAUFFEUR_RIDE_SETTINGS
  const baseFareEur = parseDecimalField(fields?.baseFareEur, parseDecimalField(d.baseFareEur, 2.2))
  const pricePerKmEur = parseDecimalField(fields?.pricePerKmEur, parseDecimalField(d.pricePerKmEur, 1.4))
  const nightPct = parseDecimalField(fields?.nightSurchargePercent, parseDecimalField(d.nightSurchargePercent, 18))
  const elevPer100m = parseDecimalField(
    fields?.elevationSurchargeEurPer100m,
    parseDecimalField(d.elevationSurchargeEurPer100m, 1.5)
  )
  const multPct =
    fields?.pricingMultiplierPercent != null && Number.isFinite(fields.pricingMultiplierPercent)
      ? fields.pricingMultiplierPercent
      : d.pricingMultiplierPercent
  const maxPickupKm = parseDecimalField(fields?.maxPickupKm, parseDecimalField(d.maxPickupKm, 15))
  return {
    baseFareEur,
    pricePerKmEur,
    nightSurchargeRate: nightPct > 0 ? nightPct / 100 : 0,
    elevationEurPerM: elevPer100m > 0 ? elevPer100m / 100 : 0.015,
    pricingMultiplier: multPct > 0 ? multPct / 100 : 1,
    maxPickupKm: maxPickupKm > 0 ? maxPickupKm : 15,
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
  return `${amount.toFixed(2).replace('.', ',')} EUR`
}
