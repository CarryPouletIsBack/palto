import { apiBaseUrl } from '../constants/featureFlags'
import {
  applyChauffeurOAuthSession,
  applyClientOAuthSession,
  type AccountRole,
  type User,
} from './authService'

export type OAuthProvider = 'google' | 'facebook'

export type OAuthProvidersAvailability = {
  google: boolean
  facebook: boolean
}

const LAST_OAUTH_EMAIL_PREFIX = 'palto:last_oauth_email'

function lastOAuthEmailStorageKey(role: AccountRole, provider: OAuthProvider): string {
  return `${LAST_OAUTH_EMAIL_PREFIX}:${role}:${provider}`
}

export function rememberOAuthEmail(
  role: AccountRole,
  provider: OAuthProvider,
  email: string
): void {
  if (typeof window === 'undefined') return
  const key = email.trim().toLowerCase()
  if (!key) return
  try {
    localStorage.setItem(lastOAuthEmailStorageKey(role, provider), key)
  } catch {
    /* quota */
  }
}

export function getRememberedOAuthEmail(
  role: AccountRole,
  provider: OAuthProvider
): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(lastOAuthEmailStorageKey(role, provider))?.trim()
    return raw || null
  } catch {
    return null
  }
}

export function clearRememberedOAuthEmail(role: AccountRole, provider: OAuthProvider): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(lastOAuthEmailStorageKey(role, provider))
  } catch {
    /* ignore */
  }
}

let providersCache: OAuthProvidersAvailability | null = null
let providersPromise: Promise<OAuthProvidersAvailability> | null = null

export async function fetchOAuthProviders(): Promise<OAuthProvidersAvailability> {
  if (providersCache) return providersCache
  if (providersPromise) return providersPromise
  providersPromise = (async () => {
    try {
      const response = await fetch(`${apiBaseUrl()}/auth?action=oauth-providers`)
      const data = (await response.json().catch(() => null)) as OAuthProvidersAvailability | null
      const result = {
        google: Boolean(data?.google),
        facebook: Boolean(data?.facebook),
      }
      providersCache = result
      return result
    } catch {
      return { google: false, facebook: false }
    } finally {
      providersPromise = null
    }
  })()
  return providersPromise
}

export function startOAuthLogin(
  provider: OAuthProvider,
  role: AccountRole,
  options?: { forceAccountPicker?: boolean }
): void {
  const returnTo = `${window.location.pathname}${window.location.search}`
  const params = new URLSearchParams({
    action: 'oauth-start',
    provider,
    role,
    returnTo,
  })
  const loginHint =
    options?.forceAccountPicker ? undefined : getRememberedOAuthEmail(role, provider) ?? undefined
  if (loginHint) params.set('loginHint', loginHint)
  if (options?.forceAccountPicker) params.set('forceAccountPicker', '1')
  window.location.assign(`${apiBaseUrl()}/auth?${params.toString()}`)
}

export async function completeOAuthExchange(
  exchange: string,
  role: AccountRole
): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const response = await fetch(`${apiBaseUrl()}/auth?action=oauth-exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exchange, role }),
    })
    const data = (await response.json().catch(() => null)) as {
      success?: boolean
      token?: string
      user?: User & { profilePhotoUrl?: string | null }
      error?: string
    } | null
    if (!response.ok || !data?.success || !data.token || !data.user) {
      return { success: false, error: data?.error || `Erreur serveur (${response.status})` }
    }
    if (role === 'client') {
      applyClientOAuthSession(data.token, data.user, provider)
    } else {
      applyChauffeurOAuthSession(data.token, data.user, provider)
    }
    rememberOAuthEmail(role, provider, data.user.email)
    return { success: true, user: data.user }
  } catch (error) {
    console.error('[oauthAuthService] exchange', error)
    return { success: false, error: 'Impossible de finaliser la connexion sociale' }
  }
}

export function oauthErrorMessage(code: string | null, t: (key: string) => string): string | null {
  if (!code) return null
  switch (code) {
    case 'OAUTH_DENIED':
      return t('authOAuth.errorDenied')
    case 'OAUTH_NOT_CONFIGURED':
    case 'SERVICE_UNAVAILABLE':
      return t('authOAuth.errorUnavailable')
    case 'CHAUFFEUR_ACCOUNT_REQUIRED':
      return t('authOAuth.errorChauffeurRequired')
    case 'FACEBOOK_EMAIL_REQUIRED':
      return t('authOAuth.errorFacebookEmail')
    case 'EMAIL_EXISTS':
      return t('authOAuth.errorEmailExists')
    case 'OAUTH_ACCOUNT_USE_SOCIAL':
      return t('authOAuth.errorUseSocial')
    default:
      return t('authOAuth.errorGeneric')
  }
}

export function stripOAuthQueryParams(): void {
  const url = new URL(window.location.href)
  let changed = false
  for (const key of ['oauth_exchange', 'oauth_role', 'oauth_error']) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key)
      changed = true
    }
  }
  if (changed) {
    window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`)
  }
}
