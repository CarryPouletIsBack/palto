import { sanitizeChauffeurProfileSnapshot } from './chauffeurProfileSanitize.js'

const VEHICLE_TYPE_LABELS: Record<string, string> = {
  berline: 'Berline',
  utilitaire: 'Utilitaire',
  moto: 'Moto',
  scooter: 'Scooter',
}

function vehicleTypeLabel(slug: string | null | undefined): string {
  const k = (slug ?? '').trim().toLowerCase()
  return k ? (VEHICLE_TYPE_LABELS[k] ?? '') : ''
}

function isVehicleTypeSlug(value: string): boolean {
  return Boolean(vehicleTypeLabel(value))
}

function profilePhotoFromPayload(payload: Record<string, unknown>): string | undefined {
  const keys = [
    'driverProfilePhotoUrl',
    'profilePhotoUrl',
    'profile_photo_url',
    'photoUrl',
    'avatarUrl',
  ] as const
  for (const key of keys) {
    const v = payload[key]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return undefined
}

/** Métadonnées chauffeur stockées dans `course_events.payload` à l’acceptation. */
export type AcceptedDriverPayload = {
  driverName: string
  driverEmail: string
  driverPhone?: string
  driverProfilePhotoUrl?: string
  vehicleType?: string
  vehicleModel?: string
  licensePlate?: string
  /** Ligne courte UI (type + modèle). */
  vehicleLabel: string
}

export function buildAcceptedDriverPayload(input: {
  driverName: string
  driverEmail: string
  accountPhone?: string | null
  vehicleTypeSlug?: string | null
  profileSnapshot?: unknown
}): AcceptedDriverPayload {
  const snap = sanitizeChauffeurProfileSnapshot(input.profileSnapshot ?? {})
  const phone =
    snap.telephone?.trim() || input.accountPhone?.trim() || undefined
  const plate = snap.plaque?.trim() || undefined

  const slugAccount = (input.vehicleTypeSlug ?? '').trim().toLowerCase()
  const slugProfile = (snap.vehicule ?? '').trim().toLowerCase()
  const typeSlug = isVehicleTypeSlug(slugAccount)
    ? slugAccount
    : isVehicleTypeSlug(slugProfile)
      ? slugProfile
      : ''

  const typeLabel = vehicleTypeLabel(typeSlug) || vehicleTypeLabel(slugAccount) || vehicleTypeLabel(slugProfile)

  const vehiculeRaw = (snap.vehicule ?? '').trim()
  const vehicleModel =
    (typeof snap.vehicleModel === 'string' ? snap.vehicleModel.trim() : '') ||
    (vehiculeRaw && !isVehicleTypeSlug(vehiculeRaw) ? vehiculeRaw : undefined)

  const lineParts = [typeLabel, vehicleModel].filter(Boolean)
  const vehicleLabel =
    lineParts.join(' · ') || typeLabel || slugAccount || vehiculeRaw || ''

  const photo = snap.profilePhotoUrl?.trim()

  return {
    driverName: input.driverName,
    driverEmail: input.driverEmail,
    vehicleLabel,
    ...(phone ? { driverPhone: phone } : {}),
    ...(plate ? { licensePlate: plate } : {}),
    ...(typeSlug ? { vehicleType: typeSlug } : {}),
    ...(vehicleModel ? { vehicleModel } : {}),
    ...(photo ? { driverProfilePhotoUrl: photo } : {}),
  }
}

/** Normalise un payload legacy (ex. `vehicleLabel: "berline"`). */
export function normalizeDriverMetaFromEventPayload(
  payload: Record<string, unknown> | null | undefined
): {
  driverName?: string
  driverPhone?: string
  driverProfilePhotoUrl?: string
  vehicleLabel?: string
  vehicleType?: string
  vehicleModel?: string
  licensePlate?: string
} {
  if (!payload || typeof payload !== 'object') return {}
  const driverName =
    typeof payload.driverName === 'string' ? payload.driverName.trim() : undefined
  const driverPhone =
    typeof payload.driverPhone === 'string' ? payload.driverPhone.trim() : undefined
  const driverProfilePhotoUrl = profilePhotoFromPayload(payload)
  const licensePlate =
    typeof payload.licensePlate === 'string' ? payload.licensePlate.trim() : undefined
  const vehicleType =
    typeof payload.vehicleType === 'string' ? payload.vehicleType.trim().toLowerCase() : undefined
  const vehicleModel =
    typeof payload.vehicleModel === 'string' ? payload.vehicleModel.trim() : undefined
  let vehicleLabel =
    typeof payload.vehicleLabel === 'string' ? payload.vehicleLabel.trim() : undefined

  if (vehicleLabel && isVehicleTypeSlug(vehicleLabel) && !vehicleType) {
    const label = vehicleTypeLabel(vehicleLabel)
    return {
      driverName,
      driverPhone,
      driverProfilePhotoUrl,
      licensePlate,
      vehicleType: vehicleLabel.toLowerCase(),
      vehicleLabel: label || vehicleLabel,
      vehicleModel,
    }
  }

  if (vehicleType && vehicleModel) {
    const tl = vehicleTypeLabel(vehicleType)
    vehicleLabel = [tl, vehicleModel].filter(Boolean).join(' · ') || vehicleLabel
  } else if (vehicleType && !vehicleLabel) {
    vehicleLabel = vehicleTypeLabel(vehicleType) || vehicleType
  }

  return {
    driverName,
    driverPhone,
    driverProfilePhotoUrl,
    licensePlate,
    vehicleType,
    vehicleModel,
    vehicleLabel,
  }
}

export type ResolvedDriverMeta = ReturnType<typeof normalizeDriverMetaFromEventPayload>

/** Construit les métadonnées affichage client depuis compte + profil chauffeur. */
export function driverMetaFromChauffeurAccount(input: {
  fullName?: string | null
  email?: string | null
  phone?: string | null
  vehicleTypeSlug?: string | null
  profileSnapshot?: unknown
}): ResolvedDriverMeta {
  const email = (input.email ?? '').trim().toLowerCase()
  const fallbackName = email.split('@')[0] || 'Chauffeur'
  const driverName = (input.fullName ?? '').trim() || fallbackName
  const built = buildAcceptedDriverPayload({
    driverName,
    driverEmail: email || 'chauffeur@palto.local',
    accountPhone: input.phone ?? null,
    vehicleTypeSlug: input.vehicleTypeSlug ?? null,
    profileSnapshot: input.profileSnapshot ?? {},
  })
  return normalizeDriverMetaFromEventPayload(built as unknown as Record<string, unknown>)
}

export function mergeDriverMeta(
  fromEvent: ResolvedDriverMeta,
  fromAccount: ResolvedDriverMeta
): ResolvedDriverMeta {
  const vehicleLabel =
    fromAccount.vehicleLabel?.trim() ||
    fromEvent.vehicleLabel?.trim() ||
    vehicleTypeLabel(fromAccount.vehicleType) ||
    vehicleTypeLabel(fromEvent.vehicleType) ||
    undefined

  return {
    driverName: fromEvent.driverName || fromAccount.driverName,
    driverPhone: fromEvent.driverPhone || fromAccount.driverPhone,
    driverProfilePhotoUrl:
      fromAccount.driverProfilePhotoUrl || fromEvent.driverProfilePhotoUrl,
    licensePlate: fromEvent.licensePlate || fromAccount.licensePlate,
    vehicleType: fromEvent.vehicleType || fromAccount.vehicleType,
    vehicleModel: fromEvent.vehicleModel || fromAccount.vehicleModel,
    vehicleLabel,
  }
}
