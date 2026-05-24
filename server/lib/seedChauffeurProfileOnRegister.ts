import type { SupabaseClient } from '@supabase/supabase-js'
import { isChauffeurProfileTableMissing } from './chauffeurProfileDb.js'

export type SeedChauffeurProfileInput = {
  accountId: string
  email: string
  prenom: string
  nom: string
  phone: string
  adresse: string
  ville: string
  vehicleType: string
  motorisation: string
  plaque: string
  licenseYear: number
  isVtc: boolean
  deliveryEquipped: boolean
}

/** Snapshot initial `chauffeur_profile_data` aligné sur `app_accounts` à l'inscription. */
export async function seedChauffeurProfileOnRegister(
  supabase: SupabaseClient,
  input: SeedChauffeurProfileInput
): Promise<void> {
  const emailNorm = input.email.trim().toLowerCase()
  const account_snapshot = {
    prenom: input.prenom.trim(),
    nom: input.nom.trim(),
    email: emailNorm,
    telephone: input.phone.trim(),
    adresse: input.adresse.trim(),
    ville: input.ville.trim(),
    vehicule: input.vehicleType.trim().toLowerCase(),
    plaque: input.plaque.trim(),
    motorisation: input.motorisation,
    licenseYear: input.licenseYear,
    isVtc: input.isVtc,
    deliveryEquipped: input.deliveryEquipped,
  }

  const { error } = await supabase.from('chauffeur_profile_data').upsert(
    {
      account_id: input.accountId,
      account_snapshot,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'account_id' }
  )

  if (error && !isChauffeurProfileTableMissing(error)) {
    console.warn('[auth/chauffeur/register] chauffeur_profile_data seed', error)
  }
}
