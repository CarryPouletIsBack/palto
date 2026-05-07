import { useCallback, useEffect, useRef } from 'react'
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
import type { Map as MapLibreMap } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import './HomeMapboxBackground.css'
import { DEFAULT_USER_ORIGIN } from '../constants/defaultUserOrigin'
import {
  isLngLatInsideReunionIsland,
  REUNION_HOME_MIN_ZOOM,
  REUNION_MAP_MAX_BOUNDS,
} from '../constants/reunionIsland'
import type { GeoPoint } from '../services/distanceGeo'

/** Centre carte : La Réunion (île), zoom large pour contexte local. */
export const HOME_MAP_INITIAL_VIEW = {
  longitude: 55.45,
  latitude: -21.15,
  zoom: 8.6,
  pitch: 0,
  bearing: 0,
} as const

/** Style principal OSM (vector tiles). */
export const HOME_MAP_STYLE_URL = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json' as const

/** Style OSM orienté navigation. */
export const MAP_OUTDOORS_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty' as const
export const HOME_OPENSTREET_STYLE_URL = HOME_MAP_STYLE_URL
export const OPENSTREET_OUTDOORS_STYLE_URL = HOME_OPENSTREET_STYLE_URL

/** Gris clair pour les surfaces « terre » (landcover, landuse, parcs, etc.) — l’eau reste bleue. */
const MAP_LAND_GRAY_FILL = '#e2e2ea'
const MAP_LAND_GRAY_BACKGROUND = '#ececf2'
const MAP_HILLSHADE_HIGHLIGHT = '#f4f4f8'
const MAP_HILLSHADE_SHADOW = '#c4c4ce'
const MAP_HILLSHADE_ACCENT = '#d8d8e2'

function isWaterFillLayerId(id: string): boolean {
  return /water|ocean|river|dock|wave|bathymetry|marine|sea|canal|stream|bay|ferry/i.test(id.toLowerCase())
}

function isLandFillLayerId(id: string): boolean {
  const lower = id.toLowerCase()
  if (isWaterFillLayerId(lower)) return false
  if (/building|road|rail|bridge|tunnel|boundary|admin|place|poi|label|shield|path|aerialway|structure|transit|cliff/i.test(lower)) {
    return false
  }
  return (
    lower === 'land' ||
    lower.startsWith('landuse') ||
    lower.includes('landcover') ||
    lower.includes('national-park') ||
    lower.includes('pitch') ||
    lower.includes('park') ||
    lower.includes('grass') ||
    lower.includes('wood') ||
    lower.includes('scrub') ||
    lower.includes('sand') ||
    lower.includes('cemetery') ||
    lower.includes('hospital') ||
    lower.includes('school') ||
    lower.includes('glacier') ||
    lower.includes('zoo') ||
    lower.includes('stadium') ||
    lower.includes('wetland')
  )
}

/** Recolore les masses terrestres en gris (style Streets). */
function applyGrayLandPaint(map: MapLibreMap) {
  if (!map.isStyleLoaded()) return
  const layers = map.getStyle()?.layers
  if (!layers) return

  for (const layer of layers) {
    try {
      if (layer.type === 'background') {
        map.setPaintProperty(layer.id, 'background-color', MAP_LAND_GRAY_BACKGROUND)
        continue
      }
      if (layer.type === 'hillshade') {
        map.setPaintProperty(layer.id, 'hillshade-highlight-color', MAP_HILLSHADE_HIGHLIGHT)
        map.setPaintProperty(layer.id, 'hillshade-shadow-color', MAP_HILLSHADE_SHADOW)
        map.setPaintProperty(layer.id, 'hillshade-accent-color', MAP_HILLSHADE_ACCENT)
        continue
      }
      if (layer.type !== 'fill') continue
      if (!isLandFillLayerId(layer.id)) continue
      map.setPaintProperty(layer.id, 'fill-color', MAP_LAND_GRAY_FILL)
    } catch {
      /* paint dynamique ou propriété absente */
    }
  }
}

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
}

/** Source DEM relief — id dédié pour éviter les collisions avec le style. */
const MAP_TERRAIN_SOURCE_ID = 'palto-terrain-dem'

const MAP_PITCH_3D = 60

/** Icône moto (vue de profil) pour les chauffeurs sur la carte. */
function DriverMapMotoIcon({ title, ariaLabel }: { title?: string; ariaLabel: string }) {
  return (
    <div className="home-mapbox-driver-moto" title={title} role="img" aria-label={ariaLabel}>
      <svg
        className="home-mapbox-driver-moto__svg"
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
  /** Clic sur la carte : choix d’une destination (hors contrôles UI). */
  onMapDestinationPick?: (longitude: number, latitude: number) => void
  /** Vue oblique + relief terrain (tuile raster-dem). */
  view3D?: boolean
  /** Style de carte optionnel (URL style JSON GL). */
  mapStyleUrl?: string
}

/**
 * Carte GL : plein écran, colonne embarquée, ou fond dashboard (`dashboardBackdrop`).
 */
export default function HomeMapboxBackground({
  variant = 'fullscreen',
  flyToTarget = null,
  userOrigin: userOriginProp,
  selectedDestination = null,
  routeFeature = null,
  nearbyDrivers = [],
  onMapDestinationPick,
  view3D = false,
  mapStyleUrl,
}: HomeMapBackgroundProps) {
  /** Pin départ : défaut Dachau si la prop est omise ; `null` = masquer le pin. */
  const resolvedUserOrigin: GeoPoint | null =
    userOriginProp === undefined ? DEFAULT_USER_ORIGIN : userOriginProp

  const mapRef = useRef<MapRef>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const userLeftDefaultView = useRef(false)
  const flyToTargetRef = useRef(flyToTarget)
  flyToTargetRef.current = flyToTarget
  const view3DRef = useRef(view3D)
  view3DRef.current = view3D

  const pitchForMode = useCallback(() => (view3DRef.current ? MAP_PITCH_3D : HOME_MAP_INITIAL_VIEW.pitch), [])

  const applyTerrainAndPitch = useCallback(() => {
    const map = mapRef.current?.getMap()
    if (!map || !map.isStyleLoaded()) return

    const on = view3DRef.current
    try {
      map.setTerrain(null)
    } catch {
      /* style ou source déjà présente côté carte */
    }

    map.easeTo({
      pitch: on ? MAP_PITCH_3D : 0,
      duration: 900,
      essential: true,
    })
  }, [])

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

  const applyFly = useCallback(() => {
    const map = mapRef.current?.getMap()
    if (!map || !map.isStyleLoaded()) return
    const target = flyToTargetRef.current
    const pitch = pitchForMode()
    if (target) {
      userLeftDefaultView.current = true
      map.flyTo({
        center: [target.longitude, target.latitude],
        zoom: target.zoom ?? 14,
        pitch,
        duration: 1600,
        essential: true,
      })
    } else if (userLeftDefaultView.current) {
      map.flyTo({
        center: [HOME_MAP_INITIAL_VIEW.longitude, HOME_MAP_INITIAL_VIEW.latitude],
        zoom: HOME_MAP_INITIAL_VIEW.zoom,
        pitch,
        bearing: HOME_MAP_INITIAL_VIEW.bearing,
        duration: 1600,
        essential: true,
      })
    }
  }, [pitchForMode])

  useEffect(() => {
    applyFly()
  }, [flyToTarget, applyFly])

  const handleMapLoad = useCallback(() => {
    const map = mapRef.current?.getMap()
    if (!map) return

    const run = () => {
      applyGrayLandPaint(map)
      applyFly()
      applyTerrainAndPitch()
    }

    if (map.isStyleLoaded()) run()
    else map.once('style.load', run)
  }, [applyFly, applyTerrainAndPitch])

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

  /** Cadre sur l’itinéraire lorsque la ligne est disponible. */
  useEffect(() => {
    const coords = routeFeature?.geometry?.coordinates
    if (!coords?.length) return

    const map = mapRef.current?.getMap()
    if (!map) return

    let minLng = Infinity
    let minLat = Infinity
    let maxLng = -Infinity
    let maxLat = -Infinity
    for (const [lng, lat] of coords) {
      minLng = Math.min(minLng, lng)
      maxLng = Math.max(maxLng, lng)
      minLat = Math.min(minLat, lat)
      maxLat = Math.max(maxLat, lat)
    }
    if (!Number.isFinite(minLng)) return

    const bounds: [[number, number], [number, number]] = [
      [minLng, minLat],
      [maxLng, maxLat],
    ]

    const fit = () => {
      if (!map.isStyleLoaded()) return
      map.fitBounds(bounds, { padding: 72, duration: 1200, maxZoom: 15 })
    }

    fit()
    if (!map.isStyleLoaded()) {
      map.once('idle', fit)
      return () => {
        map.off('idle', fit)
      }
    }
    return undefined
  }, [routeFeature])

  /** Sans itinéraire ni cible fly-to : cadrer départ + chauffeurs pour les rendre visibles (évite pins invisibles au zoom île). */
  useEffect(() => {
    const coords = routeFeature?.geometry?.coordinates
    if (coords?.length) return
    if (flyToTarget) return
    if (!nearbyDrivers.length) return

    const map = mapRef.current?.getMap()
    if (!map) return

    let minLng: number
    let maxLng: number
    let minLat: number
    let maxLat: number
    if (resolvedUserOrigin) {
      minLng = resolvedUserOrigin.longitude
      maxLng = resolvedUserOrigin.longitude
      minLat = resolvedUserOrigin.latitude
      maxLat = resolvedUserOrigin.latitude
    } else {
      minLng = nearbyDrivers[0].longitude
      maxLng = nearbyDrivers[0].longitude
      minLat = nearbyDrivers[0].latitude
      maxLat = nearbyDrivers[0].latitude
    }
    for (const d of nearbyDrivers) {
      minLng = Math.min(minLng, d.longitude)
      maxLng = Math.max(maxLng, d.longitude)
      minLat = Math.min(minLat, d.latitude)
      maxLat = Math.max(maxLat, d.latitude)
    }

    const bounds: [[number, number], [number, number]] = [
      [minLng, minLat],
      [maxLng, maxLat],
    ]

    const fit = () => {
      if (!map.isStyleLoaded()) return
      map.fitBounds(bounds, { padding: 88, duration: 1400, maxZoom: 12.5 })
    }

    fit()
    if (!map.isStyleLoaded()) {
      map.once('idle', fit)
      return () => {
        map.off('idle', fit)
      }
    }
    return undefined
  }, [
    routeFeature,
    flyToTarget,
    nearbyDrivers,
    resolvedUserOrigin?.latitude,
    resolvedUserOrigin?.longitude,
  ])

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
      ? 'home-mapbox-bg home-mapbox-bg--embedded'
      : variant === 'dashboardBackdrop'
        ? 'home-mapbox-bg home-mapbox-bg--dashboard-backdrop'
        : variant === 'authWall'
          ? 'home-mapbox-bg home-mapbox-bg--auth-wall'
          : 'home-mapbox-bg'

  return (
    <div ref={containerRef} className={rootClass}>
      <div className="home-mapbox-bg__map">
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
          {resolvedUserOrigin ? (
            <Marker
              longitude={resolvedUserOrigin.longitude}
              latitude={resolvedUserOrigin.latitude}
              anchor="bottom"
            >
              <div className="home-mapbox-pin home-mapbox-pin--user" title="Départ" aria-label="Position départ" />
            </Marker>
          ) : null}

          {selectedDestination ? (
            <Marker
              longitude={selectedDestination.longitude}
              latitude={selectedDestination.latitude}
              anchor="bottom"
            >
              <div className="home-mapbox-pin home-mapbox-pin--dest" title="Arrivée" aria-label="Destination" />
            </Marker>
          ) : null}

          {nearbyDrivers.map((d) => (
            <Marker key={d.id} longitude={d.longitude} latitude={d.latitude} anchor="center">
              <DriverMapMotoIcon
                title={d.name ?? 'Chauffeur'}
                ariaLabel={d.name ? `Chauffeur ${d.name}` : 'Chauffeur moto'}
              />
            </Marker>
          ))}

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
      </div>
      <div className="home-mapbox-bg__tint" aria-hidden />
    </div>
  )
}
