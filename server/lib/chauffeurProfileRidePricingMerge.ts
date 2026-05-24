import type { RidePricingFields } from './chauffeurFareEstimate.js'

function pickPricingString(remote: string | undefined, local: string | undefined): string | undefined {
  const r = (remote ?? '').trim()
  if (r) return r
  const l = (local ?? '').trim()
  return l || undefined
}

export function mergeRidePricingFields(
  local?: RidePricingFields | null,
  remote?: RidePricingFields | null
): RidePricingFields | undefined {
  const l = local ?? {}
  const r = remote ?? {}
  const pricingMultiplierPercent =
    r.pricingMultiplierPercent != null && Number.isFinite(r.pricingMultiplierPercent)
      ? r.pricingMultiplierPercent
      : l.pricingMultiplierPercent
  const merged: RidePricingFields = {
    baseFareEur: pickPricingString(r.baseFareEur, l.baseFareEur),
    pricePerKmEur: pickPricingString(r.pricePerKmEur, l.pricePerKmEur),
    nightSurchargePercent: pickPricingString(r.nightSurchargePercent, l.nightSurchargePercent),
    elevationSurchargeEurPer100m: pickPricingString(
      r.elevationSurchargeEurPer100m,
      l.elevationSurchargeEurPer100m
    ),
    maxPickupKm: pickPricingString(r.maxPickupKm, l.maxPickupKm),
    ...(pricingMultiplierPercent != null ? { pricingMultiplierPercent } : {}),
  }
  const hasContent = Boolean(
    merged.baseFareEur ||
      merged.pricePerKmEur ||
      merged.nightSurchargePercent ||
      merged.elevationSurchargeEurPer100m ||
      merged.maxPickupKm ||
      merged.pricingMultiplierPercent != null
  )
  return hasContent ? merged : undefined
}
