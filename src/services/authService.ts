// Service d'authentification
// Utilise une API route Vercel pour la vérification du mot de passe

import {
  loadChauffeurRegistry,
  normalizeChauffeurEmail,
  registerChauffeurInRegistry,
  verifyChauffeurRegistrationPassword,
  type RegisterChauffeurPayload,
} from '../constants/chauffeurRegistrationStorage'
import { initComplianceForNewChauffeur } from '../constants/chauffeurComplianceStorage'
import { apiBaseUrl } from '../constants/featureFlags'

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

/** Identifiants dashboard : uniquement variables d’environnement (jamais de secrets dans le code). */
function readLocalDashboardCredentials(): { email: string; password: string } | null {
  const email = (import.meta.env.VITE_DASHBOARD_EMAIL as string | undefined)?.trim()
  const password = (import.meta.env.VITE_DASHBOARD_PASSWORD as string | undefined)?.trim()
  if (!email || !password) return null
  return { email, password }
}

function tryLocalLogin(credentials: LoginCredentials): { success: boolean; user?: User; error?: string } {
  const creds =
    readLocalDashboardCredentials() ?? {
      email: 'chauffeur@palto.local',
      password: 'chauffeur123',
    }
  const emailNorm = normalizeChauffeurEmail(credentials.email)
  const primaryNorm = normalizeChauffeurEmail(creds.email)

  const writeSession = (emailForUser: string): { success: true; user: User } => {
    const token = btoa(`${emailForUser}:${Date.now()}`)
    const user: User = {
      email: emailForUser.trim(),
      displayName: emailForUser.split('@')[0]?.trim() || 'Chauffeur',
    }
    localStorage.setItem(DASHBOARD_AUTH_TOKEN_KEY, token)
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
    return { success: true, user }
  }

  if (emailNorm === primaryNorm) {
    if (credentials.password === creds.password) {
      return writeSession(credentials.email)
    }
    return { success: false, error: 'Mot de passe incorrect' }
  }

  if (verifyChauffeurRegistrationPassword(emailNorm, credentials.password)) {
    return writeSession(credentials.email)
  }
  if (loadChauffeurRegistry()[emailNorm]) {
    return { success: false, error: 'Mot de passe incorrect' }
  }

  return { success: false, error: 'Email incorrect' }
}

/** Compte admin chauffeur (env ou démo) — pas soumis au blocage documents self-service. */
export function isChauffeurPrimaryAccountEmail(email: string | null | undefined): boolean {
  if (!email?.trim()) return false
  const creds =
    readLocalDashboardCredentials() ?? {
      email: 'chauffeur@palto.local',
      password: '',
    }
  return normalizeChauffeurEmail(email) === normalizeChauffeurEmail(creds.email)
}

/**
 * Inscription chauffeur locale (téléphone, véhicule, équipement livraison) + initialisation des documents à fournir.
 */
export function registerChauffeur(payload: RegisterChauffeurPayload): { success: boolean; error?: string } {
  if (typeof window === 'undefined') return { success: false, error: 'UNAVAILABLE' }
  const primary =
    readLocalDashboardCredentials() ?? {
      email: 'chauffeur@palto.local',
      password: 'chauffeur123',
    }
  const result = registerChauffeurInRegistry(payload, {
    reservedPrimaryEmailNorm: normalizeChauffeurEmail(primary.email),
  })
  if (result.success) {
    initComplianceForNewChauffeur(normalizeChauffeurEmail(payload.email))
  }
  return result
}

export const isAuthenticated = (): boolean => {
  if (typeof window === 'undefined') return false

  try {
    const token = localStorage.getItem(DASHBOARD_AUTH_TOKEN_KEY)
    const authData = localStorage.getItem(AUTH_STORAGE_KEY)

    if (!token || !authData) {
      return false
    }

    const user = JSON.parse(authData)
    return !!(user && token && user.email)
  } catch {
    return false
  }
}

export const login = async (
  credentials: LoginCredentials
): Promise<{ success: boolean; user?: User; error?: string }> => {
  const isDevelopment =
    import.meta.env.DEV ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'

  if (isDevelopment) {
    return tryLocalLogin(credentials)
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    })

    if (!response.ok) {
      console.warn('API auth indisponible ou erreur ; vérifiez DASHBOARD_EMAIL / DASHBOARD_PASSWORD côté Vercel.')
      return tryLocalLogin(credentials)
    }

    const data = await response.json()

    if (data.success && data.user && data.token) {
      localStorage.setItem(DASHBOARD_AUTH_TOKEN_KEY, data.token)
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data.user))

      return { success: true, user: data.user }
    }
    const fallback = tryLocalLogin(credentials)
    if (fallback.success) return fallback
    return { success: false, error: data.error || fallback.error || 'Erreur de connexion' }
  } catch (error) {
    console.error('Erreur lors de la connexion:', error)
    return tryLocalLogin(credentials)
  }
}

export const logout = (): void => {
  localStorage.removeItem(DASHBOARD_AUTH_TOKEN_KEY)
  localStorage.removeItem(AUTH_STORAGE_KEY)
}

/** En-tête `Authorization` pour les routes `/api/chauffeur/*` (token dashboard). */
export function getDashboardAuthorizationHeader(): string | null {
  if (typeof window === 'undefined') return null
  const token = localStorage.getItem(DASHBOARD_AUTH_TOKEN_KEY)
  if (!token) return null
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
const CLIENT_REGISTERED_ACCOUNTS_KEY = 'palto:client_registered_v1'

/** Émis après connexion / déconnexion passager (écouter sur `window` pour rafraîchir l’UI). */
export const PALTO_CLIENT_SESSION_CHANGED_EVENT = 'palto:client-session-changed'

function notifyClientSessionChanged(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(PALTO_CLIENT_SESSION_CHANGED_EVENT))
}

function loadClientRegisteredPasswordByEmail(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(CLIENT_REGISTERED_ACCOUNTS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof k === 'string' && typeof v === 'string') out[normalizeChauffeurEmail(k)] = v
    }
    return out
  } catch {
    return {}
  }
}

function persistClientRegisteredAccount(emailNorm: string, password: string): void {
  const map = loadClientRegisteredPasswordByEmail()
  map[emailNorm] = password
  localStorage.setItem(CLIENT_REGISTERED_ACCOUNTS_KEY, JSON.stringify(map))
}

/** Compte démo / env pour le passager (distinct du chauffeur). */
function readLocalClientDemoCredentials(): { email: string; password: string } | null {
  const email = (import.meta.env.VITE_CLIENT_ACCOUNT_EMAIL as string | undefined)?.trim()
  const password = (import.meta.env.VITE_CLIENT_ACCOUNT_PASSWORD as string | undefined)?.trim()
  if (!email || !password) return null
  return { email, password }
}

function tryClientLocalLogin(credentials: LoginCredentials): { success: boolean; user?: User; error?: string } {
  const creds =
    readLocalClientDemoCredentials() ?? {
      email: 'passager@palto.local',
      password: 'passager123',
    }
  const emailNorm = normalizeChauffeurEmail(credentials.email)
  const primaryNorm = normalizeChauffeurEmail(creds.email)

  const writeClientSession = (emailForUser: string): { success: true; user: User } => {
    const token = btoa(`client:${emailForUser}:${Date.now()}`)
    const user: User = {
      email: emailForUser.trim(),
      displayName: emailForUser.split('@')[0]?.trim() || 'Passager',
    }
    localStorage.setItem(CLIENT_AUTH_TOKEN_KEY, token)
    localStorage.setItem(CLIENT_AUTH_STORAGE_KEY, JSON.stringify(user))
    notifyClientSessionChanged()
    return { success: true, user }
  }

  if (emailNorm === primaryNorm) {
    if (credentials.password === creds.password) {
      return writeClientSession(credentials.email)
    }
    return { success: false, error: 'Mot de passe incorrect' }
  }

  const regPw = loadClientRegisteredPasswordByEmail()[emailNorm]
  if (regPw) {
    if (regPw === credentials.password) {
      return writeClientSession(credentials.email)
    }
    return { success: false, error: 'Mot de passe incorrect' }
  }

  return { success: false, error: 'Email incorrect' }
}

export function registerClient(credentials: LoginCredentials): { success: boolean; error?: string } {
  if (typeof window === 'undefined') return { success: false, error: 'UNAVAILABLE' }
  const emailNorm = normalizeChauffeurEmail(credentials.email)
  const password = credentials.password
  if (!emailNorm || !password) return { success: false, error: 'MISSING' }
  if (password.length < 6) return { success: false, error: 'PASSWORD_SHORT' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
    return { success: false, error: 'EMAIL_INVALID' }
  }

  const primary =
    readLocalClientDemoCredentials() ?? {
      email: 'passager@palto.local',
      password: 'passager123',
    }
  if (emailNorm === normalizeChauffeurEmail(primary.email)) {
    return { success: false, error: 'EMAIL_RESERVED' }
  }

  const map = loadClientRegisteredPasswordByEmail()
  if (map[emailNorm]) return { success: false, error: 'EMAIL_EXISTS' }

  persistClientRegisteredAccount(emailNorm, password)
  return { success: true }
}

export async function loginClient(
  credentials: LoginCredentials
): Promise<{ success: boolean; user?: User; error?: string }> {
  return Promise.resolve(tryClientLocalLogin(credentials))
}

export const isClientAuthenticated = (): boolean => {
  if (typeof window === 'undefined') return false
  try {
    const token = localStorage.getItem(CLIENT_AUTH_TOKEN_KEY)
    const authData = localStorage.getItem(CLIENT_AUTH_STORAGE_KEY)
    if (!token || !authData) return false
    const user = JSON.parse(authData)
    return !!(user && token && user.email)
  } catch {
    return false
  }
}

export const logoutClient = (): void => {
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
