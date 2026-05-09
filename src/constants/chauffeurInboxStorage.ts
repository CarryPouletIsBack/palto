/**
 * Boîte de réception chauffeur (stockage local) : invitations organisation, etc.
 * Cible `targetEmail` — affichée quand le profil chauffeur utilise cet e-mail.
 */
export const CHAUFFEUR_INBOX_STORAGE_KEY = 'palto_chauffeur_inbox_v1'

export type ChauffeurInboxItem = {
  id: string
  type: 'org_invite'
  targetEmail: string
  orgName: string
  fleetCode: string
  inviterEmail: string
  createdAt: string
}

function randomId(): string {
  return `n-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function loadChauffeurInbox(): ChauffeurInboxItem[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(CHAUFFEUR_INBOX_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (row): row is ChauffeurInboxItem =>
        row &&
        typeof row === 'object' &&
        typeof (row as ChauffeurInboxItem).id === 'string' &&
        (row as ChauffeurInboxItem).type === 'org_invite' &&
        typeof (row as ChauffeurInboxItem).targetEmail === 'string'
    )
  } catch {
    return []
  }
}

export function appendChauffeurInboxItem(item: Omit<ChauffeurInboxItem, 'id' | 'createdAt'>): ChauffeurInboxItem {
  const full: ChauffeurInboxItem = {
    ...item,
    id: randomId(),
    createdAt: new Date().toISOString(),
  }
  const prev = loadChauffeurInbox()
  try {
    localStorage.setItem(CHAUFFEUR_INBOX_STORAGE_KEY, JSON.stringify([full, ...prev]))
  } catch {
    /* ignore */
  }
  return full
}
