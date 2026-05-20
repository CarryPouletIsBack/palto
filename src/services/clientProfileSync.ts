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
import { mergeClientAccountSnapshots, mergeClientSavedPlacesSnapshots } from './clientProfileMerge'

const API_BASE_URL = apiBaseUrl()

const syncInFlightByEmail = new Map<string, Promise<void>>()

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
    if (!res.ok) {
      console.warn('[clientProfileSync] GET failed', res.status)
      return null
    }
    return (await res.json()) as RemoteProfilePayload
  } catch (e) {
    console.warn('[clientProfileSync] fetch failed', e)
    return null
  }
}

async function pushRemoteProfile(
  email: string,
  account: ClientAccountSnapshot,
  savedPlaces: ClientSavedPlacesSnapshot
): Promise<boolean> {
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
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      console.warn('[clientProfileSync] PUT failed', res.status, body.error)
    }
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

async function runSyncClientProfileWithServer(email: string): Promise<void> {
  if (!clientProfileSyncEnabled() || !isClientAuthenticated()) return
  const key = email.trim().toLowerCase()
  if (!key) return

  const localAccount = loadClientAccountSnapshot(key)
  const localPlaces = loadClientSavedPlaces(key)
  const remote = await fetchRemoteProfile()
  if (!remote) return

  const remoteAccount = (remote.account ?? {}) as Partial<ClientAccountSnapshot>
  const remotePlaces = (remote.savedPlaces ?? {}) as Partial<ClientSavedPlacesSnapshot>

  const mergedAccount = mergeClientAccountSnapshots(localAccount, remoteAccount)
  mergedAccount.email = key

  const mergedPlaces = mergeClientSavedPlacesSnapshots(localPlaces, remotePlaces)

  saveClientAccountSnapshot(mergedAccount, key)
  saveClientSavedPlaces(mergedPlaces, key)

  if (accountHasContent(mergedAccount) || placesHasContent(mergedPlaces)) {
    await pushRemoteProfile(key, mergedAccount, mergedPlaces)
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('palto:client-profile-synced'))
  }
}

/**
 * Fusion bidirectionnelle local ↔ serveur, puis persistance locale + push du meilleur état.
 * Évite d’écraser une photo ou des lieux locaux par des valeurs vides venant du serveur.
 */
export async function syncClientProfileWithServer(email: string | undefined): Promise<void> {
  const key = (email ?? '').trim().toLowerCase()
  if (!key) return

  const existing = syncInFlightByEmail.get(key)
  if (existing) {
    await existing
    return
  }

  const task = runSyncClientProfileWithServer(key).finally(() => {
    syncInFlightByEmail.delete(key)
  })
  syncInFlightByEmail.set(key, task)
  await task
}
