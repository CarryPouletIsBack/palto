import type { SupabaseClient } from '@supabase/supabase-js'
import {
  estimateChauffeurFareTtc,
  parseRidePricingFromSnapshot,
} from './chauffeurFareEstimate.js'
import { vehicleTypeLabel } from './vehicleTypeLabel.js'

const AMOUNT_TOLERANCE_EUR = 1
const AMOUNT_TOLERANCE_RATIO = 0.05

function isNightRideHour(hour: number): boolean {
  return hour >= 20 || hour < 6
}

function resolveRideNight(
  bookingKind: 'instant' | 'scheduled',
  scheduledDate: string,
  scheduledTime: string
): boolean {
  if (bookingKind === 'instant') {
    return isNightRideHour(new Date().getHours())
  }
  const dt = new Date(`${scheduledDate}T${scheduledTime}`)
  if (Number.isNaN(dt.getTime())) return false
  return isNightRideHour(dt.getHours())
}

export type ValidateChauffeurAmountResult =
  | { ok: true }
  | { ok: false; status: 400; error: string; expectedEur?: number }

/** Vérifie amountEur vs grille chauffeur (UUID + distance connue). */
export async function validateChauffeurOrderAmount(
  supabase: SupabaseClient,
  params: {
    chauffeurAccountId: string
    amountEur: number
    distanceKm: number
    routeElevationM?: number
    bookingKind: 'instant' | 'scheduled'
    scheduledDate: string
    scheduledTime: string
  }
): Promise<ValidateChauffeurAmountResult> {
  const [{ data: profileRow }, { data: accRow }] = await Promise.all([
    supabase
      .from('chauffeur_profile_data')
      .select('account_snapshot')
      .eq('account_id', params.chauffeurAccountId)
      .maybeSingle(),
    supabase
      .from('app_accounts')
      .select('vehicle_type')
      .eq('id', params.chauffeurAccountId)
      .eq('role', 'chauffeur')
      .maybeSingle(),
  ])

  const ridePricing = parseRidePricingFromSnapshot(profileRow?.account_snapshot ?? {})
  const expected = estimateChauffeurFareTtc({
    ridePricing,
    routeKm: params.distanceKm,
    elevationM: params.routeElevationM ?? 0,
    isNight: resolveRideNight(params.bookingKind, params.scheduledDate, params.scheduledTime),
    vehicleLabel: vehicleTypeLabel(accRow?.vehicle_type as string | null),
  })

  if (expected == null || expected <= 0) {
    return { ok: true }
  }

  const diff = Math.abs(params.amountEur - expected)
  const tolerance = Math.max(AMOUNT_TOLERANCE_EUR, expected * AMOUNT_TOLERANCE_RATIO)
  if (diff > tolerance) {
    return {
      ok: false,
      status: 400,
      error: 'Montant incompatible avec le tarif du chauffeur selectionne.',
      expectedEur: expected,
    }
  }

  return { ok: true }
}
