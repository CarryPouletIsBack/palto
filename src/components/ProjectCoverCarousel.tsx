import { useMemo } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import './ProjectCoverCarousel.css';

interface ProjectCoverCarouselProps {
  coverImage: string;
  projectName: string;
  swipeY?: number;
  onClose?: () => void;
  onPreviousProject?: () => void;
  onNextProject?: () => void;
}

const ProjectCoverCarousel: React.FC<ProjectCoverCarouselProps> = ({ coverImage, projectName, swipeY = 0, onClose, onPreviousProject, onNextProject }) => {
  // Dupliquer l'image pour tester le carousel
  const images = useMemo(() => {
    // Dupliquer l'image 3 fois pour tester le carousel
    return [coverImage, coverImage, coverImage];
  }, [coverImage, projectName]);

  const hasVideoExtension = (src: string) => /\.(mp4|webm|mov|avi|mkv)$/i.test(src);
  const isMpAudioProject = projectName.toLowerCase().includes('mp audio');

  return (
    <>
      <div 
        className="project-cover-image-above"
        style={{
          transform: `translateY(${swipeY}px)`,
          transition: swipeY === 0 ? 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)' : 'none'
        }}
      >
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
      </div>

      {/* Couche boutons au premier plan (z-index 2001) pour rester cliquables au scroll */}
      <div className="project-cover-buttons-layer">
        {onClose && (
          <button
            type="button"
            className="project-cover-close-btn"
            onClick={onClose}
            aria-label="Fermer"
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
    </>
  );
};

export default ProjectCoverCarousel;
