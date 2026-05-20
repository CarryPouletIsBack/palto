export type GeolocationPermissionState = 'unknown' | 'prompt' | 'granted' | 'denied'

/** iOS / Android : la demande système doit suivre un clic (pas un useEffect seul). */
export function needsUserGestureForGeolocation(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod|Android/i.test(ua)) return true
  if (navigator.maxTouchPoints > 0 && window.matchMedia('(max-width: 900px)').matches) return true
  return false
}

export async function queryGeolocationPermission(): Promise<GeolocationPermissionState> {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) return 'unknown'
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName })
    return status.state as GeolocationPermissionState
  } catch {
    return 'unknown'
  }
}

export function geolocationErrorMessage(code: number, language: 'fr' | 'en'): string {
  if (code === 1) {
    return language === 'en'
      ? 'Location blocked. Safari: Settings → Apps → Safari → Location → While Using. Then return here and tap « Enable my location » again.'
      : 'Localisation bloquée. Réglages → Apps → Safari → Localisation → « Lors de l’utilisation de l’app ». Revenez sur Palto et appuyez à nouveau sur « Activer ma position ».'
  }
  if (code === 2) {
    return language === 'en' ? 'Position unavailable.' : 'Position indisponible.'
  }
  if (code === 3) {
    return language === 'en' ? 'Location timed out. Try again outdoors.' : 'Délai dépassé. Réessayez (idéalement dehors).'
  }
  return language === 'en' ? 'Could not read GPS.' : 'Impossible de lire le GPS.'
}

export const GEO_RELAXED: PositionOptions = {
  enableHighAccuracy: false,
  maximumAge: 60_000,
  timeout: 45_000,
}

export const GEO_ACCURATE: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 20_000,
  timeout: 45_000,
}
