import { apiBaseUrl, useChauffeurProfileSyncApi } from '../constants/featureFlags'
import {
  loadStoredChauffeurProfile,
  persistStoredChauffeurProfile,
  PALTO_CHAUFFEUR_PROFILE_SYNCED_EVENT,
  type ChauffeurProfileSnapshot,
} from '../constants/chauffeurProfileStorage'
import { isChauffeurVehicleType } from '../constants/chauffeurVehicleType'
import { getDashboardAuthorizationHeader, isChauffeurSession } from './authService'
import { mergeChauffeurProfileSnapshots } from './chauffeurProfileMerge'
import { fetchChauffeurRideProfileFromServer } from './chauffeurRideProfileApi'

const API_BASE_URL = apiBaseUrl()

const syncInFlightByEmail = new Map<string, Promise<void>>()

export function chauffeurProfileSyncEnabled(): boolean {
  return useChauffeurProfileSyncApi()
}

function profileHasContent(s: ChauffeurProfileSnapshot): boolean {
  return Boolean(
    s.prenom.trim() ||
      s.nom.trim() ||
      s.telephone.trim() ||
      s.ville.trim() ||
      s.plaque.trim() ||
      s.vehicule.trim() ||
      (s.profilePhotoUrl && s.profilePhotoUrl.trim())
  )
}

type RemoteProfilePayload = {
  account?: Partial<ChauffeurProfileSnapshot>
  updatedAt?: string | null
  hasAccount?: boolean
  profileStorageReady?: boolean
  code?: string
  hint?: string
}

let profileTableMissingWarned = false

async function fetchRemoteProfile(): Promise<RemoteProfilePayload | null> {
  const auth = getDashboardAuthorizationHeader()
  if (!auth) return null
  try {
    const res = await fetch(`${API_BASE_URL}/chauffeur?resource=profile`, {
      headers: { Authorization: auth },
    })
    if (res.status === 404) return { account: {}, updatedAt: null }
    const data = (await res.json().catch(() => ({}))) as RemoteProfilePayload
    if (res.status === 503 && data.code === 'PROFILE_TABLE_MISSING') {
      if (!profileTableMissingWarned) {
        profileTableMissingWarned = true
        console.warn('[chauffeurProfileSync] migration 0010 non appliquee — profil local uniquement')
      }
      return { account: {}, updatedAt: null, profileStorageReady: false }
    }
    if (!res.ok) {
      console.warn('[chauffeurProfileSync] GET failed', res.status)
      return null
    }
    return data
  } catch (e) {
    console.warn('[chauffeurProfileSync] fetch failed', e)
    return null
  }
}

async function pushRemoteProfile(email: string, account: ChauffeurProfileSnapshot): Promise<boolean> {
  const auth = getDashboardAuthorizationHeader()
  if (!auth) return false
  if (!profileHasContent(account)) return false
  try {
    const res = await fetch(`${API_BASE_URL}/chauffeur?resource=profile`, {
      method: 'PUT',
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ account }),
    })
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as {
        error?: string
        code?: string
      }
      if (body.code === 'PROFILE_TABLE_MISSING') {
        if (!profileTableMissingWarned) {
          profileTableMissingWarned = true
          console.warn('[chauffeurProfileSync] migration 0010 requise pour sync serveur:', body.error)
        }
      } else if (res.status === 400 && body.error === 'Rien a enregistrer') {
        /* Profil local vide ou sans champ serveur — pas une erreur bloquante. */
      } else {
        console.warn('[chauffeurProfileSync] PUT failed', res.status, body.error)
      }
    }
    return res.ok
  } catch (e) {
    console.warn('[chauffeurProfileSync] push failed', e)
    return false
  }
}

let pushTimer: ReturnType<typeof setTimeout> | null = null

export function scheduleChauffeurProfilePush(email: string | undefined): void {
  if (!chauffeurProfileSyncEnabled() || !isChauffeurSession()) return
  const key = (email ?? '').trim().toLowerCase()
  if (!key) return
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    pushTimer = null
    const profile = loadStoredChauffeurProfile(key)
    if (!profile) return
    void pushRemoteProfile(key, profile)
  }, 600)
}

async function runSyncChauffeurProfileWithServer(email: string): Promise<void> {
  if (!chauffeurProfileSyncEnabled() || !isChauffeurSession()) return
  const key = email.trim().toLowerCase()
  if (!key) return

  const local = loadStoredChauffeurProfile(key) ?? {
    nom: '',
    prenom: '',
    email: key,
    telephone: '',
    ville: '',
    vehicule: '',
    plaque: '',
  }

  const remote = await fetchRemoteProfile()
  if (!remote) return

  const merged = mergeChauffeurProfileSnapshots(local, remote.account ?? {})
  merged.email = key

  const rideProfile = await fetchChauffeurRideProfileFromServer()
  if (rideProfile?.vehicleType && isChauffeurVehicleType(rideProfile.vehicleType)) {
    merged.vehicule = rideProfile.vehicleType
  }

  persistStoredChauffeurProfile(merged)

  if (profileHasContent(merged)) {
    await pushRemoteProfile(key, merged)
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PALTO_CHAUFFEUR_PROFILE_SYNCED_EVENT))
  }
}

export async function syncChauffeurProfileWithServer(email: string | undefined): Promise<void> {
  const key = (email ?? '').trim().toLowerCase()
  if (!key) return

  const existing = syncInFlightByEmail.get(key)
  if (existing) {
    await existing
    return
  }

  const task = runSyncChauffeurProfileWithServer(key).finally(() => {
    syncInFlightByEmail.delete(key)
  })
  syncInFlightByEmail.set(key, task)
  await task
}
