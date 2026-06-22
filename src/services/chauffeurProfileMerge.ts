import type {
  ChauffeurProfileRidePricingFields,
  ChauffeurProfileSnapshot,
} from '../constants/chauffeurProfileStorage'
import {
  normalizeChauffeurServiceCatalog,
  type ChauffeurServiceCatalogSnapshot,
} from '../constants/chauffeurServiceCatalog'

function pickPricingString(remote: string | undefined, local: string | undefined): string | undefined {
  const r = (remote ?? '').trim()
  if (r) return r
  const l = (local ?? '').trim()
  return l || undefined
}

function mergeRidePricing(
  local?: ChauffeurProfileRidePricingFields,
  remote?: ChauffeurProfileRidePricingFields
): ChauffeurProfileRidePricingFields | undefined {
  const l = local ?? {}
  const r = remote ?? {}
  const pricingMultiplierPercent =
    r.pricingMultiplierPercent != null && Number.isFinite(r.pricingMultiplierPercent)
      ? r.pricingMultiplierPercent
      : l.pricingMultiplierPercent
  const merged: ChauffeurProfileRidePricingFields = {
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

function pickNonEmptyString(remote: string | undefined, local: string | undefined): string {
  const r = (remote ?? '').trim()
  if (r) return r
  return (local ?? '').trim()
}

function pickPhoto(
  remote: string | null | undefined,
  local: string | null | undefined
): string | null {
  if (typeof remote === 'string' && remote.trim()) return remote.trim()
  if (typeof local === 'string' && local.trim()) return local.trim()
  return remote ?? local ?? null
}

export function mergeChauffeurProfileSnapshots(
  local: ChauffeurProfileSnapshot,
  remote: Partial<ChauffeurProfileSnapshot>
): ChauffeurProfileSnapshot {
  return {
    ...local,
    ...remote,
    prenom: pickNonEmptyString(remote.prenom, local.prenom),
    nom: pickNonEmptyString(remote.nom, local.nom),
    email: pickNonEmptyString(remote.email, local.email),
    telephone: pickNonEmptyString(remote.telephone, local.telephone),
    ville: pickNonEmptyString(remote.ville, local.ville),
    vehicule: pickNonEmptyString(remote.vehicule, local.vehicule),
    plaque: pickNonEmptyString(remote.plaque, local.plaque),
    profilePhotoUrl: pickPhoto(remote.profilePhotoUrl, local.profilePhotoUrl),
    organizationPhotoUrl: pickPhoto(remote.organizationPhotoUrl, local.organizationPhotoUrl),
    vehiclePhotoUrl: pickPhoto(remote.vehiclePhotoUrl, local.vehiclePhotoUrl),
    profilePhotoName: pickNonEmptyString(remote.profilePhotoName, local.profilePhotoName),
    organizationPhotoName: pickNonEmptyString(remote.organizationPhotoName, local.organizationPhotoName),
    vehiclePhotoName: pickNonEmptyString(remote.vehiclePhotoName, local.vehiclePhotoName),
    bio: pickNonEmptyString(remote.bio, local.bio),
    websiteUrl: pickNonEmptyString(remote.websiteUrl, local.websiteUrl),
    linkedinUrl: pickNonEmptyString(remote.linkedinUrl, local.linkedinUrl),
    serviceCatalog: remote.serviceCatalog
      ? normalizeChauffeurServiceCatalog(remote.serviceCatalog)
      : local.serviceCatalog
        ? normalizeChauffeurServiceCatalog(local.serviceCatalog)
        : undefined,
    payment: remote.payment ?? local.payment,
    documents: remote.documents ?? local.documents,
    ridePricing: mergeRidePricing(local.ridePricing, remote.ridePricing),
  }
}
