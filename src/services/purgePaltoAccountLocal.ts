import {
  CLIENT_ACCOUNT_BY_EMAIL_STORAGE_KEY,
  CLIENT_ACCOUNT_STORAGE_KEY,
  loadClientAccountSnapshot,
} from '../constants/clientAccountStorage'
import { CLIENT_APP_PREFERENCES_KEY } from '../constants/clientAppPreferencesStorage'
import { CLIENT_SECURITY_STORAGE_KEY } from '../constants/clientAccountSecurityStorage'
import { CLIENT_SAVED_PLACES_STORAGE_KEY } from '../constants/clientSavedPlacesStorage'
import { CLIENT_WALLET_STORAGE_KEY } from '../constants/clientWalletStorage'
import {
  CHAUFFEUR_COMPLIANCE_KEY,
  CHAUFFEUR_COMPLIANCE_CHANGED_EVENT,
} from '../constants/chauffeurComplianceStorage'
import { CHAUFFEUR_INBOX_STORAGE_KEY } from '../constants/chauffeurInboxStorage'
import {
  CHAUFFEUR_ORG_CHANGED_EVENT,
  CHAUFFEUR_ORG_STORAGE_KEY,
} from '../constants/chauffeurOrganizationStorage'
import {
  CHAUFFEUR_PROFILE_STORAGE_KEY,
  normalizeChauffeurProfileEmail,
  PALTO_CHAUFFEUR_PROFILE_SYNCED_EVENT,
} from '../constants/chauffeurProfileStorage'
import { CHAUFFEUR_RIDE_SETTINGS_KEY } from '../constants/chauffeurRideSettingsStorage'
import {
  loadChauffeurRegistry,
  normalizeChauffeurEmail,
  saveChauffeurRegistry,
} from '../constants/chauffeurRegistrationStorage'

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function removeEmailFromJsonMap(storageKey: string, emailKey: string): void {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return
    const map = JSON.parse(raw) as Record<string, unknown>
    if (!map || typeof map !== 'object') return
    if (!(emailKey in map)) return
    delete map[emailKey]
    localStorage.setItem(storageKey, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

function removeChauffeurProfile(emailKey: string): void {
  try {
    const raw = localStorage.getItem(CHAUFFEUR_PROFILE_STORAGE_KEY)
    if (!raw) return
    const map = JSON.parse(raw) as Record<string, unknown>
    if (!map || typeof map !== 'object') return
    const norm = normalizeChauffeurProfileEmail(emailKey)
    if (!(norm in map)) return
    delete map[norm]
    localStorage.setItem(CHAUFFEUR_PROFILE_STORAGE_KEY, JSON.stringify(map))
    window.dispatchEvent(new CustomEvent(PALTO_CHAUFFEUR_PROFILE_SYNCED_EVENT))
  } catch {
    /* ignore */
  }
}

function removeChauffeurCompliance(emailKey: string): void {
  try {
    const raw = localStorage.getItem(CHAUFFEUR_COMPLIANCE_KEY)
    if (!raw) return
    const root = JSON.parse(raw) as Record<string, unknown>
    if (!root || typeof root !== 'object') return
    const norm = normalizeChauffeurEmail(emailKey)
    if (!(norm in root)) return
    delete root[norm]
    localStorage.setItem(CHAUFFEUR_COMPLIANCE_KEY, JSON.stringify(root))
    window.dispatchEvent(new CustomEvent(CHAUFFEUR_COMPLIANCE_CHANGED_EVENT))
  } catch {
    /* ignore */
  }
}

function clearLegacyClientAccountIfOwned(emailKey: string): void {
  try {
    const legacy = loadClientAccountSnapshot()
    if (legacy.email.trim().toLowerCase() === emailKey) {
      localStorage.removeItem(CLIENT_ACCOUNT_STORAGE_KEY)
    }
  } catch {
    /* ignore */
  }
}

/** Données passager / Compte Palto (profil, portefeuille, lieux, etc.) pour cet email. */
export function purgeLocalClientPaltoData(email: string): void {
  if (typeof window === 'undefined') return
  const emailKey = normalizeEmail(email)
  if (!emailKey) return

  removeEmailFromJsonMap(CLIENT_ACCOUNT_BY_EMAIL_STORAGE_KEY, emailKey)
  removeEmailFromJsonMap('palto_client_security_by_email_v1', emailKey)
  removeEmailFromJsonMap('palto_client_saved_places_by_email_v1', emailKey)
  removeEmailFromJsonMap('palto_client_wallet_by_email_v1', emailKey)
  removeEmailFromJsonMap('palto_client_app_preferences_by_email_v1', emailKey)
  removeEmailFromJsonMap('palto_client_payment_methods_by_email_v1', emailKey)
  clearLegacyClientAccountIfOwned(emailKey)

  try {
    localStorage.removeItem(CLIENT_SECURITY_STORAGE_KEY)
    localStorage.removeItem(CLIENT_SAVED_PLACES_STORAGE_KEY)
    localStorage.removeItem(CLIENT_WALLET_STORAGE_KEY)
    localStorage.removeItem(CLIENT_APP_PREFERENCES_KEY)
  } catch {
    /* ignore */
  }
}

/** Données chauffeur locales pour cet email (profil, conformité, inscription locale). */
export function purgeLocalChauffeurPaltoData(email: string): void {
  if (typeof window === 'undefined') return
  const emailKey = normalizeEmail(email)
  if (!emailKey) return

  const registry = loadChauffeurRegistry()
  const norm = normalizeChauffeurEmail(emailKey)
  if (registry[norm]) {
    delete registry[norm]
    saveChauffeurRegistry(registry)
  }

  removeChauffeurProfile(emailKey)
  removeChauffeurCompliance(emailKey)

  try {
    localStorage.removeItem(CHAUFFEUR_ORG_STORAGE_KEY)
    localStorage.removeItem(CHAUFFEUR_INBOX_STORAGE_KEY)
    localStorage.removeItem(CHAUFFEUR_RIDE_SETTINGS_KEY)
    sessionStorage.removeItem('palto:chauffeur-nav-course')
    window.dispatchEvent(new CustomEvent(CHAUFFEUR_ORG_CHANGED_EVENT))
  } catch {
    /* ignore */
  }
}

/** Suppression locale complète selon le rôle Palto supprimé. */
export function purgeLocalPaltoAccountData(email: string, role: 'client' | 'chauffeur'): void {
  purgeLocalClientPaltoData(email)
  if (role === 'chauffeur') {
    purgeLocalChauffeurPaltoData(email)
  }
}
