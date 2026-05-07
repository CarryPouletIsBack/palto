/**
 * Organisation chauffeur (démo locale) : création, rôle admin, invitations.
 * Persistance `localStorage` — remplaçable plus tard par une API.
 */
import type { FleetAvailability, FleetZoneId } from './chauffeurFleetZones'
import { isFleetAvailability, isFleetZoneId } from './chauffeurFleetZones'

export const CHAUFFEUR_ORG_STORAGE_KEY = 'palto_chauffeur_organization_v1'
export const CHAUFFEUR_ORG_CHANGED_EVENT = 'palto:chauffeur-org-changed'

export type OrgMemberRole = 'admin' | 'driver'

export type OrgMemberStatus = 'pending' | 'active'

export type ChauffeurOrgMember = {
  id: string
  email: string
  role: OrgMemberRole
  status: OrgMemberStatus
  invitedAt: string
  /** Immatriculation (démo — pas de validation serveur). */
  vehiclePlate?: string
  /** Modèle / type (ex. scooter, berline). */
  vehicleModel?: string
  /** Secteur géographique (La Réunion, etc.). */
  zoneId?: FleetZoneId
  /** Statut opérationnel affiché à la flotte. */
  availability?: FleetAvailability
}

export type ChauffeurOrgSnapshot = {
  id: string
  name: string
  fleetCode: string
  base: string
  createdAt: string
  adminEmail: string
  members: ChauffeurOrgMember[]
  /** Image de couverture (URL absolue ou chemin `/…`). Optionnel — placeholder UI sinon. */
  coverImageUrl?: string | null
  /** Logo / avatar flotte. Optionnel — placeholder UI sinon. */
  logoUrl?: string | null
}

function randomId(): string {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function normalizeMember(m: ChauffeurOrgMember): ChauffeurOrgMember {
  const zoneId: FleetZoneId = isFleetZoneId(m.zoneId) ? m.zoneId : 'unset'
  const availability: FleetAvailability = isFleetAvailability(m.availability)
    ? m.availability
    : m.status === 'active'
      ? 'available'
      : 'off'
  return {
    ...m,
    zoneId,
    vehiclePlate: typeof m.vehiclePlate === 'string' ? m.vehiclePlate : '',
    vehicleModel: typeof m.vehicleModel === 'string' ? m.vehicleModel : '',
    availability,
  }
}

function normalizeOrgSnapshot(org: ChauffeurOrgSnapshot): ChauffeurOrgSnapshot {
  return {
    ...org,
    members: org.members.map(normalizeMember),
  }
}

/** Code flotte lisible (6 caractères). */
export function generateFleetCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 6; i += 1) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return s
}

export function loadChauffeurOrg(): ChauffeurOrgSnapshot | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(CHAUFFEUR_ORG_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ChauffeurOrgSnapshot
    if (!parsed || typeof parsed.id !== 'string' || !Array.isArray(parsed.members)) return null
    return normalizeOrgSnapshot(parsed)
  } catch {
    return null
  }
}

export function saveChauffeurOrg(org: ChauffeurOrgSnapshot | null): void {
  if (typeof localStorage === 'undefined') return
  try {
    if (org == null) {
      localStorage.removeItem(CHAUFFEUR_ORG_STORAGE_KEY)
    } else {
      localStorage.setItem(CHAUFFEUR_ORG_STORAGE_KEY, JSON.stringify(org))
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(CHAUFFEUR_ORG_CHANGED_EVENT))
    }
  } catch {
    /* ignore quota */
  }
}

export function createChauffeurOrganization(input: {
  name: string
  base: string
  adminEmail: string
}): ChauffeurOrgSnapshot {
  const now = new Date().toISOString()
  const adminMember: ChauffeurOrgMember = {
    id: randomId(),
    email: input.adminEmail.trim().toLowerCase(),
    role: 'admin',
    status: 'active',
    invitedAt: now,
    vehiclePlate: '',
    vehicleModel: '',
    zoneId: 'unset',
    availability: 'available',
  }
  return {
    id: `org-${Date.now()}`,
    name: input.name.trim(),
    fleetCode: generateFleetCode(),
    base: input.base.trim() || 'La Réunion',
    createdAt: now,
    adminEmail: input.adminEmail.trim().toLowerCase(),
    members: [adminMember],
  }
}
