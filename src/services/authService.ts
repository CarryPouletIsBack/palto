import { apiBaseUrl } from '../constants/featureFlags'
import { DEFAULT_CLIENT_ACCOUNT, saveClientAccountSnapshot } from '../constants/clientAccountStorage'
import {
  type RegisterChauffeurPayload,
  verifyChauffeurRegistrationPassword,
} from '../constants/chauffeurRegistrationStorage'
import { purgeLocalPaltoAccountData } from './purgePaltoAccountLocal'
import {
  normalizeChauffeurProfileEmail,
  persistStoredChauffeurProfile,
} from '../constants/chauffeurProfileStorage'

const CHAUFFEUR_AUTH_STORAGE_KEY = 'dashboard_auth'
export const DASHBOARD_AUTH_TOKEN_KEY = 'dashboard_token'

const CLIENT_AUTH_STORAGE_KEY = 'palto:client_auth'
export const CLIENT_AUTH_TOKEN_KEY = 'palto:client_token'

/** @deprecated Rôle unique supprimé — conservé pour migration one-shot depuis l’auth unifiée. */
const LEGACY_SESSION_ROLE_KEY = 'palto:account_role'
const LEGACY_AUTH_MIGRATION_KEY = 'palto:auth-split-migration-v1'

export type AccountRole = 'client' | 'chauffeur'

const API_BASE_URL = apiBaseUrl()

export type { RegisterChauffeurPayload, ChauffeurVehicleType, ChauffeurRegisteredRecord } from '../constants/chauffeurRegistrationStorage'

export interface LoginCredentials {
  email: string
  password: string
}

export type RegisterClientPayload = LoginCredentials & {
  prenom: string
  nom: string
  phone: string
}

export interface User {
  email: string
  displayName?: string
  username?: string
}

function isDbSessionToken(token: string | null): token is string {
  if (!token) return false
  return /^[a-f0-9]{64}$/i.test(token.trim())
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function parseStoredUser(raw: string | null): User | null {
  if (!raw) return null
  try {
    const user = JSON.parse(raw) as User
    return user?.email?.trim() ? user : null
  } catch {
    return null
  }
}

async function postAuth<TPayload extends Record<string, unknown>>(
  endpoint: string,
  payload: TPayload
): Promise<{ success: boolean; token?: string; user?: User; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = (await response.json().catch(() => null)) as
      | { success?: boolean; token?: string; user?: User; error?: string }
      | null
    if (!response.ok) {
      if (response.status === 503) {
        return {
          success: false,
          error:
            data?.error ||
            'Service indisponible (Supabase). En local : lance npm run dev:api, pas seulement npm run dev.',
        }
      }
      return { success: false, error: data?.error || `Erreur serveur (${response.status})` }
    }
    if (!data?.success || !data.token || !data.user) {
      return { success: false, error: data?.error || 'Reponse serveur invalide' }
    }
    return { success: true, token: data.token, user: data.user }
  } catch (error) {
    console.error('[authService] requete auth echouee', error)
    return {
      success: false,
      error:
        'Impossible de joindre l’API (/api). En local : terminal avec npm run dev:api (Vercel sur :3000), puis http://localhost:5173.',
    }
  }
}

/** @deprecated Préférer `isChauffeurSession` + email chauffeur explicite. */
export function isChauffeurPrimaryAccountEmail(email: string | null | undefined): boolean {
  if (!email?.trim()) return false
  const chauffeur = getCurrentUser()
  if (!chauffeur?.email?.trim()) return false
  return normalizeEmail(chauffeur.email) === normalizeEmail(email)
}

function hasValidChauffeurSessionToken(): boolean {
  const token = localStorage.getItem(DASHBOARD_AUTH_TOKEN_KEY)
  const user = parseStoredUser(localStorage.getItem(CHAUFFEUR_AUTH_STORAGE_KEY))
  return isDbSessionToken(token) && user != null
}

function hasValidClientSessionToken(): boolean {
  const token = localStorage.getItem(CLIENT_AUTH_TOKEN_KEY)
  const user = parseStoredUser(localStorage.getItem(CLIENT_AUTH_STORAGE_KEY))
  return isDbSessionToken(token) && user != null
}

function clearChauffeurSession(): void {
  localStorage.removeItem(DASHBOARD_AUTH_TOKEN_KEY)
  localStorage.removeItem(CHAUFFEUR_AUTH_STORAGE_KEY)
}

function clearClientSession(): void {
  localStorage.removeItem(CLIENT_AUTH_TOKEN_KEY)
  localStorage.removeItem(CLIENT_AUTH_STORAGE_KEY)
}

/** Sépare les anciennes sessions unifiées (un token dans les deux clés). */
function migrateLegacyUnifiedSessionOnce(): void {
  if (typeof window === 'undefined') return
  if (localStorage.getItem(LEGACY_AUTH_MIGRATION_KEY) === '1') return

  const legacyRole = localStorage.getItem(LEGACY_SESSION_ROLE_KEY)
  const dashToken = localStorage.getItem(DASHBOARD_AUTH_TOKEN_KEY)?.trim() ?? ''
  const clientToken = localStorage.getItem(CLIENT_AUTH_TOKEN_KEY)?.trim() ?? ''
  const tokensMatch = dashToken.length > 0 && dashToken === clientToken

  if (tokensMatch || legacyRole) {
    if (legacyRole === 'client' || (tokensMatch && !legacyRole)) {
      clearChauffeurSession()
    } else if (legacyRole === 'chauffeur') {
      clearClientSession()
    }
    localStorage.removeItem(LEGACY_SESSION_ROLE_KEY)
  }

  localStorage.setItem(LEGACY_AUTH_MIGRATION_KEY, '1')
}

export const PALTO_CHAUFFEUR_SESSION_CHANGED_EVENT = 'palto:chauffeur-session-changed'

function notifyChauffeurSessionChanged(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(PALTO_CHAUFFEUR_SESSION_CHANGED_EVENT))
}

function persistChauffeurSession(token: string, user: User): void {
  localStorage.setItem(DASHBOARD_AUTH_TOKEN_KEY, token)
  localStorage.setItem(CHAUFFEUR_AUTH_STORAGE_KEY, JSON.stringify(user))
}

export async function registerChauffeur(payload: RegisterChauffeurPayload): Promise<{ success: boolean; error?: string }> {
  const result = await postAuth(
    '/auth?role=chauffeur&action=register',
    payload as unknown as Record<string, unknown>
  )
  if (!result.success || !result.token || !result.user) return { success: false, error: result.error }
  persistChauffeurSession(result.token, result.user)
  const emailNorm = normalizeChauffeurProfileEmail(payload.email)
  persistStoredChauffeurProfile({
    prenom: payload.prenom.trim(),
    nom: payload.nom.trim(),
    email: emailNorm,
    telephone: payload.phone.trim(),
    adresse: payload.adresse.trim(),
    ville: payload.ville.trim(),
    vehicule: payload.vehicleType,
    plaque: payload.plaque.trim(),
    motorisation: payload.motorisation,
    licenseYear: payload.licenseYear,
    isVtc: payload.isVtc,
    profilePhotoUrl: null,
    organizationPhotoUrl: null,
    vehiclePhotoUrl: null,
    profilePhotoName: '',
    organizationPhotoName: '',
    vehiclePhotoName: '',
  })
  saveClientAccountSnapshot(
    {
      ...DEFAULT_CLIENT_ACCOUNT,
      prenom: payload.prenom.trim(),
      nom: payload.nom.trim(),
      email: emailNorm,
      telephone: payload.phone.trim(),
      ville: payload.ville.trim(),
    },
    emailNorm
  )
  notifyChauffeurSessionChanged()
  return { success: true }
}

/** Session chauffeur valide (dashboard / API chauffeur) — indépendante du compte client. */
export const isChauffeurSession = (): boolean => {
  if (typeof window === 'undefined') return false
  migrateLegacyUnifiedSessionOnce()
  if (!hasValidChauffeurSessionToken()) {
    clearChauffeurSession()
    return false
  }
  return true
}

/** @alias isChauffeurSession */
export const isAuthenticated = isChauffeurSession

/**
 * Connexion compte client uniquement (`/auth/client/login`).
 * @deprecated Utiliser `loginClient` — conservé pour compat interne.
 */
export async function loginWithHint(
  credentials: LoginCredentials,
  _hint: AccountRole
): Promise<{ success: boolean; user?: User; error?: string; role?: AccountRole }> {
  return loginClient(credentials)
}

/** Connexion compte chauffeur uniquement. */
export async function loginChauffeurOnly(
  credentials: LoginCredentials
): Promise<{ success: boolean; user?: User; error?: string; role?: AccountRole }> {
  const result = await postAuth('/auth?role=chauffeur&action=login', credentials)
  if (result.success && result.token && result.user) {
    persistChauffeurSession(result.token, result.user)
    notifyChauffeurSessionChanged()
    return { success: true, user: result.user, role: 'chauffeur' }
  }

  const clientProbe = await postAuth('/auth?role=client&action=login', credentials)
  if (clientProbe.success) {
    return {
      success: false,
      error:
        'Ce mot de passe correspond au compte client. Connectez-vous depuis Mon compte ou utilisez le mot de passe chauffeur.',
    }
  }

  return { success: false, error: result.error ?? 'Email ou mot de passe incorrect' }
}

export const login = loginChauffeurOnly

export const logout = (): void => {
  clearChauffeurSession()
  notifyChauffeurSessionChanged()
}

/** Accueil Palto selon le préfixe langue dans l’URL. */
export function getPaltoHomePath(): string {
  if (typeof window === 'undefined') return '/fr'
  return window.location.pathname.startsWith('/en') ? '/en' : '/fr'
}

/** Déconnexion chauffeur puis rechargement accueil (évite état React incohérent). */
export function logoutChauffeurToHome(): void {
  logout()
  if (typeof window !== 'undefined') window.location.assign(getPaltoHomePath())
}

/** En-tête `Authorization` pour les routes `/api/chauffeur/*`. */
export function getDashboardAuthorizationHeader(): string | null {
  if (typeof window === 'undefined') return null
  const token = localStorage.getItem(DASHBOARD_AUTH_TOKEN_KEY)
  if (!isDbSessionToken(token)) return null
  return `Bearer ${token}`
}

export const getCurrentUser = (): User | null => {
  if (typeof window === 'undefined') return null
  migrateLegacyUnifiedSessionOnce()
  return parseStoredUser(localStorage.getItem(CHAUFFEUR_AUTH_STORAGE_KEY))
}

/* -------------------------------------------------------------------------- */
/* Compte client (session distincte)                                           */
/* -------------------------------------------------------------------------- */

export const PALTO_CLIENT_SESSION_CHANGED_EVENT = 'palto:client-session-changed'

function notifyClientSessionChanged(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(PALTO_CLIENT_SESSION_CHANGED_EVENT))
}

function persistClientSession(token: string, user: User): void {
  localStorage.setItem(CLIENT_AUTH_TOKEN_KEY, token)
  localStorage.setItem(CLIENT_AUTH_STORAGE_KEY, JSON.stringify(user))
}

export async function registerClient(payload: RegisterClientPayload): Promise<{ success: boolean; error?: string }> {
  const result = await postAuth(
    '/auth?role=client&action=register',
    payload as unknown as Record<string, unknown>
  )
  if (!result.success || !result.token || !result.user) return { success: false, error: result.error }
  persistClientSession(result.token, result.user)
  notifyClientSessionChanged()
  const emailNorm = payload.email.trim().toLowerCase()
  saveClientAccountSnapshot(
    {
      prenom: payload.prenom.trim(),
      nom: payload.nom.trim(),
      email: emailNorm,
      telephone: payload.phone.trim(),
      ville: '',
      preferredPayment: 'indifferent',
      profilePhotoUrl: null,
      profilePhotoName: '',
    },
    emailNorm
  )
  void import('./clientProfileSync').then((m) => m.syncClientProfileWithServer(result.user.email))
  return { success: true }
}

export async function loginClient(
  credentials: LoginCredentials
): Promise<{ success: boolean; user?: User; error?: string; role?: AccountRole }> {
  const result = await postAuth('/auth?role=client&action=login', credentials)
  if (result.success && result.token && result.user) {
    persistClientSession(result.token, result.user)
    notifyClientSessionChanged()
    void import('./clientProfileSync').then((m) => m.syncClientProfileWithServer(result.user.email))
    return { success: true, user: result.user, role: 'client' }
  }

  const chauffeurProbe = await postAuth('/auth?role=chauffeur&action=login', credentials)
  if (chauffeurProbe.success) {
    return {
      success: false,
      error:
        'Ce mot de passe correspond au compte chauffeur. Utilisez l’espace chauffeur ou le mot de passe client.',
    }
  }

  return { success: false, error: result.error ?? 'Email ou mot de passe incorrect' }
}

export const isClientAuthenticated = (): boolean => {
  if (typeof window === 'undefined') return false
  migrateLegacyUnifiedSessionOnce()
  if (!hasValidClientSessionToken()) {
    clearClientSession()
    return false
  }
  return true
}

export const logoutClient = (): void => {
  clearClientSession()
  notifyClientSessionChanged()
}

/** Déconnexion client puis rechargement accueil. */
export function logoutClientToHome(): void {
  logoutClient()
  if (typeof window !== 'undefined') window.location.assign(getPaltoHomePath())
}

/** En-tête `Authorization` pour les routes `/api/client/*` protégées. */
export function getClientAuthorizationHeader(): string | null {
  if (typeof window === 'undefined') return null
  const token = localStorage.getItem(CLIENT_AUTH_TOKEN_KEY)
  if (!isDbSessionToken(token)) return null
  return `Bearer ${token}`
}

export const getCurrentClientUser = (): User | null => {
  if (typeof window === 'undefined') return null
  migrateLegacyUnifiedSessionOnce()
  return parseStoredUser(localStorage.getItem(CLIENT_AUTH_STORAGE_KEY))
}

/** Supprime le compte Palto (serveur si session API, sinon inscription chauffeur locale uniquement). */
export async function deletePaltoAccount(
  role: AccountRole,
  password: string
): Promise<{ success: boolean; error?: string }> {
  const pwd = password.trim()
  if (!pwd) return { success: false, error: 'PASSWORD_REQUIRED' }

  const user = role === 'client' ? getCurrentClientUser() : getCurrentUser()
  const email = user?.email?.trim()
  if (!email) return { success: false, error: 'NOT_SIGNED_IN' }

  const authHeader =
    role === 'client' ? getClientAuthorizationHeader() : getDashboardAuthorizationHeader()

  if (authHeader) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth?role=${role}&action=delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({ password: pwd }),
      })
      const data = (await response.json().catch(() => null)) as { success?: boolean; error?: string } | null
      if (!response.ok) {
        return {
          success: false,
          error: data?.error || (response.status === 401 ? 'WRONG_PASSWORD' : 'DELETE_FAILED'),
        }
      }
      if (!data?.success) {
        return { success: false, error: data?.error || 'DELETE_FAILED' }
      }
    } catch (error) {
      console.error('[authService] delete account', error)
      return { success: false, error: 'NETWORK' }
    }
  } else if (role === 'chauffeur') {
    const emailNorm = normalizeEmail(email)
    if (!verifyChauffeurRegistrationPassword(emailNorm, pwd)) {
      return { success: false, error: 'WRONG_PASSWORD' }
    }
  } else {
    return { success: false, error: 'API_SESSION_REQUIRED' }
  }

  purgeLocalPaltoAccountData(email, role)
  if (role === 'client') {
    logoutClient()
  } else {
    logout()
  }
  return { success: true }
}

/** Rôle « actif » pour redirection après login (priorité chauffeur si les deux sessions existent). */
export function getSessionRole(): AccountRole | null {
  if (isChauffeurSession()) return 'chauffeur'
  if (isClientAuthenticated()) return 'client'
  return null
}

if (typeof window !== 'undefined') {
  migrateLegacyUnifiedSessionOnce()
}
