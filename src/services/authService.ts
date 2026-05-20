import { apiBaseUrl } from '../constants/featureFlags'
import { syncClientProfileWithServer } from './clientProfileSync'
import type { RegisterChauffeurPayload } from '../constants/chauffeurRegistrationStorage'

const AUTH_STORAGE_KEY = 'dashboard_auth'
export const DASHBOARD_AUTH_TOKEN_KEY = 'dashboard_token'
/** Rôle du compte connecté (`client` passager ou `chauffeur`). */
export const SESSION_ROLE_KEY = 'palto:account_role'

export type AccountRole = 'client' | 'chauffeur'

const API_BASE_URL = apiBaseUrl()

export type { RegisterChauffeurPayload, ChauffeurVehicleType, ChauffeurRegisteredRecord } from '../constants/chauffeurRegistrationStorage'

export interface LoginCredentials {
  email: string
  password: string
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

export function isChauffeurPrimaryAccountEmail(email: string | null | undefined): boolean {
  if (!email?.trim()) return false
  const user = getCurrentUser()
  return normalizeEmail(user?.email ?? '') === normalizeEmail(email)
}

export function getSessionRole(): AccountRole | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(SESSION_ROLE_KEY)
  return raw === 'client' || raw === 'chauffeur' ? raw : null
}

function hasValidSessionToken(): boolean {
  const token = localStorage.getItem(DASHBOARD_AUTH_TOKEN_KEY)
  const authData = localStorage.getItem(AUTH_STORAGE_KEY)
  if (!isDbSessionToken(token) || !authData) return false
  try {
    const user = JSON.parse(authData)
    return !!(user && user.email)
  } catch {
    return false
  }
}

function clearInvalidSession(): void {
  localStorage.removeItem(DASHBOARD_AUTH_TOKEN_KEY)
  localStorage.removeItem(AUTH_STORAGE_KEY)
  localStorage.removeItem(CLIENT_AUTH_TOKEN_KEY)
  localStorage.removeItem(CLIENT_AUTH_STORAGE_KEY)
  localStorage.removeItem(SESSION_ROLE_KEY)
}

export async function registerChauffeur(payload: RegisterChauffeurPayload): Promise<{ success: boolean; error?: string }> {
  const result = await postAuth('/auth/chauffeur/register', payload as unknown as Record<string, unknown>)
  if (!result.success || !result.token || !result.user) return { success: false, error: result.error }
  persistUnifiedSession(result.token, result.user, 'chauffeur')
  notifyClientSessionChanged()
  return { success: true }
}

/** Session valide pour le dashboard / API chauffeur (rôle chauffeur ou legacy sans rôle). */
export const isChauffeurSession = (): boolean => {
  if (typeof window === 'undefined') return false
  if (!hasValidSessionToken()) {
    clearInvalidSession()
    return false
  }
  const role = getSessionRole()
  if (!role) return true
  return role === 'chauffeur'
}

/** @alias isChauffeurSession */
export const isAuthenticated = isChauffeurSession

/**
 * Connexion depuis n’importe quel écran : essaie d’abord le rôle attendu (page passager ou chauffeur),
 * puis l’autre rôle si besoin (même email, mots de passe différents possibles).
 */
export async function loginWithHint(
  credentials: LoginCredentials,
  hint: AccountRole
): Promise<{ success: boolean; user?: User; error?: string; role?: AccountRole }> {
  const order: AccountRole[] = hint === 'client' ? ['client', 'chauffeur'] : ['chauffeur', 'client']
  let lastError = 'Erreur de connexion'

  for (const role of order) {
    const endpoint = role === 'client' ? '/auth/client/login' : '/auth/chauffeur/login'
    const result = await postAuth(endpoint, credentials)
    if (result.success && result.token && result.user) {
      persistUnifiedSession(result.token, result.user, role)
      notifyClientSessionChanged()
      if (role === 'client') void syncClientProfileWithServer(result.user.email)
      return { success: true, user: result.user, role }
    }
    lastError = result.error ?? lastError
  }

  return { success: false, error: lastError }
}

/**
 * Connexion dashboard : uniquement le compte chauffeur (pas de bascule passager).
 * Si le mot de passe correspond au compte passager, message explicite.
 */
export async function loginChauffeurOnly(
  credentials: LoginCredentials
): Promise<{ success: boolean; user?: User; error?: string; role?: AccountRole }> {
  const result = await postAuth('/auth/chauffeur/login', credentials)
  if (result.success && result.token && result.user) {
    persistUnifiedSession(result.token, result.user, 'chauffeur')
    notifyClientSessionChanged()
    return { success: true, user: result.user, role: 'chauffeur' }
  }

  const clientProbe = await postAuth('/auth/client/login', credentials)
  if (clientProbe.success) {
    return {
      success: false,
      error:
        'Ce mot de passe correspond à votre compte passager. Sur le dashboard, utilisez le mot de passe du compte chauffeur (souvent différent).',
    }
  }

  return { success: false, error: result.error ?? 'Email ou mot de passe chauffeur incorrect' }
}

export const login = loginChauffeurOnly

export const logout = (): void => {
  clearInvalidSession()
  notifyClientSessionChanged()
}

/** En-tête `Authorization` pour les routes `/api/chauffeur/*` (token dashboard). */
export function getDashboardAuthorizationHeader(): string | null {
  if (typeof window === 'undefined') return null
  const token = localStorage.getItem(DASHBOARD_AUTH_TOKEN_KEY)
  if (!isDbSessionToken(token)) return null
  return `Bearer ${token}`
}

export const getCurrentUser = (): User | null => {
  if (typeof window === 'undefined') return null

  try {
    const authData = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!authData) return null
    return JSON.parse(authData)
  } catch {
    return null
  }
}

/* -------------------------------------------------------------------------- */
/* Compte passager (session distincte du dashboard chauffeur)                */
/* -------------------------------------------------------------------------- */

const CLIENT_AUTH_STORAGE_KEY = 'palto:client_auth'
export const CLIENT_AUTH_TOKEN_KEY = 'palto:client_token'
/** Émis après connexion / déconnexion passager (écouter sur `window` pour rafraîchir l’UI). */
export const PALTO_CLIENT_SESSION_CHANGED_EVENT = 'palto:client-session-changed'

function notifyClientSessionChanged(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(PALTO_CLIENT_SESSION_CHANGED_EVENT))
}

function persistUnifiedSession(token: string, user: User, role: AccountRole): void {
  localStorage.setItem(DASHBOARD_AUTH_TOKEN_KEY, token)
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
  localStorage.setItem(CLIENT_AUTH_TOKEN_KEY, token)
  localStorage.setItem(CLIENT_AUTH_STORAGE_KEY, JSON.stringify(user))
  localStorage.setItem(SESSION_ROLE_KEY, role)
}

export async function registerClient(credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> {
  const result = await postAuth('/auth/client/register', credentials)
  if (!result.success || !result.token || !result.user) return { success: false, error: result.error }
  persistUnifiedSession(result.token, result.user, 'client')
  notifyClientSessionChanged()
  void syncClientProfileWithServer(result.user.email)
  return { success: true }
}

export async function loginClient(
  credentials: LoginCredentials
): Promise<{ success: boolean; user?: User; error?: string; role?: AccountRole }> {
  return loginWithHint(credentials, 'client')
}

export const isClientAuthenticated = (): boolean => {
  if (typeof window === 'undefined') return false
  if (!hasValidSessionToken()) {
    clearInvalidSession()
    return false
  }
  const role = getSessionRole()
  if (!role) return true
  return role === 'client'
}

export const logoutClient = (): void => {
  logout()
}

export const getCurrentClientUser = (): User | null => {
  if (typeof window === 'undefined') return null
  try {
    const authData = localStorage.getItem(CLIENT_AUTH_STORAGE_KEY)
    if (!authData) return null
    return JSON.parse(authData)
  } catch {
    return null
  }
}
