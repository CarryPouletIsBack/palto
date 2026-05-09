/**
 * Documents légaux chauffeur (cases à cocher « fourni » sur cet appareil).
 * Les chauffeurs inscrits via self-service ont les courses bloquées tant que tout n’est pas coché.
 */

import { normalizeChauffeurEmail } from './chauffeurRegistrationStorage'

export const CHAUFFEUR_COMPLIANCE_KEY = 'palto:chauffeur_compliance_v1'
export const CHAUFFEUR_COMPLIANCE_CHANGED_EVENT = 'palto:chauffeur-compliance-changed'

export const CHAUFFEUR_LEGAL_DOC_IDS = [
  'driving_license',
  'vtc_or_goods_capacity',
  'digital_identity',
  'kbis_siret',
  'security_declaration',
  'rc_pro',
  'insurance_civil_pro',
  'vehicle_insurance',
] as const

export type ChauffeurLegalDocId = (typeof CHAUFFEUR_LEGAL_DOC_IDS)[number]

export type ChauffeurComplianceSnapshot = Record<ChauffeurLegalDocId, boolean>

function emptyCompliance(): ChauffeurComplianceSnapshot {
  return {
    driving_license: false,
    vtc_or_goods_capacity: false,
    digital_identity: false,
    kbis_siret: false,
    security_declaration: false,
    rc_pro: false,
    insurance_civil_pro: false,
    vehicle_insurance: false,
  }
}

type ComplianceRoot = Record<string, Partial<ChauffeurComplianceSnapshot>>

function loadRoot(): ComplianceRoot {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(CHAUFFEUR_COMPLIANCE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return parsed as ComplianceRoot
  } catch {
    return {}
  }
}

function saveRoot(root: ComplianceRoot): void {
  localStorage.setItem(CHAUFFEUR_COMPLIANCE_KEY, JSON.stringify(root))
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CHAUFFEUR_COMPLIANCE_CHANGED_EVENT))
  }
}

export function loadComplianceSnapshot(emailNorm: string): ChauffeurComplianceSnapshot {
  const key = normalizeChauffeurEmail(emailNorm)
  if (!key) return emptyCompliance()
  const root = loadRoot()
  const partial = root[key] ?? {}
  const base = emptyCompliance()
  for (const id of CHAUFFEUR_LEGAL_DOC_IDS) {
    if (typeof partial[id] === 'boolean') base[id] = partial[id] as boolean
  }
  return base
}

export function complianceFullySatisfied(snapshot: ChauffeurComplianceSnapshot): boolean {
  return CHAUFFEUR_LEGAL_DOC_IDS.every((id) => snapshot[id] === true)
}

export function setComplianceDoc(emailNorm: string, docId: ChauffeurLegalDocId, value: boolean): void {
  const key = normalizeChauffeurEmail(emailNorm)
  if (!key) return
  const root = loadRoot()
  const prev = { ...emptyCompliance(), ...(root[key] ?? {}) }
  prev[docId] = value
  root[key] = prev
  saveRoot(root)
}

export function initComplianceForNewChauffeur(emailNorm: string): void {
  const key = normalizeChauffeurEmail(emailNorm)
  if (!key) return
  const root = loadRoot()
  if (root[key]) return
  root[key] = emptyCompliance()
  saveRoot(root)
}
