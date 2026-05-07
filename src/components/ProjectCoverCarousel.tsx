import { useMemo, useState, useCallback, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Autoplay } from 'swiper/modules';
import type { Feature, LineString } from 'geojson';
import 'swiper/css';
import 'swiper/css/pagination';
import './ProjectCoverCarousel.css';
import HomeMapboxBackground from './HomeMapboxBackground';
import { DEFAULT_USER_ORIGIN } from '../constants/defaultUserOrigin';
import { fetchDrivingRouteFeature } from '../services/mapboxDirections';
import { snapLngLatToMapboxDriving } from '../services/mapboxSnapToRoad';
import { isLngLatInsideReunionIsland } from '../constants/reunionIsland';
import { geocodeReverse } from '../services/mapboxGeocoding';

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
  const [fullscreenIndex, setFullscreenIndex] = useState(0);
  const [mapSelectedDestination, setMapSelectedDestination] = useState<{ longitude: number; latitude: number } | null>(null);
  const [mapRouteFeature, setMapRouteFeature] = useState<Feature<LineString> | null>(null);
  const [mapDestinationLabel, setMapDestinationLabel] = useState('');
  const [mapRouteDurationLabel, setMapRouteDurationLabel] = useState('');
  const [mapRouteTrafficDurationLabel, setMapRouteTrafficDurationLabel] = useState('');

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
    if (!isPaltoMapCover) return;
    if (!mapToken || !mapSelectedDestination) {
      setMapRouteFeature(null);
      setMapRouteDurationLabel('');
      setMapRouteTrafficDurationLabel('');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const feature = await fetchDrivingRouteFeature(mapToken, DEFAULT_USER_ORIGIN, mapSelectedDestination);
        if (!cancelled) {
          setMapRouteFeature(feature);
          const durationSeconds =
            feature &&
            feature.properties &&
            typeof (feature.properties as { durationSeconds?: unknown }).durationSeconds === 'number'
              ? ((feature.properties as { durationSeconds: number }).durationSeconds)
              : null;
          const durationTrafficSeconds =
            feature &&
            feature.properties &&
            typeof (feature.properties as { durationTrafficSeconds?: unknown }).durationTrafficSeconds === 'number'
              ? ((feature.properties as { durationTrafficSeconds: number }).durationTrafficSeconds)
              : null;
          setMapRouteDurationLabel(
            durationSeconds && Number.isFinite(durationSeconds)
              ? `~${Math.max(1, Math.round(durationSeconds / 60))} min`
              : ''
          );
          setMapRouteTrafficDurationLabel(
            durationTrafficSeconds && Number.isFinite(durationTrafficSeconds)
              ? `~${Math.max(1, Math.round(durationTrafficSeconds / 60))} min`
              : ''
          );
        }
      } catch {
        if (!cancelled) {
          setMapRouteFeature(null);
          setMapRouteDurationLabel('');
          setMapRouteTrafficDurationLabel('');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isPaltoMapCover, mapToken, mapSelectedDestination]);

  useEffect(() => {
    if (!isPaltoMapCover || !mapSelectedDestination || !mapToken) return;
    let cancelled = false;
    (async () => {
      try {
        const label =
          (await geocodeReverse(mapSelectedDestination.longitude, mapSelectedDestination.latitude, mapToken, { language: 'fr' })) ??
          `${mapSelectedDestination.latitude.toFixed(4)}, ${mapSelectedDestination.longitude.toFixed(4)}`;
        if (!cancelled) setMapDestinationLabel(label);
      } catch {
        if (!cancelled) {
          setMapDestinationLabel(
            `${mapSelectedDestination.latitude.toFixed(4)}, ${mapSelectedDestination.longitude.toFixed(4)}`
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isPaltoMapCover, mapSelectedDestination, mapToken]);

  useEffect(() => {
    if (!isPaltoMapCover) return;
    const detail = {
      destinationText: mapDestinationLabel,
      coordsText: mapSelectedDestination
        ? `${mapSelectedDestination.latitude.toFixed(4)}, ${mapSelectedDestination.longitude.toFixed(4)}`
        : '',
      durationText: mapRouteDurationLabel,
      trafficDurationText: mapRouteTrafficDurationLabel,
    };
    window.dispatchEvent(new CustomEvent('palto:cover-map-update', { detail }));
  }, [
    isPaltoMapCover,
    mapDestinationLabel,
    mapSelectedDestination,
    mapRouteDurationLabel,
    mapRouteTrafficDurationLabel,
  ]);

  const handleMapDestinationPick = useCallback(async (longitude: number, latitude: number) => {
    if (!mapToken) return;
    if (!isLngLatInsideReunionIsland(longitude, latitude)) return;
    try {
      const snapped = await snapLngLatToMapboxDriving(mapToken, longitude, latitude, { searchRadiusMeters: 75 });
      if (!snapped) return;
      setMapSelectedDestination(snapped);
    } catch {
      // ignore sur clic invalide/réseau
    }
  }, [mapToken]);

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
              userOrigin={null}
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
          <button
            type="button"
            className={`project-cover-close-btn${hideCloseOnScroll ? ' project-cover-close-btn--scroll-hidden' : ''}`}
            onClick={onClose}
            aria-label="Fermer"
            aria-hidden={hideCloseOnScroll}
            tabIndex={hideCloseOnScroll ? -1 : undefined}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
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
