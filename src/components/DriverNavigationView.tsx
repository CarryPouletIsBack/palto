import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, CheckCircle, LocateFixed, Navigation } from 'lucide-react'
import type { Feature, LineString } from 'geojson'
import HomeMapboxBackground, { OPENSTREET_OUTDOORS_STYLE_URL } from './HomeMapboxBackground'
import type { HomeMapFlyTo } from './HomeMapboxBackground'
import { fetchDrivingRouteFeature } from '../services/mapboxDirections'
import { geocodeForward } from '../services/mapboxGeocoding'
import { snapLngLatToMapboxDriving } from '../services/mapboxSnapToRoad'
import { REUNION_ISLAND_BBOX_GEOCODE } from '../constants/reunionIsland'
import { haversineDistanceMeters } from '../services/distanceGeo'
import {
  CHAUFFEUR_NAV_COURSE_STORAGE_KEY,
  CHAUFFEUR_COURSE_COMPLETED_EVENT,
  type ChauffeurNavCourseSnapshot,
} from '../constants/chauffeurNavCourseStorage'
import { fetchChauffeurRidesFromApi } from '../services/chauffeurRidesApi'
import './DriverNavigationView.css'

const REUNION_PROXIMITY: [number, number] = [55.45, -21.15]

/** Distance minimale approximative d’un point à la polyline d’itinéraire (échantillonnage segments). */
function approxMinDistMetersToRoute(
  lng: number,
  lat: number,
  routeCoords: [number, number][]
): number {
  if (routeCoords.length < 2) return Infinity
  const p = { longitude: lng, latitude: lat }
  let min = Infinity
  const segCount = routeCoords.length - 1
  const stride = Math.max(1, Math.ceil(segCount / 900))
  for (let i = 0; i < segCount; i += stride) {
    const [lng1, lat1] = routeCoords[i]
    const i2 = Math.min(i + stride, segCount)
    const [lng2, lat2] = routeCoords[i2]
    for (let t = 0; t <= 1; t += 0.34) {
      const lngm = lng1 + t * (lng2 - lng1)
      const latm = lat1 + t * (lat2 - lat1)
      const m = haversineDistanceMeters(p, { longitude: lngm, latitude: latm })
      if (m < min) min = m
    }
  }
  return min
}

function formatEurRecap(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatElapsedRecap(ms: number): string {
  const sec = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m} min ${String(s).padStart(2, '0')} s`
}

type Props = {
  courseId: string
  onClose: () => void
}

function readSnapshot(): ChauffeurNavCourseSnapshot | null {
  try {
    const raw = sessionStorage.getItem(CHAUFFEUR_NAV_COURSE_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ChauffeurNavCourseSnapshot
    if (!parsed?.id || !parsed.depart || !parsed.arrivee) return null
    return parsed
  } catch {
    return null
  }
}

function buildSnapshotFromCourseId(
  courseId: string,
  ride: {
    id: string
    depart: string
    arrivee: string
    client: string
    km: number
    date: string
    heure: string
    montant: number
    modePaiement?: string
    startedAt?: number
  }
): ChauffeurNavCourseSnapshot {
  return {
    id: courseId,
    depart: ride.depart,
    arrivee: ride.arrivee,
    client: ride.client,
    km: Number.isFinite(ride.km) ? ride.km : 0,
    date: ride.date,
    heure: ride.heure,
    montantPrevuEuros: Number.isFinite(ride.montant) ? ride.montant : 0,
    modePaiement: ride.modePaiement || 'carte',
    startedAt: typeof ride.startedAt === 'number' ? ride.startedAt : Date.now(),
  }
}

function formatDuration(seconds: number | null): string | null {
  if (seconds == null || !Number.isFinite(seconds)) return null
  const m = Math.round(seconds / 60)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const rest = m % 60
  return `${h} h ${rest} min`
}

export default function DriverNavigationView({ courseId, onClose }: Props) {
  const [snapshot, setSnapshot] = useState<ChauffeurNavCourseSnapshot | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [loadingRoute, setLoadingRoute] = useState(true)
  const [origin, setOrigin] = useState<{ longitude: number; latitude: number } | null>(null)
  const [destination, setDestination] = useState<{ longitude: number; latitude: number } | null>(null)
  const [routeFeature, setRouteFeature] = useState<Feature<LineString> | null>(null)
  const [durationLabel, setDurationLabel] = useState<string | null>(null)
  /** Vol caméra manuel (recentrage « Moi ») ; l’itinéraire est cadré par la carte si null. */
  const [flyTo, setFlyTo] = useState<HomeMapFlyTo | null>(null)
  /** Même relief / pitch que le Hero (vue Vision). */
  const [map3D, setMap3D] = useState(true)
  /** Suivi caméra sur la position GPS (watchPosition). */
  const [followGps, setFollowGps] = useState(false)
  const [liveGpsPosition, setLiveGpsPosition] = useState<{
    longitude: number
    latitude: number
  } | null>(null)
  /** Points GPS enregistrés uniquement après écart par rapport à l’itinéraire théorique. */
  const [actualTrackCoords, setActualTrackCoords] = useState<[number, number][]>([])
  const [offRoute, setOffRoute] = useState(false)
  /** Après « Terminer » ou arrivée : modale récap avant fermeture. */
  const [phase, setPhase] = useState<'navigating' | 'recap'>('navigating')
  const [recapNow, setRecapNow] = useState(() => Date.now())

  const finishedRef = useRef(false)
  const phaseRef = useRef<'navigating' | 'recap'>('navigating')
  const lastTrackRef = useRef<[number, number] | null>(null)
  const everDeviatedRef = useRef(false)
  const routeCoordsRef = useRef<[number, number][]>([])
  const destRef = useRef<{ longitude: number; latitude: number } | null>(null)
  const requestFinishRef = useRef<() => void>(() => {})
  const arrivalStreakRef = useRef(0)

  useEffect(() => {
    finishedRef.current = false
    phaseRef.current = 'navigating'
    setPhase('navigating')
    arrivalStreakRef.current = 0
  }, [courseId])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const snap = readSnapshot()
      if (snap && snap.id === courseId) {
        if (!cancelled) {
          setSnapshot(snap)
          setLoadError(null)
        }
        return
      }

      try {
        const rides = await fetchChauffeurRidesFromApi()
        if (cancelled) return
        const matchingRide = rides.find((ride) => ride.id === courseId)
        if (!matchingRide) {
          setSnapshot(null)
          setLoadError(
            'Donnees de course introuvables. Lancez la course depuis le planning ou la barre du haut, puis reessayez.'
          )
          return
        }
        const hydratedSnapshot = buildSnapshotFromCourseId(courseId, matchingRide)
        setSnapshot(hydratedSnapshot)
        setLoadError(null)
      } catch {
        if (cancelled) return
        setSnapshot(null)
        setLoadError(
          'Donnees de course introuvables. Lancez la course depuis le planning ou la barre du haut, puis reessayez.'
        )
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [courseId])

  const resolveRoute = useCallback(async (snap: ChauffeurNavCourseSnapshot) => {
    setLoadingRoute(true)
    setGeoError(null)
    setRouteFeature(null)
    setDurationLabel(null)

    const queryDepart = `${snap.depart}, La Reunion`
    const queryArrivee = `${snap.arrivee}, La Reunion`

    try {
      const rawO = await geocodeForward(queryDepart, '', {
        language: 'fr',
        proximity: REUNION_PROXIMITY,
        bbox: REUNION_ISLAND_BBOX_GEOCODE,
      })
      const rawD = await geocodeForward(queryArrivee, '', {
        language: 'fr',
        proximity: REUNION_PROXIMITY,
        bbox: REUNION_ISLAND_BBOX_GEOCODE,
      })
      if (!rawO || !rawD) {
        setGeoError('Impossible de localiser le depart ou la destination sur la carte.')
        setLoadingRoute(false)
        return
      }
      const snappedO = await snapLngLatToMapboxDriving('', rawO.longitude, rawO.latitude, {
        searchRadiusMeters: 80,
      })
      const snappedD = await snapLngLatToMapboxDriving('', rawD.longitude, rawD.latitude, {
        searchRadiusMeters: 80,
      })
      if (!snappedO || !snappedD) {
        setGeoError('Accrochage au reseau routier impossible.')
        setLoadingRoute(false)
        return
      }
      setOrigin(snappedO)
      setDestination(snappedD)
      setFlyTo(null)

      const feature = await fetchDrivingRouteFeature('', snappedO, snappedD)
      if (!feature) {
        setGeoError('Itineraire indisponible (Directions Mapbox).')
        setLoadingRoute(false)
        return
      }
      setRouteFeature(feature)
      const dur = feature.properties?.durationSeconds as number | undefined
      const traffic = feature.properties?.durationTrafficSeconds as number | undefined
      const base = formatDuration(typeof dur === 'number' ? dur : null)
      const traf = formatDuration(typeof traffic === 'number' ? traffic : null)
      if (base && traf && traf !== base) {
        setDurationLabel(`${base} (trafic ~ ${traf})`)
      } else {
        setDurationLabel(base)
      }
    } catch {
      setGeoError('Erreur reseau lors du calcul de l’itineraire.')
    } finally {
      setLoadingRoute(false)
    }
  }, [])

  useEffect(() => {
    if (!snapshot) return
    void resolveRoute(snapshot)
  }, [snapshot, resolveRoute])

  useEffect(() => {
    routeCoordsRef.current = (routeFeature?.geometry?.coordinates as [number, number][]) ?? []
  }, [routeFeature])

  useEffect(() => {
    destRef.current = destination
  }, [destination])

  /** Réinitialise le tracé d’écart quand le départ géocodé change. */
  useEffect(() => {
    everDeviatedRef.current = false
    setOffRoute(false)
    if (!origin) {
      setActualTrackCoords([])
      lastTrackRef.current = null
      return
    }
    const o: [number, number] = [origin.longitude, origin.latitude]
    setActualTrackCoords([o])
    lastTrackRef.current = o
  }, [origin?.longitude, origin?.latitude])

  const requestFinish = useCallback(() => {
    if (finishedRef.current || phaseRef.current === 'recap') return
    phaseRef.current = 'recap'
    setPhase('recap')
    setRecapNow(Date.now())
  }, [])

  const confirmRecapAndLeave = useCallback(() => {
    if (finishedRef.current) return
    finishedRef.current = true
    try {
      sessionStorage.removeItem(CHAUFFEUR_NAV_COURSE_STORAGE_KEY)
    } catch {
      /* quota / private mode */
    }
    window.dispatchEvent(
      new CustomEvent(CHAUFFEUR_COURSE_COMPLETED_EVENT, { detail: { id: courseId } })
    )
    onClose()
  }, [courseId, onClose])

  const dismissRecapContinue = useCallback(() => {
    phaseRef.current = 'navigating'
    setPhase('navigating')
    arrivalStreakRef.current = 0
  }, [])

  useEffect(() => {
    requestFinishRef.current = requestFinish
  }, [requestFinish])

  useEffect(() => {
    if (phase !== 'recap') return
    const id = window.setInterval(() => setRecapNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [phase])

  /** Écran allumé pendant l’écran navigation (comme une appli GPS). */
  useEffect(() => {
    if (!snapshot) return
    const lockRef: { current?: WakeLockSentinel } = {}
    const request = async () => {
      try {
        if ('wakeLock' in navigator && document.visibilityState === 'visible') {
          lockRef.current = await navigator.wakeLock.request('screen')
        }
      } catch {
        lockRef.current = undefined
      }
    }
    void request()
    const onVis = () => {
      if (document.visibilityState === 'visible') void request()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      void lockRef.current?.release().catch(() => {})
    }
  }, [snapshot])

  /** GPS dès que l’itinéraire est prêt : marqueur, arrivée auto, tracé d’écart. */
  useEffect(() => {
    if (phase !== 'navigating') return
    if (!routeFeature?.geometry?.coordinates?.length || !origin || !destination) return
    if (typeof navigator === 'undefined' || !navigator.geolocation) return

    let lastEmit = 0

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (finishedRef.current || phaseRef.current !== 'navigating') return
        const lng = pos.coords.longitude
        const lat = pos.coords.latitude
        const now = Date.now()
        if (now - lastEmit < 420) return
        lastEmit = now

        setLiveGpsPosition({ longitude: lng, latitude: lat })

        const dest = destRef.current
        if (dest) {
          const dDest = haversineDistanceMeters(
            { longitude: lng, latitude: lat },
            dest
          )
          if (dDest < 88) {
            arrivalStreakRef.current += 1
            if (arrivalStreakRef.current >= 3) {
              requestFinishRef.current()
              return
            }
          } else {
            arrivalStreakRef.current = 0
          }
        }

        const routeLine = routeCoordsRef.current
        const distRoute =
          routeLine.length >= 2 ? approxMinDistMetersToRoute(lng, lat, routeLine) : Infinity

        setOffRoute((prev) => {
          const next = distRoute > 56
          return prev === next ? prev : next
        })

        if (distRoute > 54) {
          everDeviatedRef.current = true
        }

        const prev = lastTrackRef.current
        const moved = prev
          ? haversineDistanceMeters(
              { longitude: prev[0], latitude: prev[1] },
              { longitude: lng, latitude: lat }
            )
          : 0

        if (everDeviatedRef.current && moved > 11) {
          lastTrackRef.current = [lng, lat]
          setActualTrackCoords((c) => [...c, [lng, lat]])
        } else {
          lastTrackRef.current = [lng, lat]
        }
      },
      () => {
        /* refus géoloc : pas d’arrivée auto ; Terminer reste disponible */
      },
      { enableHighAccuracy: true, maximumAge: 2800, timeout: 22000 }
    )

    return () => {
      navigator.geolocation.clearWatch(watchId)
    }
  }, [routeFeature, origin, destination, phase])

  const actualTrackFeature = useMemo((): Feature<LineString> | null => {
    if (actualTrackCoords.length < 2) return null
    return {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: actualTrackCoords },
    }
  }, [actualTrackCoords])

  const recapPayment = useMemo(() => {
    if (!snapshot) return null
    const montant = snapshot.montantPrevuEuros
    const kmPlanned = snapshot.km > 0 ? snapshot.km : 0
    const dm = routeFeature?.properties?.distanceMeters
    const kmRoute =
      typeof dm === 'number' && Number.isFinite(dm) && dm > 0 ? dm / 1000 : kmPlanned
    const deltaKm = Math.max(0, kmRoute - kmPlanned)
    const prixAuKm =
      montant != null && Number.isFinite(montant) && kmPlanned > 0.05 ? montant / kmPlanned : null
    const surplusIndicatif =
      prixAuKm != null && montant != null ? Math.round(deltaKm * prixAuKm * 100) / 100 : null
    const mode = snapshot.modePaiement ?? 'carte'
    return {
      mode,
      montant,
      kmPlanned,
      kmRoute,
      deltaKm,
      surplusIndicatif,
      hadDeviation: actualTrackCoords.length >= 2,
    }
  }, [snapshot, routeFeature, actualTrackCoords.length])

  const recenterOnUser = useCallback(() => {
    setFollowGps(false)
    if (!origin) return
    setFlyTo({
      longitude: origin.longitude,
      latitude: origin.latitude,
      zoom: 16,
    })
  }, [origin])

  if (loadError) {
    return (
      <div className="driver-navigation-page" role="dialog" aria-labelledby="driver-nav-err-title">
        <header className="driver-navigation-header">
          <button type="button" className="driver-navigation-back" onClick={onClose}>
            <ArrowLeft size={18} aria-hidden />
            Planning
          </button>
        </header>
        <div className="driver-navigation-status">
          <h1 id="driver-nav-err-title">Navigation</h1>
          <p>{loadError}</p>
          <button type="button" onClick={onClose}>
            Retour au dashboard
          </button>
        </div>
      </div>
    )
  }

  if (!snapshot) {
    return null
  }

  const subtitle = `${snapshot.depart} → ${snapshot.arrivee} · ${snapshot.km.toFixed(1)} km`
  const elapsedMs =
    snapshot.startedAt != null ? Math.max(0, recapNow - snapshot.startedAt) : null

  return (
    <div className="driver-navigation-page">
      <header className="driver-navigation-header">
        <button type="button" className="driver-navigation-back" onClick={onClose}>
          <ArrowLeft size={18} aria-hidden />
          Dashboard
        </button>
        <div className="driver-navigation-headlines">
          <h1>{snapshot.client}</h1>
          <p title={subtitle}>{subtitle}</p>
        </div>
        <div className="driver-navigation-actions">
          <button
            type="button"
            className="driver-nav-finish-btn"
            disabled={phase === 'recap'}
            onClick={requestFinish}
            title="Voir le recap puis cloturer la course"
            aria-label="Terminer la course"
          >
            <CheckCircle size={16} aria-hidden />
            <span>Terminer</span>
          </button>
          <button
            type="button"
            className="driver-nav-recenter-btn"
            disabled={!origin}
            title="Recentrer sur le depart (position « vous » sur la carte)"
            aria-label="Recentrer sur le depart"
            onClick={recenterOnUser}
          >
            <LocateFixed size={16} aria-hidden />
            <span>Moi</span>
          </button>
          <button
            type="button"
            className={`driver-nav-follow-btn${followGps ? ' driver-nav-follow-btn--active' : ''}`}
            aria-pressed={followGps}
            aria-label={followGps ? 'Arreter le suivi GPS' : 'Suivre ma position GPS'}
            title={
              followGps
                ? 'Arreter le suivi (la carte ne suit plus le GPS)'
                : 'Suivre la position GPS sur la carte'
            }
            onClick={() => setFollowGps((v) => !v)}
          >
            <Navigation size={16} aria-hidden />
            <span>Suivi</span>
          </button>
          <button
            type="button"
            className={`driver-nav-3d-toggle${map3D ? ' driver-nav-3d-toggle--active' : ''}`}
            aria-pressed={map3D}
            aria-label={map3D ? 'Passer en carte 2D' : 'Passer en carte 3D relief'}
            onClick={() => setMap3D((v) => !v)}
          >
            {map3D ? '2D' : '3D'}
          </button>
        </div>
      </header>

      {offRoute && routeFeature && liveGpsPosition && (
        <div className="driver-navigation-offroute" role="status">
          Écart par rapport à l’itinéraire — le tracé violet indique le parcours réel suivi.
        </div>
      )}

      {geoError && (
        <div className="driver-navigation-meta" style={{ color: '#fca5a5' }}>
          {geoError}
        </div>
      )}

      <div className="driver-navigation-map-wrap">
        {loadingRoute && !routeFeature ? (
          <div className="driver-navigation-status">Calcul de l’itineraire…</div>
        ) : (
          <HomeMapboxBackground
            variant="fullscreen"
            flyToTarget={flyTo}
            userOrigin={origin}
            selectedDestination={destination}
            routeFeature={routeFeature}
            view3D={map3D}
            mapStyleUrl={OPENSTREET_OUTDOORS_STYLE_URL}
            skipCustomLandPaint
            showMapTint={false}
            bringRouteLayerToFront
            liveGpsPosition={liveGpsPosition}
            cameraFollowsLiveGps={followGps}
            actualTrackFeature={actualTrackFeature}
          />
        )}
      </div>

      {(durationLabel || snapshot.date) && (
        <footer className="driver-navigation-meta">
          {durationLabel && <span>Duree estimee : {durationLabel}</span>}
          {durationLabel && snapshot.date && ' · '}
          {snapshot.date && snapshot.heure && (
            <span>
              Course {snapshot.date} · {snapshot.heure}
            </span>
          )}
        </footer>
      )}

      {phase === 'recap' && recapPayment && (
        <div
          className="driver-recap-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="driver-recap-title"
        >
          <div
            className="driver-recap-modal"
            onClick={(e) => e.stopPropagation()}
            role="document"
          >
            <div className="driver-recap-scroll">
              <div className="driver-recap-head">
                <h2 id="driver-recap-title">Recapitulatif de course</h2>
              </div>
              <dl className="driver-recap-dl">
                <div>
                  <dt>Client</dt>
                  <dd>{snapshot.client}</dd>
                </div>
                <div>
                  <dt>Trajet</dt>
                  <dd>
                    {snapshot.depart} → {snapshot.arrivee}
                  </dd>
                </div>
                <div>
                  <dt>Distance prevue (planning)</dt>
                  <dd>{snapshot.km.toFixed(1)} km</dd>
                </div>
                {typeof recapPayment.kmRoute === 'number' && (
                  <div>
                    <dt>Distance itineraire (calcul)</dt>
                    <dd>{recapPayment.kmRoute.toFixed(1)} km</dd>
                  </div>
                )}
                {elapsedMs != null && (
                  <div>
                    <dt>Duree depuis le lancement</dt>
                    <dd>{formatElapsedRecap(elapsedMs)}</dd>
                  </div>
                )}
                {durationLabel && (
                  <div>
                    <dt>Duree estimee trafic</dt>
                    <dd>{durationLabel}</dd>
                  </div>
                )}
              </dl>

              {recapPayment.mode === 'especes' ? (
                <div className="driver-recap-box driver-recap-box--cash">
                  <p className="driver-recap-lead">
                    <strong>Paiement en especes</strong> — prévoir la monnaie si besoin.
                  </p>
                  {recapPayment.montant != null && Number.isFinite(recapPayment.montant) ? (
                    <p className="driver-recap-amount">
                      Montant à encaisser : <strong>{formatEurRecap(recapPayment.montant)}</strong>
                    </p>
                  ) : (
                    <p className="driver-recap-note">Montant non renseigne sur cette course.</p>
                  )}
                </div>
              ) : (
                <div className="driver-recap-box driver-recap-box--card">
                  <p className="driver-recap-lead">
                    <strong>Paiement carte</strong> — le client peut avoir un <strong>surplus</strong> à
                    régler au cas où (détour, péage, attente, écart par rapport au devis).
                  </p>
                  {recapPayment.deltaKm > 0.05 &&
                  recapPayment.surplusIndicatif != null &&
                  recapPayment.surplusIndicatif >= 0.5 ? (
                    <p className="driver-recap-amount">
                      Indicatif complément distance (itinéraire calculé vs km planning) :{' '}
                      <strong>+{formatEurRecap(recapPayment.surplusIndicatif)}</strong>
                      <span className="driver-recap-sub">
                        {' '}
                        (~ +{recapPayment.deltaKm.toFixed(1)} km × tarif au km du devis)
                      </span>
                    </p>
                  ) : (
                    <p className="driver-recap-note">
                      Pas d’écart de distance notable sur l’itinéraire calculé ; un complément reste
                      possible selon les conditions réelles de course.
                    </p>
                  )}
                  {recapPayment.montant != null && Number.isFinite(recapPayment.montant) && (
                    <p className="driver-recap-base">
                      Tarif prévu affiché planning : {formatEurRecap(recapPayment.montant)}
                    </p>
                  )}
                </div>
              )}

              {recapPayment.hadDeviation && (
                <p className="driver-recap-footnote" role="status">
                  Un tracé réel (écart) a été enregistré sur la carte — utile en cas de litige ou
                  ajustement.
                </p>
              )}
            </div>

            <div className="driver-recap-actions">
              <button type="button" className="driver-recap-btn driver-recap-btn--primary" onClick={confirmRecapAndLeave}>
                Retour au planning
              </button>
              <button
                type="button"
                className="driver-recap-btn driver-recap-btn--ghost"
                onClick={dismissRecapContinue}
              >
                Poursuivre la navigation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
