import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Route } from 'lucide-react'
import Map, {
  AttributionControl,
  Layer,
  Marker,
  NavigationControl,
  Source,
  type MapLayerMouseEvent,
  type MapRef,
} from 'react-map-gl/maplibre'
import type { Feature, LineString } from 'geojson'
import type { LayerSpecification, Map as MapLibreMap, SourceSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import './HomeOsmMapBackground.css'
import { DEFAULT_USER_ORIGIN } from '../constants/defaultUserOrigin'
import {
  isLngLatInsideReunionIsland,
  REUNION_HOME_MIN_ZOOM,
  REUNION_MAP_MAX_BOUNDS,
} from '../constants/reunionIsland'
import type { GeoPoint } from '../services/distanceGeo'
import { isValidMapLngLat } from '../utils/mapLngLat'
import { computeMapAutoCameraKey, hasMapAutoFrameContent } from '../utils/mapAutoCameraKey'

/** Centre carte : La Réunion (île), zoom large pour contexte local. */
export const HOME_MAP_INITIAL_VIEW = {
  longitude: 55.45,
  latitude: -21.15,
  zoom: 8.6,
  pitch: 0,
  bearing: 0,
} as const

/**
 * Fond carte **uniquement OSM** (MapLibre GL) : **OpenFreeMap Liberty**
 * — pas de style / tuiles propriétaires (hors OSM), pas de Carto CDN (`basemaps.cartocdn.com`).
 */
export const OSM_MAP_STYLE_DEFAULT = 'https://tiles.openfreemap.org/styles/liberty' as const

export function getDefaultMapStyleUrl(): string {
  return OSM_MAP_STYLE_DEFAULT
}

export const HOME_MAP_STYLE_URL = OSM_MAP_STYLE_DEFAULT
export const MAP_OUTDOORS_STYLE_URL = OSM_MAP_STYLE_DEFAULT
export const HOME_OPENSTREET_STYLE_URL = OSM_MAP_STYLE_DEFAULT
export const OPENSTREET_OUTDOORS_STYLE_URL = OSM_MAP_STYLE_DEFAULT

const CAMERA_ANIM_MS = 720

export type HomeMapFlyTo = {
  longitude: number
  latitude: number
  zoom?: number
}

export type NearbyDriverMapPoint = {
  id: string
  longitude: number
  latitude: number
  name?: string
  /** Photo de profil chauffeur (sinon icône moto par défaut). */
  profilePhotoUrl?: string
}

/** Source DEM relief — id dédié pour éviter les collisions avec le style. */
const MAP_TERRAIN_SOURCE_ID = 'palto-terrain-dem'
const MAP_HILLSHADE_LAYER_ID = 'palto-terrain-hillshade'
const MAP_TERRAIN_EXAGGERATION = 1.45

const MAP_PITCH_3D = 60

function DriverMapProfileAvatar({
  photoUrl,
  title,
  ariaLabel,
}: {
  photoUrl: string
  title?: string
  ariaLabel: string
}) {
  return (
    <div
      className="home-osm-map-driver-avatar"
      title={title}
      role="img"
      aria-label={ariaLabel}
    >
      <img src={photoUrl} alt="" className="home-osm-map-driver-avatar__img" />
    </div>
  )
}

/** Icône moto (vue de profil) pour les chauffeurs sans photo de profil. */
function DriverMapMotoIcon({ title, ariaLabel }: { title?: string; ariaLabel: string }) {
  return (
    <div className="home-osm-map-driver-moto" title={title} role="img" aria-label={ariaLabel}>
      <svg
        className="home-osm-map-driver-moto__svg"
        viewBox="0 0 32 32"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
        focusable="false"
      >
        {/* Silhouette vue de profil : réservoir, selle, fourche */}
        <path
          d="M 9.5 23.5 L 11.5 16 Q 12 13.5 14.5 13 L 21.5 12.5 L 25 14.5 L 23 21.5 L 17 20.8 L 13 23.5 Z"
          fill="#a3e635"
          stroke="rgba(255,255,255,0.92)"
          strokeWidth="0.85"
          strokeLinejoin="round"
        />
        <path
          d="M 24.5 13.5 L 27 11.8"
          stroke="#ecfccb"
          strokeWidth="1.35"
          strokeLinecap="round"
        />
        <circle cx="8.6" cy="23.5" r="4.35" fill="#1a1a1a" stroke="rgba(255,255,255,0.95)" strokeWidth="1.2" />
        <circle cx="23.6" cy="23.5" r="4.35" fill="#1a1a1a" stroke="rgba(255,255,255,0.95)" strokeWidth="1.2" />
      </svg>
    </div>
  )
}

type HomeMapBackgroundProps = {
  /**
   * `fullscreen` : fond de page (viewport).
   * `embedded` : panneau dans une colonne.
   * `dashboardBackdrop` : fond sous l’UI (parent `position: relative`), La Réunion, sans interaction.
   * `authWall` : plein viewport derrière une modale (ex. connexion chauffeur), sans interaction.
   */
  variant?: 'fullscreen' | 'embedded' | 'dashboardBackdrop' | 'authWall'
  /** Si défini, la carte vole vers ce point ; si `null` après une recherche, retour vue île. */
  flyToTarget?: HomeMapFlyTo | null
  /**
   * Point de départ des trajets (pin « vous »).
   * - `undefined` : {@link DEFAULT_USER_ORIGIN} (accueil, Hero, etc.)
   * - `null` : pas de pin départ (ex. page Go avant validation de la localisation)
   */
  userOrigin?: GeoPoint | null
  /** Arrivée sélectionnée (recherche, carte lieu, clic). */
  selectedDestination?: { longitude: number; latitude: number } | null
  /** Géométrie GeoJSON de l’itinéraire (API Directions). */
  routeFeature?: Feature<LineString> | null
  /** Chauffeurs à afficher (pins distincts du départ / arrivée). */
  nearbyDrivers?: NearbyDriverMapPoint[]
  /** Position GPS passager (temps réel), pin distinct du point de prise en charge. */
  liveClientPosition?: GeoPoint | null
  /** Clic sur la carte : choix d’une destination (hors contrôles UI). */
  onMapDestinationPick?: (longitude: number, latitude: number) => void
  /** Vue oblique + relief terrain (tuile raster-dem). */
  view3D?: boolean
  /** Active le relief DEM + ciel. Utilisé aujourd’hui seulement par la navigation chauffeur. */
  enable3DEnvironment?: boolean
  /** Style de carte optionnel (URL style JSON GL). */
  mapStyleUrl?: string
  /** Libellé du bouton « recadrer sur le trajet » après zoom manuel. */
  recenterRouteLabel?: string
}

/**
 * Carte GL : plein écran, colonne embarquée, ou fond dashboard (`dashboardBackdrop`).
 */
export default function HomeOsmMapBackground({
  variant = 'fullscreen',
  flyToTarget = null,
  userOrigin: userOriginProp,
  selectedDestination = null,
  routeFeature = null,
  nearbyDrivers = [],
  liveClientPosition = null,
  onMapDestinationPick,
  view3D = false,
  enable3DEnvironment = false,
  mapStyleUrl,
  recenterRouteLabel = 'Voir le trajet',
}: HomeMapBackgroundProps) {
  /** Pin départ : défaut Dachau si la prop est omise ; `null` = masquer le pin. */
  const resolvedUserOrigin: GeoPoint | null =
    userOriginProp === undefined ? DEFAULT_USER_ORIGIN : userOriginProp

  const safeNearbyDrivers = nearbyDrivers.filter(
    (d): d is NearbyDriverMapPoint =>
      d != null && Number.isFinite(d.longitude) && Number.isFinite(d.latitude)
  )
  const safeUserOrigin = isValidMapLngLat(resolvedUserOrigin) ? resolvedUserOrigin : null
  const safeDestination = isValidMapLngLat(selectedDestination) ? selectedDestination : null
  const safeLiveClient = isValidMapLngLat(liveClientPosition) ? liveClientPosition : null

  const mapRef = useRef<MapRef>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const userLeftDefaultView = useRef(false)
  const [userCameraLocked, setUserCameraLocked] = useState(false)
  const prevAutoCameraKeyRef = useRef('')
  const flyToTargetRef = useRef(flyToTarget)
  flyToTargetRef.current = flyToTarget
  const routeFeatureRef = useRef(routeFeature)
  routeFeatureRef.current = routeFeature
  const nearbyDriversRef = useRef(safeNearbyDrivers)
  nearbyDriversRef.current = safeNearbyDrivers
  const resolvedUserOriginRef = useRef(safeUserOrigin)
  resolvedUserOriginRef.current = safeUserOrigin
  const selectedDestinationRef = useRef(safeDestination)
  selectedDestinationRef.current = safeDestination
  const view3DRef = useRef(view3D)
  view3DRef.current = view3D

  const pitchForMode = useCallback(() => (view3DRef.current ? MAP_PITCH_3D : HOME_MAP_INITIAL_VIEW.pitch), [])

  const removeTerrainHillshade = useCallback((map: MapLibreMap) => {
    try {
      if (map.getLayer(MAP_HILLSHADE_LAYER_ID)) map.removeLayer(MAP_HILLSHADE_LAYER_ID)
    } catch {
      /* couche absente ou style en cours de changement */
    }
  }, [])

  const applyDriver3DEnvironment = useCallback((map: MapLibreMap) => {
    if (!map.getSource(MAP_TERRAIN_SOURCE_ID)) {
      map.addSource(MAP_TERRAIN_SOURCE_ID, {
        type: 'raster-dem',
        tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
        encoding: 'terrarium',
        tileSize: 256,
        maxzoom: 14,
      } as SourceSpecification)
    }

    if (!map.getLayer(MAP_HILLSHADE_LAYER_ID)) {
      map.addLayer({
        id: MAP_HILLSHADE_LAYER_ID,
        type: 'hillshade',
        source: MAP_TERRAIN_SOURCE_ID,
        paint: {
          'hillshade-exaggeration': 0.24,
          'hillshade-shadow-color': 'rgba(15, 23, 42, 0.34)',
          'hillshade-highlight-color': 'rgba(255, 255, 255, 0.28)',
          'hillshade-accent-color': 'rgba(148, 163, 184, 0.18)',
        },
      } as LayerSpecification)
    }

    map.setTerrain({
      source: MAP_TERRAIN_SOURCE_ID,
      exaggeration: MAP_TERRAIN_EXAGGERATION,
    })

    const skyApi = map as MapLibreMap & { setSky?: (sky: unknown) => void }
    skyApi.setSky?.({
      'sky-color': '#8cc9ff',
      'sky-horizon-blend': 0.35,
      'horizon-color': '#f8fafc',
      'horizon-fog-blend': 0.45,
      'fog-color': '#dbeafe',
      'fog-ground-blend': 0.62,
    })
  }, [])

  const applyTerrainAndPitch = useCallback(() => {
    const map = mapRef.current?.getMap()
    if (!map || !map.isStyleLoaded()) return

    const on = view3DRef.current
    try {
      map.setTerrain(null)
    } catch {
      /* style ou source déjà présente côté carte */
    }

    if (!on || !enable3DEnvironment) {
      removeTerrainHillshade(map)
      const skyApi = map as MapLibreMap & { setSky?: (sky: unknown) => void }
      try {
        skyApi.setSky?.(null)
      } catch {
        /* API sky optionnelle selon la version MapLibre */
      }
    }

    if (on && enable3DEnvironment) {
      try {
        applyDriver3DEnvironment(map)
      } catch {
        /* Le relief est une amélioration progressive : la carte reste utilisable sans DEM. */
      }
    }

    try {
      map.stop()
    } catch {
      /* pas d’animation en cours */
    }
    map.easeTo({
      pitch: on ? MAP_PITCH_3D : 0,
      duration: 520,
      essential: true,
    })
  }, [applyDriver3DEnvironment, enable3DEnvironment, removeTerrainHillshade])

  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!map) return undefined

    const run = () => applyTerrainAndPitch()
    if (map.isStyleLoaded()) run()
    else map.once('style.load', run)

    return () => {
      map.off('style.load', run)
    }
  }, [view3D, applyTerrainAndPitch])

  const nearbyDriverIdsKey = useMemo(
    () => safeNearbyDrivers.map((d) => d.id).sort().join(','),
    [safeNearbyDrivers]
  )

  const autoCameraKey = useMemo(
    () =>
      computeMapAutoCameraKey({
        routeFeature,
        userOrigin: safeUserOrigin,
        selectedDestination: safeDestination,
        flyToTarget,
        nearbyDriverIds: nearbyDriverIdsKey,
      }),
    [routeFeature, safeUserOrigin, safeDestination, flyToTarget, nearbyDriverIdsKey]
  )

  const canShowRecenter =
    userCameraLocked && hasMapAutoFrameContent(autoCameraKey) && variant !== 'authWall'

  const markUserCameraControl = useCallback(() => {
    setUserCameraLocked(true)
  }, [])

  /** Une seule source de vérité caméra : évite flyTo + fitBounds concurrents (pins « qui sautent »). */
  const syncMapCamera = useCallback((options?: { force?: boolean }) => {
    const map = mapRef.current?.getMap()
    if (!map || !map.isStyleLoaded()) return
    if (!options?.force && userCameraLocked) return

    try {
      map.stop()
    } catch {
      /* ignore */
    }

    const pitch = pitchForMode()
    const routeCoords = routeFeatureRef.current?.geometry?.coordinates as [number, number][] | undefined

    if (routeCoords && routeCoords.length >= 2) {
      let minLng = Infinity
      let minLat = Infinity
      let maxLng = -Infinity
      let maxLat = -Infinity
      for (const [lng, lat] of routeCoords) {
        minLng = Math.min(minLng, lng)
        maxLng = Math.max(maxLng, lng)
        minLat = Math.min(minLat, lat)
        maxLat = Math.max(maxLat, lat)
      }
      if (Number.isFinite(minLng)) {
        map.fitBounds(
          [
            [minLng, minLat],
            [maxLng, maxLat],
          ],
          { padding: 72, duration: CAMERA_ANIM_MS, maxZoom: 15, essential: true }
        )
      }
      return
    }

    const target = flyToTargetRef.current
    if (target && Number.isFinite(target.longitude) && Number.isFinite(target.latitude)) {
      userLeftDefaultView.current = true
      map.easeTo({
        center: [target.longitude, target.latitude],
        zoom: target.zoom ?? 14,
        pitch,
        bearing: HOME_MAP_INITIAL_VIEW.bearing,
        duration: CAMERA_ANIM_MS,
        essential: true,
      })
      return
    }

    const originPt = resolvedUserOriginRef.current
    const destPt = selectedDestinationRef.current
    if (isValidMapLngLat(originPt) && isValidMapLngLat(destPt)) {
      const minLng = Math.min(originPt.longitude, destPt.longitude)
      const maxLng = Math.max(originPt.longitude, destPt.longitude)
      const minLat = Math.min(originPt.latitude, destPt.latitude)
      const maxLat = Math.max(originPt.latitude, destPt.latitude)
      map.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        { padding: 64, duration: CAMERA_ANIM_MS, maxZoom: 14.5, essential: true }
      )
      return
    }

    const drivers = nearbyDriversRef.current.filter(
      (d): d is NearbyDriverMapPoint =>
        d != null && Number.isFinite(d.longitude) && Number.isFinite(d.latitude)
    )
    const origin = resolvedUserOriginRef.current
    const firstDriver = drivers[0]
    if (firstDriver) {
      let minLng = isValidMapLngLat(origin) ? origin.longitude : firstDriver.longitude
      let maxLng = minLng
      let minLat = isValidMapLngLat(origin) ? origin.latitude : firstDriver.latitude
      let maxLat = minLat
      if (isValidMapLngLat(origin)) {
        minLng = Math.min(minLng, origin.longitude)
        maxLng = Math.max(maxLng, origin.longitude)
        minLat = Math.min(minLat, origin.latitude)
        maxLat = Math.max(maxLat, origin.latitude)
      }
      for (const d of drivers) {
        minLng = Math.min(minLng, d.longitude)
        maxLng = Math.max(maxLng, d.longitude)
        minLat = Math.min(minLat, d.latitude)
        maxLat = Math.max(maxLat, d.latitude)
      }
      map.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        { padding: 88, duration: CAMERA_ANIM_MS, maxZoom: 12.5, essential: true }
      )
      return
    }

    if (userLeftDefaultView.current) {
      map.easeTo({
        center: [HOME_MAP_INITIAL_VIEW.longitude, HOME_MAP_INITIAL_VIEW.latitude],
        zoom: HOME_MAP_INITIAL_VIEW.zoom,
        pitch,
        bearing: HOME_MAP_INITIAL_VIEW.bearing,
        duration: CAMERA_ANIM_MS + 120,
        essential: true,
      })
    }
  }, [pitchForMode, userCameraLocked])

  useEffect(() => {
    const keyChanged = prevAutoCameraKeyRef.current !== autoCameraKey
    prevAutoCameraKeyRef.current = autoCameraKey
    if (keyChanged) {
      setUserCameraLocked(false)
      syncMapCamera({ force: true })
      return
    }
    if (!userCameraLocked) syncMapCamera()
  }, [autoCameraKey, userCameraLocked, syncMapCamera])

  const handleRecenterRoute = useCallback(() => {
    setUserCameraLocked(false)
    syncMapCamera({ force: true })
  }, [syncMapCamera])

  const handleMapLoad = useCallback(() => {
    const map = mapRef.current?.getMap()
    if (!map) return

    const run = () => {
      syncMapCamera()
      applyTerrainAndPitch()
    }

    if (map.isStyleLoaded()) run()
    else map.once('style.load', run)
  }, [syncMapCamera, applyTerrainAndPitch])

  /** Colonne embarquée / fond dashboard : recalculer la taille quand le conteneur change. */
  useEffect(() => {
    if (variant !== 'embedded' && variant !== 'dashboardBackdrop') return
    if (!containerRef.current) return
    const el = containerRef.current
    const resize = () => {
      mapRef.current?.resize()
    }
    const ro = new ResizeObserver(() => {
      resize()
    })
    ro.observe(el)
    resize()
    return () => {
      ro.disconnect()
    }
  }, [variant])

  const handleMapClick = useCallback(
    (e: MapLayerMouseEvent) => {
      if (!onMapDestinationPick) return
      const { lng, lat } = e.lngLat
      if (!isLngLatInsideReunionIsland(lng, lat)) return
      onMapDestinationPick(lng, lat)
    },
    [onMapDestinationPick]
  )

  const rootClass =
    variant === 'embedded'
      ? 'home-osm-map-bg home-osm-map-bg--embedded'
      : variant === 'dashboardBackdrop'
        ? 'home-osm-map-bg home-osm-map-bg--dashboard-backdrop'
        : variant === 'authWall'
          ? 'home-osm-map-bg home-osm-map-bg--auth-wall'
          : 'home-osm-map-bg'

  return (
    <div ref={containerRef} className={rootClass}>
      <div className="home-osm-map-bg__map">
        <Map
          ref={mapRef}
          initialViewState={HOME_MAP_INITIAL_VIEW}
          mapStyle={mapStyleUrl ?? HOME_OPENSTREET_STYLE_URL}
          style={{ width: '100%', height: '100%' }}
          reuseMaps
          minZoom={REUNION_HOME_MIN_ZOOM}
          maxBounds={REUNION_MAP_MAX_BOUNDS}
          maxPitch={85}
          attributionControl={false}
          onLoad={handleMapLoad}
          onMoveEnd={(e) => {
            if (e.originalEvent) markUserCameraControl()
          }}
          onZoomEnd={(e) => {
            if (e.originalEvent) markUserCameraControl()
          }}
          onDragEnd={(e) => {
            if (e.originalEvent) markUserCameraControl()
          }}
          onClick={
            variant === 'dashboardBackdrop' || variant === 'authWall'
              ? undefined
              : onMapDestinationPick
                ? handleMapClick
                : undefined
          }
          cursor={
            variant === 'dashboardBackdrop' || variant === 'authWall'
              ? 'default'
              : onMapDestinationPick
                ? 'crosshair'
                : 'grab'
          }
        >
          {safeUserOrigin ? (
            <Marker
              longitude={safeUserOrigin.longitude}
              latitude={safeUserOrigin.latitude}
              anchor="bottom"
              style={{ pointerEvents: 'none' }}
            >
              <div className="home-osm-map-pin home-osm-map-pin--user" title="Départ" aria-label="Position départ" />
            </Marker>
          ) : null}

          {safeDestination ? (
            <Marker
              longitude={safeDestination.longitude}
              latitude={safeDestination.latitude}
              anchor="bottom"
              style={{ pointerEvents: 'none' }}
            >
              <div className="home-osm-map-pin home-osm-map-pin--dest" title="Arrivée" aria-label="Destination" />
            </Marker>
          ) : null}

          {safeNearbyDrivers.map((d) => (
            <Marker
              key={d.id}
              longitude={d.longitude}
              latitude={d.latitude}
              anchor="center"
              style={{ pointerEvents: 'none' }}
            >
              {d.profilePhotoUrl?.trim() ? (
                <DriverMapProfileAvatar
                  photoUrl={d.profilePhotoUrl.trim()}
                  title={d.name ?? 'Chauffeur'}
                  ariaLabel={d.name ? `Chauffeur ${d.name}` : 'Chauffeur'}
                />
              ) : (
                <DriverMapMotoIcon
                  title={d.name ?? 'Chauffeur'}
                  ariaLabel={d.name ? `Chauffeur ${d.name}` : 'Chauffeur moto'}
                />
              )}
            </Marker>
          ))}

          {safeLiveClient ? (
            <Marker
              longitude={safeLiveClient.longitude}
              latitude={safeLiveClient.latitude}
              anchor="bottom"
              style={{ pointerEvents: 'none' }}
            >
              <div
                className="home-osm-map-pin home-osm-map-pin--client-live"
                title="Vous"
                aria-label="Votre position"
              />
            </Marker>
          ) : null}

          {routeFeature ? (
            <Source id="home-route" type="geojson" data={routeFeature}>
              <Layer
                id="home-route-line"
                type="line"
                layout={{ 'line-join': 'round', 'line-cap': 'round' }}
                paint={{
                  'line-color': '#fb923c',
                  'line-width': 5,
                  'line-opacity': 0.92,
                  'line-blur': 0.4,
                }}
              />
            </Source>
          ) : null}

          {variant === 'dashboardBackdrop' || variant === 'authWall' ? null : (
            <NavigationControl position="bottom-right" showCompass showZoom />
          )}
          <AttributionControl compact position="bottom-left" />
        </Map>
        {canShowRecenter ? (
          <button
            type="button"
            className="home-osm-map-recenter"
            onClick={handleRecenterRoute}
            aria-label={recenterRouteLabel}
          >
            <Route size={16} aria-hidden />
            {recenterRouteLabel}
          </button>
        ) : null}
      </div>
    </div>
  )
}
