import { apiBaseUrl } from '../constants/featureFlags'
import { DASHBOARD_AUTH_TOKEN_KEY } from './authService'

const API_BASE_URL = apiBaseUrl()

export type AccountSecurityStatus = {
  hasPassword: boolean
  oauthGoogle: boolean
  oauthFacebook: boolean
  passwordUpdatedAt: string | null
}

function authHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {}
  const token = localStorage.getItem(DASHBOARD_AUTH_TOKEN_KEY)?.trim()
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

export async function fetchChauffeurSecurityStatus(): Promise<{
  success: boolean
  status?: AccountSecurityStatus
  error?: string
}> {
  try {
    const headers = authHeaders()
    if (!('Authorization' in headers)) {
      return { success: false, error: 'SESSION_REQUIRED' }
    }
    const response = await fetch(`${API_BASE_URL}/auth?role=chauffeur&action=security-status`, {
      method: 'GET',
      headers,
    })
    const data = (await response.json().catch(() => null)) as {
      success?: boolean
      hasPassword?: boolean
      oauthGoogle?: boolean
      oauthFacebook?: boolean
      passwordUpdatedAt?: string | null
      error?: string
    } | null
    if (!response.ok || !data?.success) {
      return { success: false, error: data?.error || `Erreur serveur (${response.status})` }
    }
    return {
      success: true,
      status: {
        hasPassword: Boolean(data.hasPassword),
        oauthGoogle: Boolean(data.oauthGoogle),
        oauthFacebook: Boolean(data.oauthFacebook),
        passwordUpdatedAt:
          typeof data.passwordUpdatedAt === 'string' && data.passwordUpdatedAt.length > 0
            ? data.passwordUpdatedAt
            : null,
      },
    }
  } catch (error) {
    console.error('[chauffeurAccountSecurityApi] status', error)
    return { success: false, error: 'NETWORK_ERROR' }
  }
}

export async function changeChauffeurPassword(input: {
  currentPassword?: string
  newPassword: string
}): Promise<{ success: boolean; passwordUpdatedAt?: string; error?: string }> {
  try {
    const headers = authHeaders()
    if (!('Authorization' in headers)) {
      return { success: false, error: 'SESSION_REQUIRED' }
    }
    const response = await fetch(`${API_BASE_URL}/auth?role=chauffeur&action=change-password`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword: input.currentPassword,
        newPassword: input.newPassword,
      }),
    })
    const data = (await response.json().catch(() => null)) as {
      success?: boolean
      passwordUpdatedAt?: string
      error?: string
    } | null
    if (!response.ok || !data?.success) {
      return { success: false, error: data?.error || `Erreur serveur (${response.status})` }
    }
    return {
      success: true,
      passwordUpdatedAt:
        typeof data.passwordUpdatedAt === 'string' ? data.passwordUpdatedAt : undefined,
    }
  } catch (error) {
    console.error('[chauffeurAccountSecurityApi] change-password', error)
    return { success: false, error: 'NETWORK_ERROR' }
  }
}

export async function unlinkChauffeurOAuth(
  provider: 'google' | 'facebook'
): Promise<{ success: boolean; error?: string }> {
  try {
    const headers = authHeaders()
    if (!('Authorization' in headers)) {
      return { success: false, error: 'SESSION_REQUIRED' }
    }
    const response = await fetch(`${API_BASE_URL}/auth?role=chauffeur&action=unlink-oauth`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider }),
    })
    const data = (await response.json().catch(() => null)) as { success?: boolean; error?: string } | null
    if (!response.ok || !data?.success) {
      return { success: false, error: data?.error || `Erreur serveur (${response.status})` }
    }
    return { success: true }
  } catch (error) {
    console.error('[chauffeurAccountSecurityApi] unlink-oauth', error)
    return { success: false, error: 'NETWORK_ERROR' }
  }
}
