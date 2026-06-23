import { apiBaseUrl } from '../constants/featureFlags'
import {
  CLIENT_AUTH_TOKEN_KEY,
  DASHBOARD_AUTH_TOKEN_KEY,
  type AccountRole,
} from './authService'

const API_BASE_URL = apiBaseUrl()

export type AccountNotificationPrefs = {
  email: string
  notifyEmail: boolean
}

function authHeaders(role: AccountRole): HeadersInit {
  if (typeof window === 'undefined') return {}
  const tokenKey = role === 'chauffeur' ? DASHBOARD_AUTH_TOKEN_KEY : CLIENT_AUTH_TOKEN_KEY
  const token = localStorage.getItem(tokenKey)?.trim()
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

export async function fetchAccountNotificationPrefs(
  role: AccountRole
): Promise<{ success: boolean; prefs?: AccountNotificationPrefs; error?: string }> {
  try {
    const headers = authHeaders(role)
    if (!('Authorization' in headers)) {
      return { success: false, error: 'SESSION_REQUIRED' }
    }
    const response = await fetch(`${API_BASE_URL}/auth?role=${role}&action=notification-prefs`, {
      method: 'GET',
      headers,
    })
    const data = (await response.json().catch(() => null)) as {
      success?: boolean
      email?: string
      notifyEmail?: boolean
      error?: string
    } | null
    if (!response.ok || !data?.success || typeof data.email !== 'string') {
      return { success: false, error: data?.error || `Erreur serveur (${response.status})` }
    }
    return {
      success: true,
      prefs: {
        email: data.email,
        notifyEmail: data.notifyEmail !== false,
      },
    }
  } catch (error) {
    console.error('[accountNotificationPrefsApi] fetch', error)
    return { success: false, error: 'NETWORK_ERROR' }
  }
}

export async function updateAccountNotificationPrefs(
  role: AccountRole,
  prefs: { notifyEmail: boolean }
): Promise<{ success: boolean; prefs?: AccountNotificationPrefs; error?: string }> {
  try {
    const headers = authHeaders(role)
    if (!('Authorization' in headers)) {
      return { success: false, error: 'SESSION_REQUIRED' }
    }
    const response = await fetch(`${API_BASE_URL}/auth?role=${role}&action=notification-prefs`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(prefs),
    })
    const data = (await response.json().catch(() => null)) as {
      success?: boolean
      email?: string
      notifyEmail?: boolean
      error?: string
    } | null
    if (!response.ok || !data?.success || typeof data.email !== 'string') {
      return { success: false, error: data?.error || `Erreur serveur (${response.status})` }
    }
    return {
      success: true,
      prefs: {
        email: data.email,
        notifyEmail: data.notifyEmail !== false,
      },
    }
  } catch (error) {
    console.error('[accountNotificationPrefsApi] update', error)
    return { success: false, error: 'NETWORK_ERROR' }
  }
}
