import type { OverviewProfileTab } from '../components/ChauffeurOverviewProfile'
import type { ChauffeurProfileSnapshot } from '../constants/chauffeurProfileStorage'
import type { ChauffeurRideSettingsSnapshot } from '../constants/chauffeurRideSettingsStorage'
import type { SupportedPhoneCountry } from '../services/phoneNumber'
import { isValidNationalPhone } from '../services/phoneNumber'
import { isValidFrenchPlate, normalizeFrenchPlate } from '../services/vehiclePlate'
import { normalizeVehicleSlugForSelect } from '../constants/chauffeurVehicleType'

export type ChauffeurProfileOnboardingStepId = OverviewProfileTab

export type ChauffeurProfileOnboardingStep = {
  id: ChauffeurProfileOnboardingStepId
  labelFr: string
  labelEn: string
  done: boolean
  optional?: boolean
}

const ONBOARDING_VISITED_KEY = 'palto:chauffeur_profile_onboarding_visited'

const STEP_ORDER: ChauffeurProfileOnboardingStepId[] = [
  'vehicle',
  'documents',
  'service',
  'organization',
  'about',
  'contact',
]

const STEP_LABELS: Record<
  ChauffeurProfileOnboardingStepId,
  { labelFr: string; labelEn: string; optional?: boolean }
> = {
  vehicle: { labelFr: 'Votre véhicule', labelEn: 'Your vehicle' },
  documents: { labelFr: 'Documents', labelEn: 'Documents' },
  service: { labelFr: 'Service (tarifs)', labelEn: 'Service (rates)' },
  organization: { labelFr: 'Organisation', labelEn: 'Organization', optional: true },
  about: { labelFr: 'À propos', labelEn: 'About' },
  contact: { labelFr: 'Contact', labelEn: 'Contact' },
}

export type ChauffeurDocumentOnboardingStatus = {
  key: string
  status: 'missing' | 'pending' | 'soon' | 'ok'
}

function readVisitedTabs(): Set<ChauffeurProfileOnboardingStepId> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = sessionStorage.getItem(ONBOARDING_VISITED_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((v): v is ChauffeurProfileOnboardingStepId => typeof v === 'string'))
  } catch {
    return new Set()
  }
}

export function markProfileOnboardingTabVisited(tab: ChauffeurProfileOnboardingStepId): void {
  if (typeof window === 'undefined') return
  try {
    const visited = readVisitedTabs()
    visited.add(tab)
    sessionStorage.setItem(ONBOARDING_VISITED_KEY, JSON.stringify([...visited]))
  } catch {
    // ignore quota errors
  }
}

function isVehicleStepDone(profile: ChauffeurProfileSnapshot): boolean {
  const vehicleSlug = normalizeVehicleSlugForSelect(profile.vehicule)
  const plate = normalizeFrenchPlate(profile.plaque ?? '')
  return Boolean(vehicleSlug) && isValidFrenchPlate(plate)
}

function isDocumentsStepDone(documents: ChauffeurDocumentOnboardingStatus[]): boolean {
  if (!documents.length) return false
  return documents.every((doc) => doc.status === 'ok')
}

function isServiceStepDone(
  rideSettings: ChauffeurRideSettingsSnapshot,
  visited: Set<ChauffeurProfileOnboardingStepId>
): boolean {
  if (visited.has('service')) return true
  const catalog = rideSettings.serviceCatalog
  const hasCatalogOffer =
    catalog?.rides?.enabled ||
    catalog?.mad?.enabled ||
    catalog?.sam?.enabled ||
    catalog?.airport?.enabled ||
    catalog?.weddings?.enabled
  return Boolean(
    hasCatalogOffer &&
      (rideSettings.baseFareEur?.trim() || rideSettings.pricePerKmEur?.trim())
  )
}

function isOrganizationStepDone(hasOrganization: boolean): boolean {
  return !hasOrganization
}

function isAboutStepDone(profile: ChauffeurProfileSnapshot): boolean {
  return (profile.bio ?? '').trim().length >= 20
}

function isContactStepDone(
  profile: ChauffeurProfileSnapshot,
  phoneCountry: SupportedPhoneCountry,
  phoneNational: string
): boolean {
  if (profile.telephone?.trim()) return true
  return isValidNationalPhone(phoneCountry, phoneNational)
}

export function evaluateChauffeurProfileOnboarding(input: {
  profile: ChauffeurProfileSnapshot
  documents: ChauffeurDocumentOnboardingStatus[]
  rideSettings: ChauffeurRideSettingsSnapshot
  phoneCountry: SupportedPhoneCountry
  phoneNational: string
  hasOrganization: boolean
}): {
  steps: ChauffeurProfileOnboardingStep[]
  completedCount: number
  totalCount: number
  nextStepId: ChauffeurProfileOnboardingStepId | null
  tabCompletion: Record<ChauffeurProfileOnboardingStepId, boolean>
  allDone: boolean
} {
  const visited = readVisitedTabs()

  const doneById: Record<ChauffeurProfileOnboardingStepId, boolean> = {
    vehicle: isVehicleStepDone(input.profile),
    documents: isDocumentsStepDone(input.documents),
    service: isServiceStepDone(input.rideSettings, visited),
    organization: isOrganizationStepDone(input.hasOrganization),
    about: isAboutStepDone(input.profile),
    contact: isContactStepDone(input.profile, input.phoneCountry, input.phoneNational),
  }

  const steps: ChauffeurProfileOnboardingStep[] = STEP_ORDER.map((id) => ({
    id,
    labelFr: STEP_LABELS[id].labelFr,
    labelEn: STEP_LABELS[id].labelEn,
    optional: STEP_LABELS[id].optional,
    done: doneById[id],
  }))

  const completedCount = steps.filter((s) => s.done).length
  const totalCount = steps.length
  const nextStepId = steps.find((s) => !s.done)?.id ?? null

  return {
    steps,
    completedCount,
    totalCount,
    nextStepId,
    tabCompletion: doneById,
    allDone: completedCount === totalCount,
  }
}

const ONBOARDING_RAIL_MINIMIZED_KEY = 'palto:chauffeur_profile_onboarding_rail_minimized'
const ONBOARDING_INTRO_SEEN_KEY = 'palto:chauffeur_profile_onboarding_intro_seen_v1'

function readIntroSeenByEmail(): Record<string, true> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(ONBOARDING_INTRO_SEEN_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const out: Record<string, true> = {}
    for (const [email, seen] of Object.entries(parsed as Record<string, unknown>)) {
      if (seen === true && typeof email === 'string' && email.trim()) {
        out[email.trim().toLowerCase()] = true
      }
    }
    return out
  } catch {
    return {}
  }
}

export function readProfileOnboardingIntroSeen(emailNorm: string): boolean {
  if (!emailNorm.trim()) return false
  return Boolean(readIntroSeenByEmail()[emailNorm.trim().toLowerCase()])
}

export function markProfileOnboardingIntroSeen(emailNorm: string): void {
  if (typeof window === 'undefined' || !emailNorm.trim()) return
  try {
    const key = emailNorm.trim().toLowerCase()
    const map = readIntroSeenByEmail()
    map[key] = true
    localStorage.setItem(ONBOARDING_INTRO_SEEN_KEY, JSON.stringify(map))
  } catch {
    // ignore quota errors
  }
}

export function readProfileOnboardingRailMinimized(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(ONBOARDING_RAIL_MINIMIZED_KEY) === '1'
  } catch {
    return false
  }
}

export function writeProfileOnboardingRailMinimized(minimized: boolean): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(ONBOARDING_RAIL_MINIMIZED_KEY, minimized ? '1' : '0')
  } catch {
    // ignore quota errors
  }
}
