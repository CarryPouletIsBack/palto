/**
 * Inscriptions chauffeur « self-service » sur l’appareil (hors compte admin principal).
 * Mot de passe + profil minimal ; la conformité documentaire est dans chauffeurComplianceStorage.
 */

const CHAUFFEUR_REGISTERED_KEY = 'palto:chauffeur_registered_v1'

export type ChauffeurVehicleType = 'berline' | 'utilitaire' | 'moto' | 'scooter'

export type ChauffeurRegisteredRecord = {
  password: string
  phoneInternational: string
  vehicleType: ChauffeurVehicleType
  deliveryEquipped: boolean
}

export type RegisterChauffeurPayload = {
  email: string
  password: string
  prenom: string
  nom: string
  phone: string
  vehicleType: ChauffeurVehicleType
  deliveryEquipped: boolean
}

export function normalizeChauffeurEmail(email: string): string {
  return email.trim().toLowerCase()
}

function isVehicleType(v: unknown): v is ChauffeurVehicleType {
  return v === 'berline' || v === 'utilitaire' || v === 'moto' || v === 'scooter'
}

function migrateEntry(key: string, v: unknown): ChauffeurRegisteredRecord | null {
  if (typeof v === 'string') {
    return {
      password: v,
      phoneInternational: '',
      vehicleType: 'berline',
      deliveryEquipped: false,
    }
  }
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  if (typeof o.password !== 'string') return null
  return {
    password: o.password,
    phoneInternational: typeof o.phoneInternational === 'string' ? o.phoneInternational : '',
    vehicleType: isVehicleType(o.vehicleType) ? o.vehicleType : 'berline',
    deliveryEquipped: Boolean(o.deliveryEquipped),
  }
}

export function loadChauffeurRegistry(): Record<string, ChauffeurRegisteredRecord> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(CHAUFFEUR_REGISTERED_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const out: Record<string, ChauffeurRegisteredRecord> = {}
    for (const [k, val] of Object.entries(parsed as Record<string, unknown>)) {
      const key = normalizeChauffeurEmail(k)
      const rec = migrateEntry(key, val)
      if (rec) out[key] = rec
    }
    return out
  } catch {
    return {}
  }
}

export function saveChauffeurRegistry(map: Record<string, ChauffeurRegisteredRecord>): void {
  localStorage.setItem(CHAUFFEUR_REGISTERED_KEY, JSON.stringify(map))
}

export function isChauffeurInSelfServiceRegistry(emailNorm: string): boolean {
  if (!emailNorm) return false
  return !!loadChauffeurRegistry()[emailNorm]
}

export function verifyChauffeurRegistrationPassword(emailNorm: string, password: string): boolean {
  const rec = loadChauffeurRegistry()[emailNorm]
  if (!rec) return false
  return rec.password === password
}

export function registerChauffeurInRegistry(
  payload: RegisterChauffeurPayload,
  opts: { reservedPrimaryEmailNorm: string }
): { success: boolean; error?: string } {
  const emailNorm = normalizeChauffeurEmail(payload.email)
  if (!emailNorm || !payload.password) return { success: false, error: 'MISSING' }
  if (payload.password.length < 6) return { success: false, error: 'PASSWORD_SHORT' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
    return { success: false, error: 'EMAIL_INVALID' }
  }
  const phone = (payload.phone ?? '').trim()
  if (!phone) {
    return { success: false, error: 'PHONE_REQUIRED' }
  }
  if (!payload.prenom?.trim() || !payload.nom?.trim()) {
    return { success: false, error: 'NAME_REQUIRED' }
  }
  if (emailNorm === opts.reservedPrimaryEmailNorm) {
    return { success: false, error: 'EMAIL_RESERVED' }
  }
  const map = loadChauffeurRegistry()
  if (map[emailNorm]) return { success: false, error: 'EMAIL_EXISTS' }

  map[emailNorm] = {
    password: payload.password,
    phoneInternational: phone,
    vehicleType: payload.vehicleType,
    deliveryEquipped: payload.deliveryEquipped,
  }
  saveChauffeurRegistry(map)
  return { success: true }
}
