import type { SanitizedClientAccountSnapshot, SanitizedClientSavedPlacesSnapshot } from './clientProfileSanitize.js'

function pickNonEmptyString(remote: string | undefined, local: string | undefined): string {
  const r = (remote ?? '').trim()
  if (r) return r
  return (local ?? '').trim()
}

/** Fusionne deux snapshots compte sans écraser une photo ou un champ rempli par du vide. */
export function mergeAccountSnapshots(
  local: SanitizedClientAccountSnapshot,
  remote: SanitizedClientAccountSnapshot
): SanitizedClientAccountSnapshot {
  const remotePhoto = remote.profilePhotoUrl
  const localPhoto = local.profilePhotoUrl
  const profilePhotoUrl =
    typeof remotePhoto === 'string' && remotePhoto.trim()
      ? remotePhoto.trim()
      : typeof localPhoto === 'string' && localPhoto.trim()
        ? localPhoto.trim()
        : remotePhoto ?? localPhoto ?? null

  const remotePhotoName = (remote.profilePhotoName ?? '').trim()
  const localPhotoName = (local.profilePhotoName ?? '').trim()

  return {
    ...local,
    ...remote,
    prenom: pickNonEmptyString(remote.prenom, local.prenom),
    nom: pickNonEmptyString(remote.nom, local.nom),
    email: pickNonEmptyString(remote.email, local.email),
    telephone: pickNonEmptyString(remote.telephone, local.telephone),
    ville: pickNonEmptyString(remote.ville, local.ville),
    profilePhotoUrl,
    profilePhotoName: remotePhotoName || localPhotoName || '',
    preferredPayment:
      remote.preferredPayment === 'card' ||
      remote.preferredPayment === 'cash' ||
      remote.preferredPayment === 'indifferent'
        ? remote.preferredPayment
        : local.preferredPayment === 'card' ||
            local.preferredPayment === 'cash' ||
            local.preferredPayment === 'indifferent'
          ? local.preferredPayment
          : 'indifferent',
  }
}

/** Fusionne lieux favoris : ne remplace pas une adresse locale par une chaîne vide distante. */
export function mergeSavedPlacesSnapshots(
  local: SanitizedClientSavedPlacesSnapshot,
  remote: SanitizedClientSavedPlacesSnapshot
): SanitizedClientSavedPlacesSnapshot {
  const remoteExtras = Array.isArray(remote.extras) ? remote.extras : []
  const localExtras = Array.isArray(local.extras) ? local.extras : []
  return {
    domicile: pickNonEmptyString(remote.domicile, local.domicile),
    travail: pickNonEmptyString(remote.travail, local.travail),
    domicileCoords: remote.domicileCoords ?? local.domicileCoords ?? null,
    travailCoords: remote.travailCoords ?? local.travailCoords ?? null,
    extras: remoteExtras.length > 0 ? remoteExtras : localExtras,
  }
}
