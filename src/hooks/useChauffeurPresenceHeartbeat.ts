import { useCallback, useEffect, useRef, useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { isChauffeurSession } from '../services/authService'
import { chauffeurPresenceApiEnabled, pushChauffeurPresence } from '../services/chauffeurPresenceApi'
import {
  GEO_RELAXED,
  geolocationErrorMessage,
  needsUserGestureForGeolocation,
  queryGeolocationPermission,
} from '../lib/geolocationPlatform'

const HEARTBEAT_MS = 20_000
const MIN_PUSH_INTERVAL_MS = 8_000

export type ChauffeurPresenceHeartbeat = {
  /** Au moins une position a été lue et envoyée au serveur. */
  tracking: boolean
  startTracking: () => void
  geoError: string | null
  needsActivationPrompt: boolean
}

function retryAfterSettingsMessage(language: 'fr' | 'en'): string {
  return language === 'en'
    ? 'Permission updated. Tap « Enable my location » again on this page.'
    : 'Permission mise à jour. Appuyez à nouveau sur « Activer ma position » sur cette page.'
}

/**
 * Envoie la position GPS du chauffeur (table `chauffeur_presence`, page Go).
 * La bannière reste tant qu’aucune position n’a été envoyée (iOS : nouveau clic après Réglages).
 */
export function useChauffeurPresenceHeartbeat(enabled = true): ChauffeurPresenceHeartbeat {
  const { language } = useLanguage()
  const watchIdRef = useRef<number | null>(null)
  const intervalIdRef = useRef<number | null>(null)
  const lastPushRef = useRef(0)
  const lastPosRef = useRef<{ lng: number; lat: number } | null>(null)
  const [watching, setWatching] = useState(false)
  const [positionOk, setPositionOk] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)

  const canRun =
    enabled && chauffeurPresenceApiEnabled() && isChauffeurSession() && typeof navigator !== 'undefined'

  const push = useCallback(
    async (lng: number, lat: number, force = false): Promise<boolean> => {
      lastPosRef.current = { lng, lat }
      const now = Date.now()
      if (!force && now - lastPushRef.current < MIN_PUSH_INTERVAL_MS) return true
      lastPushRef.current = now
      const ok = await pushChauffeurPresence({ lng, lat, isAvailable: true })
      if (ok) setPositionOk(true)
      return ok
    },
    []
  )

  const startTracking = useCallback(() => {
    if (!canRun || !navigator.geolocation) {
      setGeoError(
        language === 'en' ? 'Geolocation is not available on this device.' : 'Géolocalisation non disponible sur cet appareil.'
      )
      return
    }
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void push(pos.coords.longitude, pos.coords.latitude, true).then((ok) => {
          if (ok) setWatching(true)
          else {
            setGeoError(
              language === 'en'
                ? 'Could not save position on server.'
                : 'Impossible d’enregistrer la position sur le serveur.'
            )
          }
        })
      },
      (err) => {
        console.warn('[presence] start', err.code, err.message)
        setWatching(false)
        setGeoError(geolocationErrorMessage(err.code, language))
      },
      { ...GEO_RELAXED, maximumAge: 0 }
    )
  }, [canRun, push, language])

  useEffect(() => {
    if (!canRun) {
      setWatching(false)
      setPositionOk(false)
      return
    }
    let cancelled = false
    void (async () => {
      const perm = await queryGeolocationPermission()
      if (cancelled) return
      if (perm === 'granted' && !needsUserGestureForGeolocation()) {
        setWatching(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [canRun])

  useEffect(() => {
    if (!canRun || typeof navigator === 'undefined' || !navigator.permissions?.query) return
    let status: PermissionStatus | null = null
    const onChange = () => {
      if (!status) return
      if (status.state === 'granted' && !positionOk) {
        setWatching(false)
        setGeoError(retryAfterSettingsMessage(language))
      }
      if (status.state === 'denied') {
        setWatching(false)
        setPositionOk(false)
      }
    }
    void navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((p) => {
      status = p
      p.addEventListener('change', onChange)
    })
    return () => {
      status?.removeEventListener('change', onChange)
    }
  }, [canRun, positionOk, language])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || !canRun || positionOk) return
      void queryGeolocationPermission().then((perm) => {
        if (perm === 'granted') {
          setWatching(false)
          setGeoError(retryAfterSettingsMessage(language))
        }
      })
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('pageshow', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('pageshow', onVisible)
    }
  }, [canRun, positionOk, language])

  useEffect(() => {
    if (!watching || !canRun || !navigator.geolocation) return

    const onPosition = (pos: GeolocationPosition, force = false) => {
      void push(pos.coords.longitude, pos.coords.latitude, force).then((ok) => {
        if (ok) setGeoError(null)
      })
    }

    const onError = (err: GeolocationPositionError) => {
      console.warn('[presence] geolocation', err.code, err.message)
      setWatching(false)
      setGeoError(geolocationErrorMessage(err.code, language))
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => onPosition(pos, lastPushRef.current === 0),
      onError,
      GEO_RELAXED
    )

    navigator.geolocation.getCurrentPosition(
      (pos) => onPosition(pos, true),
      onError,
      GEO_RELAXED
    )

    intervalIdRef.current = window.setInterval(() => {
      navigator.geolocation.getCurrentPosition((pos) => onPosition(pos), onError, GEO_RELAXED)
    }, HEARTBEAT_MS)

    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
      if (intervalIdRef.current != null) window.clearInterval(intervalIdRef.current)
      intervalIdRef.current = null
      const last = lastPosRef.current
      if (last) void pushChauffeurPresence({ ...last, isAvailable: false })
    }
  }, [watching, canRun, push, language])

  const needsActivationPrompt = Boolean(canRun && !positionOk)

  return {
    tracking: positionOk,
    startTracking,
    geoError,
    needsActivationPrompt,
  }
}
