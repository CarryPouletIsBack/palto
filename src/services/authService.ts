import { apiBaseUrl } from '../constants/featureFlags'
import { syncClientProfileWithServer } from './clientProfileSync'
import type { RegisterChauffeurPayload } from '../constants/chauffeurRegistrationStorage'

const AUTH_STORAGE_KEY = 'dashboard_auth'
export const DASHBOARD_AUTH_TOKEN_KEY = 'dashboard_token'

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
      return { success: false, error: data?.error || 'Erreur serveur' }
    }
    if (!data?.success || !data.token || !data.user) {
      return { success: false, error: data?.error || 'Reponse serveur invalide' }
    }
    return { success: true, token: data.token, user: data.user }
  } catch (error) {
    console.error('[authService] requete auth echouee', error)
    return { success: false, error: 'Service indisponible' }
  }
}

export function isChauffeurPrimaryAccountEmail(email: string | null | undefined): boolean {
  if (!email?.trim()) return false
  const user = getCurrentUser()
  return normalizeEmail(user?.email ?? '') === normalizeEmail(email)
}

export async function registerChauffeur(payload: RegisterChauffeurPayload): Promise<{ success: boolean; error?: string }> {
  const result = await postAuth('/auth/chauffeur/register', payload as unknown as Record<string, unknown>)
  if (!result.success || !result.token || !result.user) return { success: false, error: result.error }
  persistUnifiedSession(result.token, result.user)
  notifyClientSessionChanged()
  return { success: true }
}

export const isAuthenticated = (): boolean => {
  if (typeof window === 'undefined') return false

  try {
    const token = localStorage.getItem(DASHBOARD_AUTH_TOKEN_KEY)
    const authData = localStorage.getItem(AUTH_STORAGE_KEY)

    if (!isDbSessionToken(token) || !authData) {
      localStorage.removeItem(DASHBOARD_AUTH_TOKEN_KEY)
      localStorage.removeItem(AUTH_STORAGE_KEY)
      return false
    }

    const user = JSON.parse(authData)
    return !!(user && user.email)
  } catch {
    localStorage.removeItem(DASHBOARD_AUTH_TOKEN_KEY)
    localStorage.removeItem(AUTH_STORAGE_KEY)
    return false
  }
}

export const login = async (
  credentials: LoginCredentials
): Promise<{ success: boolean; user?: User; error?: string }> => {
  const result = await postAuth('/auth/chauffeur/login', credentials)
  if (!result.success || !result.token || !result.user) return { success: false, error: result.error }
  persistUnifiedSession(result.token, result.user)
  notifyClientSessionChanged()
  return { success: true, user: result.user }
}

export const logout = (): void => {
  localStorage.removeItem(DASHBOARD_AUTH_TOKEN_KEY)
  localStorage.removeItem(AUTH_STORAGE_KEY)
  localStorage.removeItem(CLIENT_AUTH_TOKEN_KEY)
  localStorage.removeItem(CLIENT_AUTH_STORAGE_KEY)
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

function persistUnifiedSession(token: string, user: User): void {
  localStorage.setItem(DASHBOARD_AUTH_TOKEN_KEY, token)
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
  localStorage.setItem(CLIENT_AUTH_TOKEN_KEY, token)
  localStorage.setItem(CLIENT_AUTH_STORAGE_KEY, JSON.stringify(user))
}

export async function registerClient(credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> {
  const result = await postAuth('/auth/client/register', credentials)
  if (!result.success || !result.token || !result.user) return { success: false, error: result.error }
  persistUnifiedSession(result.token, result.user)
  notifyClientSessionChanged()
  void syncClientProfileWithServer(result.user.email)
  return { success: true }
}

export async function loginClient(
  credentials: LoginCredentials
): Promise<{ success: boolean; user?: User; error?: string }> {
  const result = await postAuth('/auth/client/login', credentials)
  if (!result.success || !result.token || !result.user) return { success: false, error: result.error }
  persistUnifiedSession(result.token, result.user)
  notifyClientSessionChanged()
  void syncClientProfileWithServer(result.user.email)
  return { success: true, user: result.user }
}

export const isClientAuthenticated = (): boolean => {
  if (typeof window === 'undefined') return false
  try {
    const token = localStorage.getItem(CLIENT_AUTH_TOKEN_KEY)
    const authData = localStorage.getItem(CLIENT_AUTH_STORAGE_KEY)
    if (!isDbSessionToken(token) || !authData) {
      localStorage.removeItem(CLIENT_AUTH_TOKEN_KEY)
      localStorage.removeItem(CLIENT_AUTH_STORAGE_KEY)
      return false
    }
    const user = JSON.parse(authData)
    return !!(user && user.email)
  } catch {
    localStorage.removeItem(CLIENT_AUTH_TOKEN_KEY)
    localStorage.removeItem(CLIENT_AUTH_STORAGE_KEY)
    return false
  }
}

export const logoutClient = (): void => {
  localStorage.removeItem(DASHBOARD_AUTH_TOKEN_KEY)
  localStorage.removeItem(AUTH_STORAGE_KEY)
  localStorage.removeItem(CLIENT_AUTH_TOKEN_KEY)
  localStorage.removeItem(CLIENT_AUTH_STORAGE_KEY)
  notifyClientSessionChanged()
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
