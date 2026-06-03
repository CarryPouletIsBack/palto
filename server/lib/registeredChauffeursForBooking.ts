import type { SupabaseClient } from '@supabase/supabase-js'
import { sanitizeChauffeurProfileSnapshot } from './chauffeurProfileSanitize.js'
import {
  estimateChauffeurFareTtc,
  formatFareEurDisplay,
  parseRidePricingFromSnapshot,
  type RidePricingFields,
} from './chauffeurFareEstimate.js'
import { haversineKm, type GeoPoint } from './haversineKm.js'
import { vehicleTypeLabel } from './vehicleTypeLabel.js'
import type { NearbyDriverApiItem } from './nearbyDriversFromPresence.js'

function profilePhotoFromSnapshot(raw: unknown): string | undefined {
  const snap = sanitizeChauffeurProfileSnapshot(raw ?? {})
  const url = snap.profilePhotoUrl?.trim()
  return url || undefined
}

function displayName(fullName: string | null | undefined, email: string | null | undefined): string {
  const n = (fullName ?? '').trim()
  if (n) return n
  const local = (email ?? '').split('@')[0] ?? 'Chauffeur'
  const parts = local.split(/[._-]+/).filter(Boolean)
  if (parts.length === 0) return 'Chauffeur'
  const pretty = (s: string) => s.slice(0, 1).toUpperCase() + s.slice(1).toLowerCase()
  return parts.map(pretty).join(' ')
}

function indicativePriceEur(
  distanceToPickupKm: number,
  motoLabel: string,
  ridePricing: RidePricingFields | null
): number {
  const amount =
    estimateChauffeurFareTtc({
      ridePricing,
      routeKm: distanceToPickupKm,
      elevationM: 0,
      isNight: false,
      vehicleLabel: motoLabel,
    }) ?? 0
  return amount > 0 ? amount : Math.max(6, Math.round(8 + distanceToPickupKm * 1.15))
}

const NO_POSITION_DISTANCE_KM = 999_999

/**
 * Tous les chauffeurs inscrits (`app_accounts`), triés du plus proche au plus loin du pickup.
 * Pas de filtre « présence récente » : position issue de `chauffeur_presence` si dispo (même ancienne).
 */
export async function listRegisteredChauffeursForBooking(
  supabase: SupabaseClient,
  origin: GeoPoint,
  limit: number
): Promise<NearbyDriverApiItem[]> {
  const { data: accounts, error: accErr } = await supabase
    .from('app_accounts')
    .select(
      'id, email, full_name, vehicle_type, pet_friendly, luggage_assistance, insulated_bag, delivery_equipped'
    )
    .eq('role', 'chauffeur')

  if (accErr || !accounts?.length) return []

  const accountIds = accounts.map((a) => String(a.id))
  const { data: presenceRows } = await supabase
    .from('chauffeur_presence')
    .select('account_id, lng, lat')
    .in('account_id', accountIds)

  const presenceByAccountId = new Map<string, { lng: number; lat: number }>()
  for (const row of presenceRows ?? []) {
    const lng = Number(row.lng)
    const lat = Number(row.lat)
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue
    presenceByAccountId.set(String(row.account_id), { lng, lat })
  }

  const { data: profileRows } = await supabase
    .from('chauffeur_profile_data')
    .select('account_id, account_snapshot')
    .in('account_id', accountIds)

  const photoByAccountId = new Map<string, string>()
  const ridePricingByAccountId = new Map<string, RidePricingFields>()
  for (const row of profileRows ?? []) {
    const id = String(row.account_id)
    const photo = profilePhotoFromSnapshot(row.account_snapshot)
    if (photo) photoByAccountId.set(id, photo)
    const pricing = parseRidePricingFromSnapshot(row.account_snapshot)
    if (pricing) ridePricingByAccountId.set(id, pricing)
  }

  const ranked = accounts
    .map((acc) => {
      const id = String(acc.id)
      const presence = presenceByAccountId.get(id)
      const hasPosition = Boolean(presence)
      const point = presence ?? origin
      const distanceKm = hasPosition ? haversineKm(origin, point) : NO_POSITION_DISTANCE_KM

      const moto = vehicleTypeLabel(acc.vehicle_type as string | null)
      const ridePricing = ridePricingByAccountId.get(id) ?? null
      const priceEur = indicativePriceEur(hasPosition ? distanceKm : 0, moto, ridePricing)
      const minutes = hasPosition ? Math.max(2, Math.round((distanceKm / 22) * 60)) : null
      const profilePhotoUrl = photoByAccountId.get(id)

      return {
        id,
        name: displayName(acc.full_name as string | null, acc.email as string | null),
        moto,
        distance: hasPosition
          ? `${distanceKm.toFixed(1).replace('.', ',')} km · ~${minutes} min`
          : 'Inscrit sur Palto',
        price: formatFareEurDisplay(priceEur),
        longitude: point.lng,
        latitude: point.lat,
        distanceKm,
        positionKnown: hasPosition,
        ...(profilePhotoUrl ? { profilePhotoUrl } : {}),
        ...(ridePricing ? { ridePricing } : {}),
        petFriendly: acc.pet_friendly === true,
        luggageAssistance: acc.luggage_assistance === true,
        insulatedBag: acc.insulated_bag === true,
        deliveryEquipped: acc.delivery_equipped === true,
      } satisfies NearbyDriverApiItem
    })
    .filter((x): x is NearbyDriverApiItem => x !== null)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit)

  return ranked
}
