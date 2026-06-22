import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Feature, LineString } from 'geojson'
import { X } from 'lucide-react'
import HomeOsmMapBackground, { type HomeMapFlyTo } from './HomeOsmMapBackground'
import type { ChauffeurJobOffer } from '../data/chauffeurJobs'
import { geocodeForward } from '../services/addressGeocoding'
import { fetchDrivingRouteFeature } from '../services/osrmRouting'
import './ChauffeurJobRouteModal.css'

export type ChauffeurJobRouteModalProps = {
  job: ChauffeurJobOffer
  language: 'fr' | 'en'
  onClose: () => void
}

type ResolvedPoints = {
  origin: { longitude: number; latitude: number }
  destination: { longitude: number; latitude: number }
}

async function resolveJobPoints(
  job: ChauffeurJobOffer,
  language: 'fr' | 'en',
  signal: AbortSignal
): Promise<ResolvedPoints | null> {
  const hasCoords =
    Number.isFinite(job.pickupLng) &&
    Number.isFinite(job.pickupLat) &&
    Number.isFinite(job.dropoffLng) &&
    Number.isFinite(job.dropoffLat)

  if (hasCoords) {
    return {
      origin: { longitude: job.pickupLng, latitude: job.pickupLat },
      destination: { longitude: job.dropoffLng, latitude: job.dropoffLat },
    }
  }

  const suffix = language === 'en' ? ', Reunion Island' : ', La Réunion'
  const [pickup, dropoff] = await Promise.all([
    geocodeForward(`${job.pickupLabel}${suffix}`, undefined, { language }),
    geocodeForward(`${job.dropoffLabel}${suffix}`, undefined, { language }),
  ])
  if (signal.aborted || !pickup || !dropoff) return null
  return {
    origin: pickup,
    destination: dropoff,
  }
}

function flyToForRoute(
  origin: { longitude: number; latitude: number },
  destination: { longitude: number; latitude: number }
): HomeMapFlyTo {
  const minLng = Math.min(origin.longitude, destination.longitude)
  const maxLng = Math.max(origin.longitude, destination.longitude)
  const minLat = Math.min(origin.latitude, destination.latitude)
  const maxLat = Math.max(origin.latitude, destination.latitude)
  const span = Math.max(maxLng - minLng, maxLat - minLat)
  const zoom = span > 0.12 ? 11.2 : span > 0.04 ? 12.8 : span > 0.015 ? 14 : 15.2
  return {
    longitude: (minLng + maxLng) / 2,
    latitude: (minLat + maxLat) / 2,
    zoom,
  }
}

export default function ChauffeurJobRouteModal({ job, language, onClose }: ChauffeurJobRouteModalProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [points, setPoints] = useState<ResolvedPoints | null>(null)
  const [routeFeature, setRouteFeature] = useState<Feature<LineString> | null>(null)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)
      setRouteFeature(null)
      try {
        const resolved = await resolveJobPoints(job, language, controller.signal)
        if (cancelled || !resolved) {
          if (!cancelled) {
            setError(
              language === 'en'
                ? 'Could not locate pickup or drop-off on the map.'
                : 'Impossible de localiser le départ ou l’arrivée sur la carte.'
            )
          }
          return
        }
        setPoints(resolved)
        const feature = await fetchDrivingRouteFeature(resolved.origin, resolved.destination, {
          signal: controller.signal,
        })
        if (cancelled) return
        setRouteFeature(feature)
        if (!feature) {
          setError(
            language === 'en'
              ? 'Route could not be calculated.'
              : 'Impossible de calculer l’itinéraire.'
          )
        }
      } catch {
        if (!cancelled) {
          setError(
            language === 'en' ? 'Error loading the route.' : 'Erreur lors du chargement du trajet.'
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [job, language])

  const flyTo = useMemo(
    () => (points ? flyToForRoute(points.origin, points.destination) : null),
    [points]
  )

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className="chauffeur-job-route-modal"
      role="dialog"
      aria-modal="true"
      aria-label={language === 'en' ? 'Ride route preview' : 'Aperçu du trajet'}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="chauffeur-job-route-modal__box">
        <header className="chauffeur-job-route-modal__head">
          <div className="chauffeur-job-route-modal__titles">
            <h2>{language === 'en' ? 'Route preview' : 'Aperçu du trajet'}</h2>
            <p>
              {job.pickupLabel} → {job.dropoffLabel}
            </p>
          </div>
          <button
            type="button"
            className="chauffeur-job-route-modal__close"
            onClick={onClose}
            aria-label={language === 'en' ? 'Close' : 'Fermer'}
          >
            <X size={18} strokeWidth={2} aria-hidden />
          </button>
        </header>
        <div className="chauffeur-job-route-modal__map-wrap">
          {loading ? (
            <p className="chauffeur-job-route-modal__status" role="status">
              {language === 'en' ? 'Loading route…' : 'Chargement du trajet…'}
            </p>
          ) : error ? (
            <p className="chauffeur-job-route-modal__status chauffeur-job-route-modal__status--error" role="alert">
              {error}
            </p>
          ) : points ? (
            <HomeOsmMapBackground
              variant="embedded"
              flyToTarget={flyTo}
              userOrigin={points.origin}
              selectedDestination={points.destination}
              routeFeature={routeFeature}
              recenterRouteLabel={language === 'en' ? 'View route' : 'Voir le trajet'}
            />
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  )
}
