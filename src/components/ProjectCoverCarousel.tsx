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
}

const ProjectCoverCarousel: React.FC<ProjectCoverCarouselProps> = ({ coverImage, projectName, swipeY = 0 }) => {
  // Dupliquer l'image pour tester le carousel
  const images = useMemo(() => {
    // Dupliquer l'image 3 fois pour tester le carousel
    return [coverImage, coverImage, coverImage];
  }, [coverImage, projectName]);

  const hasVideoExtension = (src: string) => /\.(mp4|webm|mov|avi|mkv)$/i.test(src);
  const isMpAudioProject = projectName.toLowerCase().includes('mp audio');

  return (
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
  );
};

export default ProjectCoverCarousel;
