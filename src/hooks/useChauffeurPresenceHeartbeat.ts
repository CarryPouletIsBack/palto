import { useEffect, useRef } from 'react'
import { isChauffeurSession } from '../services/authService'
import { chauffeurPresenceApiEnabled, pushChauffeurPresence } from '../services/chauffeurPresenceApi'

const HEARTBEAT_MS = 20_000
const MIN_PUSH_INTERVAL_MS = 8_000

/**
 * Envoie la position GPS du chauffeur connecté (table `chauffeur_presence`, page Go).
 */
export function useChauffeurPresenceHeartbeat(enabled = true): void {
  const watchIdRef = useRef<number | null>(null)
  const lastPushRef = useRef(0)
  const lastPosRef = useRef<{ lng: number; lat: number } | null>(null)

  useEffect(() => {
    if (!enabled || !chauffeurPresenceApiEnabled() || !isChauffeurSession()) return
    if (typeof navigator === 'undefined' || !navigator.geolocation) return

    const push = (lng: number, lat: number, force = false) => {
      lastPosRef.current = { lng, lat }
      const now = Date.now()
      if (!force && now - lastPushRef.current < MIN_PUSH_INTERVAL_MS) return
      lastPushRef.current = now
      void pushChauffeurPresence({ lng, lat, isAvailable: true })
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => push(pos.coords.longitude, pos.coords.latitude, lastPushRef.current === 0),
      (err) => console.warn('[presence] geolocation', err.code, err.message),
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 25_000 }
    )

    navigator.geolocation.getCurrentPosition(
      (pos) => push(pos.coords.longitude, pos.coords.latitude, true),
      () => {},
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 20_000 }
    )

    const intervalId = window.setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => push(pos.coords.longitude, pos.coords.latitude),
        () => {},
        { enableHighAccuracy: false, maximumAge: HEARTBEAT_MS, timeout: 20_000 }
      )
    }, HEARTBEAT_MS)

    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current)
      window.clearInterval(intervalId)
      const last = lastPosRef.current
      if (last) void pushChauffeurPresence({ ...last, isAvailable: false })
    }
  }, [enabled])
}
