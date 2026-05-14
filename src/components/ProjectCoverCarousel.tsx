import { useMemo, useState, useCallback, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Autoplay } from 'swiper/modules';
import type { Feature, LineString } from 'geojson';
import 'swiper/css';
import 'swiper/css/pagination';
import { ArrowLeft } from 'lucide-react';
import Button from './Button';
import './ProjectCoverCarousel.css';
import HomeMapboxBackground, { type HomeMapFlyTo } from './HomeMapboxBackground';
import { resolvePickOnRoad } from '../services/mapboxSnapToRoad';
import { isLngLatInsideReunionIsland } from '../constants/reunionIsland';
import { geocodeReverse, reverseGeocodeDisplayFallback } from '../services/mapboxGeocoding';
import { useLanguage } from '../contexts/LanguageContext';

interface ProjectCoverCarouselProps {
  coverImage: string;
  projectName: string;
  swipeY?: number;
  /** 0 = pas assombri, 1 = panneau en haut (cover au maximum assombrie) */
  coverLiftProgress?: number;
  onClose?: () => void;
  onPreviousProject?: () => void;
  onNextProject?: () => void;
  onFullscreenOpen?: () => void;
  onFullscreenClose?: () => void;
  coverFullscreenActive?: boolean;
  /** Contrôlé par le parent (App) : la modal s'ouvre après le délai du glissement */
  isFullscreenModalOpen?: boolean;
  /** true : masque le bouton fermer de la cover (ex. dès qu’on scroll dans le projet) */
  hideCloseOnScroll?: boolean;
}

const ProjectCoverCarousel: React.FC<ProjectCoverCarouselProps> = ({
  coverImage,
  projectName,
  swipeY = 0,
  coverLiftProgress = 0,
  onClose,
  onPreviousProject,
  onNextProject,
  onFullscreenOpen,
  onFullscreenClose,
  coverFullscreenActive = false,
  isFullscreenModalOpen = false,
  hideCloseOnScroll = false,
}) => {
  const { language } = useLanguage();
  const [fullscreenIndex, setFullscreenIndex] = useState(0);
  /** Premier clic carte cover = départ (comme le panneau Go), pas d’origine fictive Dachau. */
  const [mapCoverPickup, setMapCoverPickup] = useState<{ longitude: number; latitude: number } | null>(null);
  const [mapCoverPickupLabel, setMapCoverPickupLabel] = useState('');
  const [mapSelectedDestination, setMapSelectedDestination] = useState<{ longitude: number; latitude: number } | null>(null);
  const [mapRouteFeature, setMapRouteFeature] = useState<Feature<LineString> | null>(null);
  const [mapDestinationLabel, setMapDestinationLabel] = useState('');
  const [coverFlyToTarget, setCoverFlyToTarget] = useState<HomeMapFlyTo | null>(null);

  // Dupliquer l'image pour tester le carousel
  const images = useMemo(() => {
    return [coverImage, coverImage, coverImage];
  }, [coverImage, projectName]);

  const openFullscreen = useCallback(() => {
    onFullscreenOpen?.();
  }, [onFullscreenOpen]);

  const closeFullscreen = useCallback(() => {
    setFullscreenIndex(0);
    onFullscreenClose?.();
  }, [onFullscreenClose]);

  useEffect(() => {
    if (!isFullscreenModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeFullscreen();
      if (e.key === 'ArrowLeft') setFullscreenIndex((i) => (i <= 0 ? images.length - 1 : i - 1));
      if (e.key === 'ArrowRight') setFullscreenIndex((i) => (i >= images.length - 1 ? 0 : i + 1));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isFullscreenModalOpen, images.length, closeFullscreen]);

  const goPrev = useCallback(() => {
    setFullscreenIndex((i) => (i <= 0 ? images.length - 1 : i - 1));
  }, [images.length]);
  const goNext = useCallback(() => {
    setFullscreenIndex((i) => (i >= images.length - 1 ? 0 : i + 1));
  }, [images.length]);

  const hasVideoExtension = (src: string) => /\.(mp4|webm|mov|avi|mkv)$/i.test(src);
  const isMpAudioProject = projectName.toLowerCase().includes('mp audio');
  const isPaltoMapCover = projectName.trim().toLowerCase() === 'go';
  const mapToken =
    (import.meta.env.VITE_OPENSTREET_ACCESS_TOKEN as string | undefined)?.trim() || 'osm';

  useEffect(() => {
    if (isPaltoMapCover) return;
    setMapCoverPickup(null);
    setMapCoverPickupLabel('');
    setMapSelectedDestination(null);
    setMapRouteFeature(null);
    setMapDestinationLabel('');
    setCoverFlyToTarget(null);
  }, [isPaltoMapCover]);

  useEffect(() => {
    if (!isPaltoMapCover) return;
    const onFlyTo = (evt: Event) => {
      const e = evt as CustomEvent<{ longitude?: number; latitude?: number; zoom?: number }>;
      const d = e.detail;
      if (
        !d ||
        typeof d.longitude !== 'number' ||
        typeof d.latitude !== 'number' ||
        !Number.isFinite(d.longitude) ||
        !Number.isFinite(d.latitude)
      ) {
        return;
      }
      setCoverFlyToTarget({
        longitude: d.longitude,
        latitude: d.latitude,
        zoom: typeof d.zoom === 'number' && Number.isFinite(d.zoom) ? d.zoom : 13.5,
      });
    };
    window.addEventListener('palto:go-cover-fly-to', onFlyTo as EventListener);
    return () => window.removeEventListener('palto:go-cover-fly-to', onFlyTo as EventListener);
  }, [isPaltoMapCover]);

  useEffect(() => {
    if (!isPaltoMapCover) return;
    const onPanelPickup = (evt: Event) => {
      const e = evt as CustomEvent<{ lng?: number; lat?: number; label?: string }>;
      const d = e.detail;
      if (!d) return;
      if (
        typeof d.lng === 'number' &&
        typeof d.lat === 'number' &&
        Number.isFinite(d.lng) &&
        Number.isFinite(d.lat)
      ) {
        setMapCoverPickup({ longitude: d.lng, latitude: d.lat });
        setMapCoverPickupLabel(typeof d.label === 'string' ? d.label.trim() : '');
      } else {
        setMapCoverPickup(null);
        setMapCoverPickupLabel('');
        setMapSelectedDestination(null);
        setMapDestinationLabel('');
        setMapRouteFeature(null);
      }
    };
    window.addEventListener('palto:go-cover-pickup-sync', onPanelPickup as EventListener);
    return () => window.removeEventListener('palto:go-cover-pickup-sync', onPanelPickup as EventListener);
  }, [isPaltoMapCover]);

  useEffect(() => {
    if (!isPaltoMapCover) return;
    const onPanelRoute = (evt: Event) => {
      const e = evt as CustomEvent<{ routeFeature?: Feature<LineString> | null }>;
      const d = e.detail;
      if (!d) return;
      if ('routeFeature' in d) setMapRouteFeature(d.routeFeature ?? null);
    };
    window.addEventListener('palto:go-cover-route-sync', onPanelRoute as EventListener);
    return () => window.removeEventListener('palto:go-cover-route-sync', onPanelRoute as EventListener);
  }, [isPaltoMapCover]);

  useEffect(() => {
    if (!isPaltoMapCover) return;
    const onPanelDestination = (evt: Event) => {
      const e = evt as CustomEvent<{ destination?: { longitude: number; latitude: number } | null }>;
      const d = e.detail;
      if (!d || !('destination' in d)) return;
      if (d.destination === null) {
        setMapSelectedDestination(null);
        setMapDestinationLabel('');
      } else if (
        d.destination &&
        typeof d.destination.longitude === 'number' &&
        typeof d.destination.latitude === 'number'
      ) {
        setMapSelectedDestination(d.destination);
      }
    };
    window.addEventListener('palto:go-cover-destination-sync', onPanelDestination as EventListener);
    return () => window.removeEventListener('palto:go-cover-destination-sync', onPanelDestination as EventListener);
  }, [isPaltoMapCover]);

  useEffect(() => {
    if (!isPaltoMapCover || !mapSelectedDestination || !mapToken) return;
    let cancelled = false;
    (async () => {
      try {
        const label =
          (await geocodeReverse(
            mapSelectedDestination.longitude,
            mapSelectedDestination.latitude,
            mapToken,
            { language }
          )) ?? reverseGeocodeDisplayFallback(language, 'destination');
        if (!cancelled) setMapDestinationLabel(label);
      } catch {
        if (!cancelled) {
          setMapDestinationLabel(reverseGeocodeDisplayFallback(language, 'destination'));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isPaltoMapCover, mapSelectedDestination, mapToken, language]);

  useEffect(() => {
    if (!isPaltoMapCover) return;
    const detail = {
      pickupText: mapCoverPickupLabel,
      pickupLng: mapCoverPickup?.longitude,
      pickupLat: mapCoverPickup?.latitude,
      destinationText: mapDestinationLabel,
      destinationLng: mapSelectedDestination?.longitude,
      destinationLat: mapSelectedDestination?.latitude,
      coordsText:
        mapSelectedDestination && mapDestinationLabel.trim()
          ? mapDestinationLabel
          : '',
      durationText: '',
      trafficDurationText: '',
    };
    window.dispatchEvent(new CustomEvent('palto:cover-map-update', { detail }));
  }, [
    isPaltoMapCover,
    mapCoverPickup,
    mapCoverPickupLabel,
    mapDestinationLabel,
    mapSelectedDestination,
  ]);

  const handleMapDestinationPick = useCallback(async (longitude: number, latitude: number) => {
    if (!mapToken) return;
    if (!isLngLatInsideReunionIsland(longitude, latitude)) return;
    try {
      const picked = await resolvePickOnRoad(mapToken, longitude, latitude, { searchRadiusMeters: 150 });
      const placeName =
        (await geocodeReverse(picked.longitude, picked.latitude, mapToken, { language })) ??
        reverseGeocodeDisplayFallback(language, mapCoverPickup === null ? 'pickup' : 'destination');

      if (mapCoverPickup === null) {
        setMapCoverPickup(picked);
        setMapCoverPickupLabel(placeName);
        setMapSelectedDestination(null);
        setMapDestinationLabel('');
        setMapRouteFeature(null);
        return;
      }

      setMapSelectedDestination(picked);
    } catch {
      // ignore sur clic invalide/réseau
    }
  }, [language, mapToken, mapCoverPickup]);

  return (
    <>
      <div 
        className={`project-cover-image-above ${coverFullscreenActive ? 'project-cover-fullscreen-expanded' : ''} ${isPaltoMapCover ? 'project-cover-image-above--map' : ''}`}
        style={{
          transform: `translateY(${swipeY}px)`,
          transition: swipeY === 0 ? 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)' : 'none'
        }}
      >
        {/* Overlay sombre : s'intensifie quand le panneau monte vers le haut */}
        {!isPaltoMapCover ? (
          <div
            className="project-cover-dark-overlay"
            style={{
              opacity: coverLiftProgress * 0.5,
              transition: 'opacity 0.15s ease-out'
            }}
            aria-hidden
          />
        ) : null}
        {isPaltoMapCover ? (
          <div className="project-cover-map" aria-label="Carte Go">
            <HomeMapboxBackground
              variant="fullscreen"
              flyToTarget={coverFlyToTarget}
              userOrigin={mapCoverPickup}
              selectedDestination={mapSelectedDestination}
              routeFeature={mapRouteFeature}
              onMapDestinationPick={handleMapDestinationPick}
            />
          </div>
        ) : (
          <Swiper
            modules={[Pagination, Autoplay]}
            pagination={{
              clickable: true,
              bulletClass: 'swiper-pagination-bullet-round',
              bulletActiveClass: 'swiper-pagination-bullet-active-round',
            }}
            autoplay={{
              delay: 5000,
              disableOnInteraction: false,
            }}
            loop={images.length > 1}
            className="project-cover-swiper"
          >
            {images.map((src, index) => {
              const isVideo = hasVideoExtension(src) || isMpAudioProject;
              
              return (
                <SwiperSlide key={index} className="project-cover-slide">
                  {isVideo ? (
                    <video 
                      src={src} 
                      autoPlay 
                      loop 
                      muted 
                      playsInline
                      className="project-cover-media"
                    />
                  ) : (
                    <img 
                      src={src} 
                      alt={`${projectName} - Image ${index + 1}`}
                      className="project-cover-media"
                    />
                  )}
                </SwiperSlide>
              );
            })}
          </Swiper>
        )}
      </div>

      {/* Icône fullscreen en bas à droite de l'image cover */}
      <div className="project-cover-fullscreen-trigger-layer" aria-hidden>
        <button
          type="button"
          className="project-cover-fullscreen-btn"
          onClick={openFullscreen}
          aria-label="Agrandir l'image"
          style={{ display: isPaltoMapCover ? 'none' : undefined }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          </svg>
        </button>
      </div>

      {/* Couche boutons au premier plan (z-index 2001) pour rester cliquables au scroll */}
      <div className="project-cover-buttons-layer">
        {onClose && (
          <Button
            type="button"
            variant="secondary"
            icon
            iconSize="medium"
            className={`project-cover-back-btn${
              hideCloseOnScroll ? ' project-cover-back-btn--scroll-hidden' : ''
            }`}
            onClick={onClose}
            aria-label="Retour"
            aria-hidden={hideCloseOnScroll ? true : undefined}
            tabIndex={hideCloseOnScroll ? -1 : undefined}
          >
            <ArrowLeft size={22} strokeWidth={2.25} aria-hidden />
          </Button>
        )}
        {(onPreviousProject || onNextProject) && (
          <div className="project-cover-nav-buttons">
            {onPreviousProject && (
              <button
                type="button"
                className="project-cover-switch-btn"
                onClick={onPreviousProject}
                aria-label="Projet précédent"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            )}
            {onNextProject && (
              <button
                type="button"
                className="project-cover-switch-btn"
                onClick={onNextProject}
                aria-label="Projet suivant"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal plein écran : image en grand avec carousel (flèches) */}
      {isFullscreenModalOpen && (
        <div
          className="project-cover-fullscreen-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Image de couverture en grand"
          onClick={(e) => e.target === e.currentTarget && closeFullscreen()}
        >
          {/* Bouton fermer en bas à droite (même position que le bouton fullscreen) */}
          <button
            type="button"
            className="project-cover-fullscreen-close project-cover-fullscreen-close-bottom"
            onClick={closeFullscreen}
            aria-label="Fermer"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          {images.length > 1 && (
            <button
              type="button"
              className="project-cover-fullscreen-arrow project-cover-fullscreen-arrow-prev"
              onClick={goPrev}
              aria-label="Image précédente"
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}
          <div className="project-cover-fullscreen-slide">
            {hasVideoExtension(images[fullscreenIndex]) || isMpAudioProject ? (
              <video
                src={images[fullscreenIndex]}
                autoPlay
                loop
                muted
                playsInline
                className="project-cover-fullscreen-media"
              />
            ) : (
              <img
                src={images[fullscreenIndex]}
                alt={`${projectName} - Image ${fullscreenIndex + 1}`}
                className="project-cover-fullscreen-media"
              />
            )}
          </div>
          {images.length > 1 && (
            <button
              type="button"
              className="project-cover-fullscreen-arrow project-cover-fullscreen-arrow-next"
              onClick={goNext}
              aria-label="Image suivante"
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          )}
          {images.length > 1 && (
            <span className="project-cover-fullscreen-counter" aria-live="polite">
              {fullscreenIndex + 1} / {images.length}
            </span>
          )}
        </div>
      )}
    </>
  );
};

export default ProjectCoverCarousel;
