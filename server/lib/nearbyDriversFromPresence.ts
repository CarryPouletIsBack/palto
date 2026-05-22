import type { SupabaseClient } from '@supabase/supabase-js'
import { CHAUFFEUR_PRESENCE_VISIBILITY_MS } from './chauffeurPresence.js'
import { sanitizeChauffeurProfileSnapshot } from './chauffeurProfileSanitize.js'
import { haversineKm, type GeoPoint } from './haversineKm.js'
import { vehicleTypeLabel } from './vehicleTypeLabel.js'

export type NearbyDriverApiItem = {
  id: string
  name: string
  moto: string
  distance: string
  price: string
  longitude: number
  latitude: number
  distanceKm: number
  profilePhotoUrl?: string
  petFriendly: boolean
  luggageAssistance: boolean
  insulatedBag: boolean
  deliveryEquipped: boolean
}

function profilePhotoFromSnapshot(raw: unknown): string | undefined {
  const snap = sanitizeChauffeurProfileSnapshot(raw ?? {})
  const url = snap.profilePhotoUrl?.trim()
  return url || undefined
}

const PRESENCE_MAX_AGE_MS = CHAUFFEUR_PRESENCE_VISIBILITY_MS

function displayName(fullName: string | null | undefined, email: string | null | undefined): string {
  const n = (fullName ?? '').trim()
  if (n) return n
  const local = (email ?? '').split('@')[0] ?? 'Chauffeur'
  const parts = local.split(/[._-]+/).filter(Boolean)
  if (parts.length === 0) return 'Chauffeur'
  const pretty = (s: string) => s.slice(0, 1).toUpperCase() + s.slice(1).toLowerCase()
  return parts.map(pretty).join(' ')
}

function estimatePriceEur(distanceKm: number): number {
  return Math.max(6, Math.round(8 + distanceKm * 1.15))
}

export async function listNearbyDriversFromPresence(
  supabase: SupabaseClient,
  origin: GeoPoint,
  radiusKm: number,
  limit: number
): Promise<NearbyDriverApiItem[]> {
  const cutoff = new Date(Date.now() - PRESENCE_MAX_AGE_MS).toISOString()

  const { data: presenceRows, error: presenceErr } = await supabase
    .from('chauffeur_presence')
    .select('account_id, lng, lat, updated_at')
    .eq('is_available', true)
    .gte('updated_at', cutoff)

  if (presenceErr || !presenceRows?.length) return []

  const accountIds = presenceRows.map((r) => String(r.account_id))
  const { data: accounts, error: accErr } = await supabase
    .from('app_accounts')
    .select(
      'id, email, full_name, vehicle_type, pet_friendly, luggage_assistance, insulated_bag, delivery_equipped'
    )
    .eq('role', 'chauffeur')
    .in('id', accountIds)

  if (accErr || !accounts?.length) return []

  const accountById = new Map(accounts.map((a) => [String(a.id), a]))

  const { data: profileRows } = await supabase
    .from('chauffeur_profile_data')
    .select('account_id, account_snapshot')
    .in('account_id', accountIds)

  const photoByAccountId = new Map<string, string>()
  for (const row of profileRows ?? []) {
    const id = String(row.account_id)
    const photo = profilePhotoFromSnapshot(row.account_snapshot)
    if (photo) photoByAccountId.set(id, photo)
  }

  const ranked = presenceRows
    .map((row) => {
      const lng = Number(row.lng)
      const lat = Number(row.lat)
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null
      const point = { lng, lat }
      const distanceKm = haversineKm(origin, point)
      if (distanceKm > radiusKm) return null
      const acc = accountById.get(String(row.account_id))
      if (!acc) return null
      const minutes = Math.max(2, Math.round((distanceKm / 22) * 60))
      const price = estimatePriceEur(distanceKm)
      const profilePhotoUrl = photoByAccountId.get(String(acc.id))
      return {
        id: String(acc.id),
        name: displayName(acc.full_name as string | null, acc.email as string | null),
        moto: vehicleTypeLabel(acc.vehicle_type as string | null),
        distance: `${distanceKm.toFixed(1).replace('.', ',')} km · ~${minutes} min`,
        price: `${price} EUR`,
        longitude: lng,
        latitude: lat,
        distanceKm,
        ...(profilePhotoUrl ? { profilePhotoUrl } : {}),
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
