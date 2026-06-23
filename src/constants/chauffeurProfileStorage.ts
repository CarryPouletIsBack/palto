import type { ChauffeurServiceCatalogSnapshot } from './chauffeurServiceCatalog'

export type ChauffeurProfilePaymentFields = {
  ibanMasked?: string
  payoutFrequency?: string
  modePrincipal?: string
}

export type ChauffeurProfileRidePricingFields = {
  baseFareEur?: string
  pricePerKmEur?: string
  nightSurchargePercent?: string
  elevationSurchargeEurPer100m?: string
  pricingMultiplierPercent?: number
  maxPickupKm?: string
}

export type ChauffeurProfileDocumentEntry = {
  key: string
  label: string
  expiry: string
  status: 'pending' | 'ok' | 'expired'
}

/** Profil chauffeur (local + sync serveur). */
export type ChauffeurProfileSnapshot = {
  nom: string
  prenom: string
  email: string
  telephone: string
  adresse?: string
  ville: string
  vehicule: string
  plaque: string
  /** Marque / modèle détectés (carte grise) ou saisis manuellement. */
  vehicleModel?: string
  motorisation?: 'thermique_hydrogene_hybride' | 'electrique_100'
  licenseYear?: number
  isVtc?: boolean
  profilePhotoUrl?: string | null
  organizationPhotoUrl?: string | null
  vehiclePhotoUrl?: string | null
  profilePhotoName?: string
  organizationPhotoName?: string
  vehiclePhotoName?: string
  /** Présentation visible par les clients (onglet À propos). */
  bio?: string
  /** Site web public (onglet À propos). */
  websiteUrl?: string
  /** Profil LinkedIn public (onglet À propos). */
  linkedinUrl?: string
  /** Grille d’offres de service (courses, MAD, SAM, aéroport, mariages). */
  serviceCatalog?: ChauffeurServiceCatalogSnapshot
  payment?: ChauffeurProfilePaymentFields
  ridePricing?: ChauffeurProfileRidePricingFields
  documents?: ChauffeurProfileDocumentEntry[]
}

export const CHAUFFEUR_PROFILE_STORAGE_KEY = 'palto:chauffeur_profile_v1'

export function normalizeChauffeurProfileEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function loadStoredChauffeurProfiles(): Record<string, ChauffeurProfileSnapshot> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(CHAUFFEUR_PROFILE_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return parsed as Record<string, ChauffeurProfileSnapshot>
  } catch {
    return {}
  }
}

export function loadStoredChauffeurProfile(emailNorm: string): ChauffeurProfileSnapshot | null {
  if (!emailNorm) return null
  return loadStoredChauffeurProfiles()[emailNorm] ?? null
}

export function persistStoredChauffeurProfile(profile: ChauffeurProfileSnapshot): void {
  if (typeof window === 'undefined') return
  const emailNorm = normalizeChauffeurProfileEmail(profile.email)
  if (!emailNorm) return
  const allProfiles = loadStoredChauffeurProfiles()
  allProfiles[emailNorm] = profile
  localStorage.setItem(CHAUFFEUR_PROFILE_STORAGE_KEY, JSON.stringify(allProfiles))
}

export const PALTO_CHAUFFEUR_PROFILE_SYNCED_EVENT = 'palto:chauffeur-profile-synced'
