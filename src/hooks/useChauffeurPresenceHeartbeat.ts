import { useCallback, useEffect, useRef, useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { isChauffeurSession } from '../services/authService'
import { chauffeurPresenceApiEnabled, pushChauffeurPresence } from '../services/chauffeurPresenceApi'
import {
  GEO_ACCURATE,
  GEO_RELAXED,
  geolocationErrorMessage,
  needsUserGestureForGeolocation,
  queryGeolocationPermission,
} from '../lib/geolocationPlatform'

const HEARTBEAT_MS = 20_000
const MIN_PUSH_INTERVAL_MS = 8_000

export type ChauffeurPresenceHeartbeat = {
  /** Suivi GPS actif (position envoyée au serveur). */
  tracking: boolean
  /** À appeler depuis un clic (obligatoire sur mobile). */
  startTracking: () => void
  geoError: string | null
  /** Afficher la bannière « Activer ma position ». */
  needsActivationPrompt: boolean
}

/**
 * Envoie la position GPS du chauffeur (table `chauffeur_presence`, page Go).
 * Sur mobile : `startTracking()` doit être déclenché par un bouton (geste utilisateur).
 */
export function useChauffeurPresenceHeartbeat(enabled = true): ChauffeurPresenceHeartbeat {
  const { language } = useLanguage()
  const watchIdRef = useRef<number | null>(null)
  const intervalIdRef = useRef<number | null>(null)
  const lastPushRef = useRef(0)
  const lastPosRef = useRef<{ lng: number; lat: number } | null>(null)
  const [tracking, setTracking] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)

  const canRun =
    enabled && chauffeurPresenceApiEnabled() && isChauffeurSession() && typeof navigator !== 'undefined'

  const push = useCallback((lng: number, lat: number, force = false) => {
    lastPosRef.current = { lng, lat }
    const now = Date.now()
    if (!force && now - lastPushRef.current < MIN_PUSH_INTERVAL_MS) return
    lastPushRef.current = now
    void pushChauffeurPresence({ lng, lat, isAvailable: true })
  }, [])

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
        push(pos.coords.longitude, pos.coords.latitude, true)
        setTracking(true)
      },
      (err) => {
        console.warn('[presence] start', err.code, err.message)
        setGeoError(geolocationErrorMessage(err.code, language))
      },
      { ...GEO_RELAXED, maximumAge: 0 }
    )
  }, [canRun, push, language])

  useEffect(() => {
    if (!canRun) {
      setTracking(false)
      return
    }
    let cancelled = false
    void (async () => {
      const perm = await queryGeolocationPermission()
      if (cancelled) return
      if (perm === 'granted') {
        setTracking(true)
        return
      }
      if (!needsUserGestureForGeolocation()) {
        setTracking(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [canRun])

  useEffect(() => {
    if (!tracking || !canRun || !navigator.geolocation) return

    const onPosition = (pos: GeolocationPosition, force = false) => {
      setGeoError(null)
      push(pos.coords.longitude, pos.coords.latitude, force)
    }

    const onError = (err: GeolocationPositionError) => {
      console.warn('[presence] geolocation', err.code, err.message)
      setGeoError(geolocationErrorMessage(err.code, language))
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => onPosition(pos, lastPushRef.current === 0),
      onError,
      GEO_ACCURATE
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
  }, [tracking, canRun, push, language])

  const needsActivationPrompt = Boolean(canRun && !tracking)

  return { tracking, startTracking, geoError, needsActivationPrompt }
}
