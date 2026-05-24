import type { SanitizedChauffeurProfileSnapshot } from './chauffeurProfileSanitize.js'
import { mergeRidePricingFields } from './chauffeurProfileRidePricingMerge.js'
import type { RidePricingFields } from './chauffeurFareEstimate.js'

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
  local: SanitizedChauffeurProfileSnapshot,
  remote: Partial<SanitizedChauffeurProfileSnapshot>
): SanitizedChauffeurProfileSnapshot {
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
    ridePricing: mergeRidePricingFields(
      (local as { ridePricing?: RidePricingFields }).ridePricing,
      (remote as { ridePricing?: RidePricingFields }).ridePricing
    ),
  }
}
