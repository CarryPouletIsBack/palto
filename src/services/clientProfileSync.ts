import { apiBaseUrl, useClientRidesApi } from '../constants/featureFlags'
import {
  loadClientAccountSnapshot,
  saveClientAccountSnapshot,
  type ClientAccountSnapshot,
} from '../constants/clientAccountStorage'
import {
  loadClientSavedPlaces,
  saveClientSavedPlaces,
  type ClientSavedPlacesSnapshot,
} from '../constants/clientSavedPlacesStorage'
import { isClientAuthenticated } from './authService'

const API_BASE_URL = apiBaseUrl()

export function clientProfileSyncEnabled(): boolean {
  return useClientRidesApi()
}

function getBearerToken(): string {
  if (typeof window === 'undefined') return ''
  return (
    localStorage.getItem('palto:client_token')?.trim() ||
    localStorage.getItem('dashboard_token')?.trim() ||
    ''
  )
}

function accountHasContent(s: ClientAccountSnapshot): boolean {
  return Boolean(
    s.prenom.trim() ||
      s.nom.trim() ||
      s.telephone.trim() ||
      s.ville.trim() ||
      (s.profilePhotoUrl && s.profilePhotoUrl.trim())
  )
}

function placesHasContent(s: ClientSavedPlacesSnapshot): boolean {
  return Boolean(s.domicile.trim() || s.travail.trim() || s.extras.length > 0)
}

type RemoteProfilePayload = {
  account?: Partial<ClientAccountSnapshot>
  savedPlaces?: Partial<ClientSavedPlacesSnapshot>
  updatedAt?: string | null
  hasAccount?: boolean
  hasSavedPlaces?: boolean
}

async function fetchRemoteProfile(): Promise<RemoteProfilePayload | null> {
  const token = getBearerToken()
  if (!token) return null
  try {
    const res = await fetch(`${API_BASE_URL}/client/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.status === 404) return { account: {}, savedPlaces: {}, updatedAt: null }
    if (!res.ok) return null
    return (await res.json()) as RemoteProfilePayload
  } catch (e) {
    console.warn('[clientProfileSync] fetch failed', e)
    return null
  }
}

async function pushRemoteProfile(email: string, account: ClientAccountSnapshot, savedPlaces: ClientSavedPlacesSnapshot): Promise<boolean> {
  const token = getBearerToken()
  if (!token) return false
  if (!accountHasContent(account) && !placesHasContent(savedPlaces)) return false
  try {
    const res = await fetch(`${API_BASE_URL}/client/profile`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ account, savedPlaces }),
    })
    return res.ok
  } catch (e) {
    console.warn('[clientProfileSync] push failed', e)
    return false
  }
}

let pushTimer: ReturnType<typeof setTimeout> | null = null

/** Envoie profil + lieux au serveur (debounce après sauvegarde locale). */
export function scheduleClientProfilePush(email: string | undefined): void {
  if (!clientProfileSyncEnabled() || !isClientAuthenticated()) return
  const key = (email ?? '').trim().toLowerCase()
  if (!key) return
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    pushTimer = null
    const account = loadClientAccountSnapshot(key)
    const savedPlaces = loadClientSavedPlaces(key)
    void pushRemoteProfile(key, account, savedPlaces)
  }, 600)
}

/**
 * Après connexion : récupère le profil serveur sur cet appareil, ou pousse le local si le serveur est vide.
 * Résout le cas desktop (données locales) → mobile (session seule).
 */
export async function syncClientProfileWithServer(email: string | undefined): Promise<void> {
  if (!clientProfileSyncEnabled() || !isClientAuthenticated()) return
  const key = (email ?? '').trim().toLowerCase()
  if (!key) return

  const localAccount = loadClientAccountSnapshot(key)
  const localPlaces = loadClientSavedPlaces(key)
  const remote = await fetchRemoteProfile()
  if (!remote) return

  const remoteHasAccount = Boolean(remote.hasAccount)
  const remoteHasPlaces = Boolean(remote.hasSavedPlaces)
  const localHasAccount = accountHasContent(localAccount)
  const localHasPlaces = placesHasContent(localPlaces)

  if (remoteHasAccount || remoteHasPlaces) {
    if (remoteHasAccount && remote.account) {
      const merged: ClientAccountSnapshot = {
        ...localAccount,
        ...remote.account,
        email: key,
      } as ClientAccountSnapshot
      saveClientAccountSnapshot(merged, key)
    }
    if (remoteHasPlaces && remote.savedPlaces) {
      saveClientSavedPlaces(remote.savedPlaces as ClientSavedPlacesSnapshot, key)
    }
    return
  }

  if (localHasAccount || localHasPlaces) {
    await pushRemoteProfile(key, localAccount, localPlaces)
  }
}
