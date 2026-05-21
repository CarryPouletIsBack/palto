/** Profil chauffeur (local + sync serveur). */
export type ChauffeurProfileSnapshot = {
  nom: string
  prenom: string
  email: string
  telephone: string
  ville: string
  vehicule: string
  plaque: string
  profilePhotoUrl?: string | null
  organizationPhotoUrl?: string | null
  vehiclePhotoUrl?: string | null
  profilePhotoName?: string
  organizationPhotoName?: string
  vehiclePhotoName?: string
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
