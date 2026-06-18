const USER_GEO_SESSION_KEY = 'palto:userGeolocation'

export type GrantedUserGeolocation = {
  status: 'granted'
  longitude: number
  latitude: number
  label?: string
  updatedAt: number
}

export type DeniedUserGeolocation = {
  status: 'denied'
}

export type UserGeolocationSession = GrantedUserGeolocation | DeniedUserGeolocation

function readRaw(): UserGeolocationSession | null {
  try {
    const raw = sessionStorage.getItem(USER_GEO_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as UserGeolocationSession
    if (!parsed || typeof parsed !== 'object' || !('status' in parsed)) return null
    return parsed
  } catch {
    return null
  }
}

function writeRaw(data: UserGeolocationSession): void {
  try {
    sessionStorage.setItem(USER_GEO_SESSION_KEY, JSON.stringify(data))
  } catch {
    /* quota / private mode */
  }
}

export function markUserGeolocationDenied(): void {
  writeRaw({ status: 'denied' })
}

export function saveGrantedUserGeolocation(
  longitude: number,
  latitude: number,
  label?: string
): void {
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return
  const prev = readGrantedUserGeolocation()
  writeRaw({
    status: 'granted',
    longitude,
    latitude,
    label: label?.trim() || prev?.label,
    updatedAt: Date.now(),
  })
}

export function readGrantedUserGeolocation(): Omit<GrantedUserGeolocation, 'status'> | null {
  const raw = readRaw()
  if (!raw || raw.status !== 'granted') return null
  if (!Number.isFinite(raw.longitude) || !Number.isFinite(raw.latitude)) return null
  return {
    longitude: raw.longitude,
    latitude: raw.latitude,
    label: raw.label,
    updatedAt: raw.updatedAt,
  }
}

export function isUserGeolocationDenied(): boolean {
  const raw = readRaw()
  return raw?.status === 'denied'
}
