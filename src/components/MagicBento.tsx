/**
 * Magic Bento — React Bits (https://reactbits.dev)
 * Variante « imageItems » pour la section Design system Playdago (grille de captures).
 * Mode « shell » : si `children` est fourni sans tuiles (`imageItems` vide), rendu wrapper
 * pour la barre de recherche (MobileSearchBar / Header) — classes `.magic-bento` dans MagicBento.css.
 */
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import './MagicBento.css';

export interface MagicBentoImageItem {
  /** Image (ignoré si `content` est défini) */
  src?: string;
  alt?: string;
  /** Court libellé sur tuile image, ou en-tête au-dessus du `content` */
  label?: string;
  /** Remplace l’image (ex. tableau palette / typescale) */
  content?: React.ReactNode;
  /** Si true, pas de calque image (pas de `.magic-bento-media-frame` / `<img>`) — la tuile garde sa place dans la grille */
  hideMediaFrame?: boolean;
}

export interface BentoProps {
  textAutoHide?: boolean;
  enableStars?: boolean;
  enableSpotlight?: boolean;
  enableBorderGlow?: boolean;
  disableAnimations?: boolean;
  spotlightRadius?: number;
  particleCount?: number;
  enableTilt?: boolean;
  glowColor?: string;
  clickEffect?: boolean;
  enableMagnetism?: boolean;
}

export interface MagicBentoProps extends BentoProps {
  /** Tuiles du bento (Playdago design system). Ignoré en mode shell si `children` est fourni. */
  imageItems?: MagicBentoImageItem[];
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

const DEFAULT_PARTICLE_COUNT = 12;
const DEFAULT_SPOTLIGHT_RADIUS = 300;
const DEFAULT_GLOW_COLOR = '241, 88, 42';
const MOBILE_BREAKPOINT = 768;

const createParticleElement = (x: number, y: number, color: string = DEFAULT_GLOW_COLOR): HTMLDivElement => {
  const el = document.createElement('div');
  el.className = 'particle';
  el.style.cssText = `
    position: absolute;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: rgba(${color}, 1);
    box-shadow: 0 0 6px rgba(${color}, 0.6);
    pointer-events: none;
    z-index: 100;
    left: ${x}px;
    top: ${y}px;
  `;
  return el;
};

const calculateSpotlightValues = (radius: number) => ({
  proximity: radius * 0.5,
  fadeDistance: radius * 0.75,
});

const updateCardGlowProperties = (card: HTMLElement, mouseX: number, mouseY: number, glow: number, radius: number) => {
  const rect = card.getBoundingClientRect();
  const relativeX = ((mouseX - rect.left) / rect.width) * 100;
  const relativeY = ((mouseY - rect.top) / rect.height) * 100;

  card.style.setProperty('--glow-x', `${relativeX}%`);
  card.style.setProperty('--glow-y', `${relativeY}%`);
  card.style.setProperty('--glow-intensity', glow.toString());
  card.style.setProperty('--glow-radius', `${radius}px`);
};

const ParticleCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  disableAnimations?: boolean;
  style?: React.CSSProperties;
  particleCount?: number;
  glowColor?: string;
  enableTilt?: boolean;
  clickEffect?: boolean;
  enableMagnetism?: boolean;
}> = ({
  children,
  className = '',
  disableAnimations = false,
  style,
  particleCount = DEFAULT_PARTICLE_COUNT,
  glowColor = DEFAULT_GLOW_COLOR,
  enableTilt = true,
  clickEffect = false,
  enableMagnetism = false,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement[]>([]);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const isHoveredRef = useRef(false);
  const memoizedParticles = useRef<HTMLDivElement[]>([]);
  const particlesInitialized = useRef(false);
  const magnetismAnimationRef = useRef<gsap.core.Tween | null>(null);

  const initializeParticles = useCallback(() => {
    if (particlesInitialized.current || !cardRef.current) return;

    const { width, height } = cardRef.current.getBoundingClientRect();
    memoizedParticles.current = Array.from({ length: particleCount }, () =>
      createParticleElement(Math.random() * width, Math.random() * height, glowColor)
    );
    particlesInitialized.current = true;
  }, [particleCount, glowColor]);

  const clearAllParticles = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    magnetismAnimationRef.current?.kill();

    particlesRef.current.forEach((particle) => {
      gsap.to(particle, {
        scale: 0,
        opacity: 0,
        duration: 0.3,
        ease: 'back.in(1.7)',
        onComplete: () => {
          particle.parentNode?.removeChild(particle);
        },
      });
    });
    particlesRef.current = [];
  }, []);

  const animateParticles = useCallback(() => {
    if (!cardRef.current || !isHoveredRef.current) return;

    if (!particlesInitialized.current) {
      initializeParticles();
    }

    memoizedParticles.current.forEach((particle, index) => {
      const timeoutId = setTimeout(() => {
        if (!isHoveredRef.current || !cardRef.current) return;

        const clone = particle.cloneNode(true) as HTMLDivElement;
        cardRef.current.appendChild(clone);
        particlesRef.current.push(clone);

        gsap.fromTo(clone, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.7)' });

        gsap.to(clone, {
          x: (Math.random() - 0.5) * 100,
          y: (Math.random() - 0.5) * 100,
          rotation: Math.random() * 360,
          duration: 2 + Math.random() * 2,
          ease: 'none',
          repeat: -1,
          yoyo: true,
        });

        gsap.to(clone, {
          opacity: 0.3,
          duration: 1.5,
          ease: 'power2.inOut',
          repeat: -1,
          yoyo: true,
        });
      }, index * 100);

      timeoutsRef.current.push(timeoutId);
    });
  }, [initializeParticles]);

  useEffect(() => {
    if (disableAnimations || !cardRef.current) return;

    const element = cardRef.current;

    const handleMouseEnter = () => {
      isHoveredRef.current = true;
      animateParticles();

      if (enableTilt) {
        gsap.to(element, {
          rotateX: 5,
          rotateY: 5,
          duration: 0.3,
          ease: 'power2.out',
          transformPerspective: 1000,
        });
      }
    };

    const handleMouseLeave = () => {
      isHoveredRef.current = false;
      clearAllParticles();

      if (enableTilt) {
        gsap.to(element, {
          rotateX: 0,
          rotateY: 0,
          duration: 0.3,
          ease: 'power2.out',
        });
      }

      if (enableMagnetism) {
        gsap.to(element, {
          x: 0,
          y: 0,
          duration: 0.3,
          ease: 'power2.out',
        });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!enableTilt && !enableMagnetism) return;

      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      if (enableTilt) {
        const rotateX = ((y - centerY) / centerY) * -10;
        const rotateY = ((x - centerX) / centerX) * 10;

        gsap.to(element, {
          rotateX,
          rotateY,
          duration: 0.1,
          ease: 'power2.out',
          transformPerspective: 1000,
        });
      }

      if (enableMagnetism) {
        const magnetX = (x - centerX) * 0.05;
        const magnetY = (y - centerY) * 0.05;

        magnetismAnimationRef.current = gsap.to(element, {
          x: magnetX,
          y: magnetY,
          duration: 0.3,
          ease: 'power2.out',
        });
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (!clickEffect) return;

      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const maxDistance = Math.max(
        Math.hypot(x, y),
        Math.hypot(x - rect.width, y),
        Math.hypot(x, y - rect.height),
        Math.hypot(x - rect.width, y - rect.height)
      );

      const ripple = document.createElement('div');
      ripple.style.cssText = `
        position: absolute;
        width: ${maxDistance * 2}px;
        height: ${maxDistance * 2}px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(${glowColor}, 0.4) 0%, rgba(${glowColor}, 0.2) 30%, transparent 70%);
        left: ${x - maxDistance}px;
        top: ${y - maxDistance}px;
        pointer-events: none;
        z-index: 1000;
      `;

      element.appendChild(ripple);

      gsap.fromTo(
        ripple,
        { scale: 0, opacity: 1 },
        {
          scale: 1,
          opacity: 0,
          duration: 0.8,
          ease: 'power2.out',
          onComplete: () => ripple.remove(),
        }
      );
    };

    element.addEventListener('mouseenter', handleMouseEnter);
    element.addEventListener('mouseleave', handleMouseLeave);
    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('click', handleClick);

    return () => {
      isHoveredRef.current = false;
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mouseleave', handleMouseLeave);
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('click', handleClick);
      clearAllParticles();
    };
  }, [animateParticles, clearAllParticles, disableAnimations, enableTilt, enableMagnetism, clickEffect, glowColor]);

  return (
    <div
      ref={cardRef}
      className={`${className} relative overflow-hidden`}
      style={{ ...style, position: 'relative', overflow: 'hidden' }}
    >
      {children}
    </div>
  );
};

const GlobalSpotlight: React.FC<{
  gridRef: React.RefObject<HTMLDivElement | null>;
  disableAnimations?: boolean;
  enabled?: boolean;
  spotlightRadius?: number;
  glowColor?: string;
}> = ({
  gridRef,
  disableAnimations = false,
  enabled = true,
  spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS,
  glowColor = DEFAULT_GLOW_COLOR,
}) => {
  const spotlightRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (disableAnimations || !gridRef?.current || !enabled) return;

    const spotlight = document.createElement('div');
    spotlight.className = 'magic-bento-global-spotlight';
    spotlight.style.cssText = `
      position: fixed;
      width: 800px;
      height: 800px;
      border-radius: 50%;
      pointer-events: none;
      background: radial-gradient(circle,
        rgba(${glowColor}, 0.15) 0%,
        rgba(${glowColor}, 0.08) 15%,
        rgba(${glowColor}, 0.04) 25%,
        rgba(${glowColor}, 0.02) 40%,
        rgba(${glowColor}, 0.01) 65%,
        transparent 70%
      );
      z-index: 200;
      opacity: 0;
      transform: translate(-50%, -50%);
      mix-blend-mode: screen;
    `;
    document.body.appendChild(spotlight);
    spotlightRef.current = spotlight;

    const handleMouseMove = (e: MouseEvent) => {
      if (!spotlightRef.current || !gridRef.current) return;

      const section = gridRef.current.closest('.magic-bento-section');
      const rect = section?.getBoundingClientRect();
      const mouseInside =
        rect && e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;

      const cards = gridRef.current.querySelectorAll('.magic-bento-card');

      if (!mouseInside) {
        gsap.to(spotlightRef.current, { opacity: 0, duration: 0.3, ease: 'power2.out' });
        cards.forEach((card) => {
          (card as HTMLElement).style.setProperty('--glow-intensity', '0');
        });
        return;
      }

      const { proximity, fadeDistance } = calculateSpotlightValues(spotlightRadius);
      let minDistance = Infinity;

      cards.forEach((card) => {
        const cardElement = card as HTMLElement;
        const cardRect = cardElement.getBoundingClientRect();
        const centerX = cardRect.left + cardRect.width / 2;
        const centerY = cardRect.top + cardRect.height / 2;
        const distance =
          Math.hypot(e.clientX - centerX, e.clientY - centerY) - Math.max(cardRect.width, cardRect.height) / 2;
        const effectiveDistance = Math.max(0, distance);

        minDistance = Math.min(minDistance, effectiveDistance);

        let glowIntensity = 0;
        if (effectiveDistance <= proximity) {
          glowIntensity = 1;
        } else if (effectiveDistance <= fadeDistance) {
          glowIntensity = (fadeDistance - effectiveDistance) / (fadeDistance - proximity);
        }

        updateCardGlowProperties(cardElement, e.clientX, e.clientY, glowIntensity, spotlightRadius);
      });

      gsap.to(spotlightRef.current, {
        left: e.clientX,
        top: e.clientY,
        duration: 0.1,
        ease: 'power2.out',
      });

      const targetOpacity =
        minDistance <= proximity
          ? 0.8
          : minDistance <= fadeDistance
            ? ((fadeDistance - minDistance) / (fadeDistance - proximity)) * 0.8
            : 0;

      gsap.to(spotlightRef.current, {
        opacity: targetOpacity,
        duration: targetOpacity > 0 ? 0.2 : 0.5,
        ease: 'power2.out',
      });
    };

    const handleMouseLeave = () => {
      gridRef.current?.querySelectorAll('.magic-bento-card').forEach((card) => {
        (card as HTMLElement).style.setProperty('--glow-intensity', '0');
      });
      if (spotlightRef.current) {
        gsap.to(spotlightRef.current, { opacity: 0, duration: 0.3, ease: 'power2.out' });
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      spotlightRef.current?.parentNode?.removeChild(spotlightRef.current);
    };
  }, [gridRef, disableAnimations, enabled, spotlightRadius, glowColor]);

  return null;
};

const useMobileDetection = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

/** Wrapper léger pour la search bar (souris → variables CSS --mouse-x / --mouse-y). */
const MagicBentoSearchShell: React.FC<{
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ className = '', style, children }) => {
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      el.style.setProperty('--mouse-x', `${((e.clientX - rect.left) / rect.width) * 100}%`);
      el.style.setProperty('--mouse-y', `${((e.clientY - rect.top) / rect.height) * 100}%`);
    };
    el.addEventListener('mousemove', onMove);
    return () => el.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <div ref={shellRef} className={`magic-bento ${className}`.trim()} style={style}>
      {children}
    </div>
  );
};

const MagicBento: React.FC<MagicBentoProps> = ({
  imageItems = [],
  children,
  className = '',
  style,
  textAutoHide = true,
  enableStars = false,
  enableSpotlight = false,
  enableBorderGlow = false,
  disableAnimations = false,
  spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS,
  particleCount = DEFAULT_PARTICLE_COUNT,
  enableTilt = false,
  glowColor = DEFAULT_GLOW_COLOR,
  clickEffect = false,
  enableMagnetism = false,
}) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const isMobile = useMobileDetection();
  const shouldDisableAnimations = disableAnimations || isMobile;

  const shellMode = imageItems.length === 0 && children != null;
  if (shellMode) {
    return (
      <MagicBentoSearchShell className={className} style={style}>
        {children}
      </MagicBentoSearchShell>
    );
  }

  if (!imageItems.length) return null;

  return (
    <div className={`w-full min-w-0 max-w-none ${className}`.trim()}>
      <style>
        {`
          .magic-bento-section {
            --glow-x: 50%;
            --glow-y: 50%;
            --glow-intensity: 0;
            --glow-radius: 200px;
            --glow-color: ${glowColor};
            --border-color: rgba(0, 0, 0, 0.12);
            --background-dark: #0a0a0c;
            --white: hsl(0, 0%, 100%);
            container-type: inline-size;
            container-name: magic-bento;
            width: 100%;
            max-width: 100%;
            min-width: 0;
          }
          /* Grille toujours dans l’écran : 4 colonnes en 1fr, hauteurs liées à la largeur du bloc (cqi) */
          .magic-bento-viewport {
            width: 100%;
            max-width: 100%;
            min-width: 0;
            overflow: visible;
          }
          .magic-bento-image-grid {
            display: grid;
            gap: clamp(4px, 0.35vw, 10px);
            width: 100%;
            max-width: 100%;
            min-width: 0;
            margin: 0;
            padding: clamp(4px, 0.35vw, 10px);
            box-sizing: border-box;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            grid-template-rows:
              minmax(clamp(72px, 4.5vw, 220px), auto)
              minmax(clamp(72px, 4.5vw, 220px), auto)
              minmax(clamp(72px, 4.5vw, 220px), auto);
            gap: clamp(4px, 1.5cqi, 10px);
            padding: clamp(4px, 1.5cqi, 10px);
            grid-template-rows:
              minmax(clamp(72px, 22cqi, 220px), auto)
              minmax(clamp(72px, 22cqi, 220px), auto)
              minmax(clamp(72px, 22cqi, 220px), auto);
          }
          /* Tuiles image : carré (ratio 1:1) — le repère en flux évite l’effondrement (img en absolute) */
          .magic-bento-card--media {
            width: 100%;
            min-width: 0;
            overflow: hidden;
            isolation: isolate;
          }
          .magic-bento-media-frame {
            overflow: hidden;
            border-radius: inherit;
          }
          .magic-bento-media-frame img {
            width: 100%;
            height: 100%;
            max-width: 100%;
            max-height: 100%;
            object-fit: cover;
            object-position: center;
            display: block;
          }
          .magic-bento-media-sizehold {
            width: 100%;
            aspect-ratio: 1 / 1;
            flex-shrink: 0;
            visibility: hidden;
            pointer-events: none;
          }
          .magic-bento-image-grid--5 .magic-bento-card--content:nth-child(1) {
            min-height: 200px;
          }
          .magic-bento-image-grid--5 .magic-bento-card--content:nth-child(3) {
            min-height: 200px;
          }
          .magic-bento-image-grid--6 .magic-bento-card--content {
            min-height: 0;
          }
          /* Bento 6 : mêmes proportions, hauteur qui suit la largeur (pas de débordement écran) */
          .magic-bento-image-grid.magic-bento-image-grid--6 {
            grid-template-rows:
              minmax(clamp(56px, 3.8vw, 200px), clamp(72px, 4.6vw, 200px))
              minmax(clamp(56px, 3.8vw, 200px), clamp(72px, 4.6vw, 200px))
              minmax(clamp(56px, 3.8vw, 200px), clamp(72px, 4.6vw, 200px));
            grid-template-rows:
              minmax(clamp(56px, 18cqi, 200px), clamp(72px, 22cqi, 200px))
              minmax(clamp(56px, 18cqi, 200px), clamp(72px, 22cqi, 200px))
              minmax(clamp(56px, 18cqi, 200px), clamp(72px, 22cqi, 200px));
          }
          .magic-bento-image-grid--6 > .magic-bento-card {
            min-height: 0;
          }
          .magic-bento-image-grid--6 .magic-bento-card--media {
            height: 100%;
            align-self: stretch;
          }
          .magic-bento-image-grid--6 .magic-bento-card--media .magic-bento-media-sizehold {
            flex: 0 0 0;
            width: 0;
            height: 0;
            min-height: 0;
            aspect-ratio: unset;
            padding: 0;
            margin: 0;
            overflow: hidden;
          }
          .magic-bento-image-grid--6 .magic-bento-card--content {
            height: 100%;
            min-height: 0;
          }
          /* Grille par défaut (4 tuiles) et variante 5 tuiles : 1–3 identiques */
          .magic-bento-image-grid:not(.magic-bento-image-grid--6) .magic-bento-card:nth-child(1) {
            grid-column: 1 / 3;
            grid-row: 1 / 3;
          }
          .magic-bento-image-grid:not(.magic-bento-image-grid--6) .magic-bento-card:nth-child(2) {
            grid-column: 3 / 5;
            grid-row: 1 / 2;
          }
          .magic-bento-image-grid:not(.magic-bento-image-grid--6) .magic-bento-card:nth-child(3) {
            grid-column: 3 / 5;
            grid-row: 2 / 3;
          }
          .magic-bento-image-grid:not(.magic-bento-image-grid--5):not(.magic-bento-image-grid--6) .magic-bento-card:nth-child(4) {
            grid-column: 1 / 5;
            grid-row: 3 / 4;
          }
          .magic-bento-image-grid--5 .magic-bento-card:nth-child(4) {
            grid-column: 1 / 3;
            grid-row: 3 / 4;
          }
          .magic-bento-image-grid--5 .magic-bento-card:nth-child(5) {
            grid-column: 3 / 5;
            grid-row: 3 / 4;
          }
          /* Bento 6 : 4×3 — même disposition sur tous les écrans */
          .magic-bento-image-grid--6 .magic-bento-card:nth-child(1) {
            grid-column: 1 / 2;
            grid-row: 1 / 2;
          }
          .magic-bento-image-grid--6 .magic-bento-card:nth-child(2) {
            grid-column: 2 / 3;
            grid-row: 1 / 2;
          }
          .magic-bento-image-grid--6 .magic-bento-card:nth-child(3) {
            grid-column: 3 / 5;
            grid-row: 1 / 3;
          }
          .magic-bento-image-grid--6 .magic-bento-card:nth-child(4) {
            grid-column: 1 / 3;
            grid-row: 2 / 4;
          }
          .magic-bento-image-grid--6 .magic-bento-card:nth-child(5) {
            grid-column: 3 / 4;
            grid-row: 3 / 4;
          }
          .magic-bento-image-grid--6 .magic-bento-card:nth-child(6) {
            grid-column: 4 / 5;
            grid-row: 3 / 4;
          }
          .magic-bento-card--border-glow::after {
            content: '';
            position: absolute;
            inset: 0;
            padding: 6px;
            background: radial-gradient(var(--glow-radius) circle at var(--glow-x) var(--glow-y),
                rgba(${glowColor}, calc(var(--glow-intensity) * 0.8)) 0%,
                rgba(${glowColor}, calc(var(--glow-intensity) * 0.4)) 30%,
                transparent 60%);
            border-radius: inherit;
            -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: xor;
            mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            mask-composite: exclude;
            pointer-events: none;
            z-index: 3;
          }
          .particle::before {
            content: '';
            position: absolute;
            top: -2px;
            left: -2px;
            right: -2px;
            bottom: -2px;
            background: rgba(${glowColor}, 0.2);
            border-radius: 50%;
            z-index: -1;
          }
          .magic-bento-text-clamp-1 {
            display: -webkit-box;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 1;
            line-clamp: 1;
            overflow: hidden;
            text-overflow: ellipsis;
          }
        `}
      </style>

      {enableSpotlight && (
        <GlobalSpotlight
          gridRef={gridRef}
          disableAnimations={shouldDisableAnimations}
          enabled={enableSpotlight}
          spotlightRadius={spotlightRadius}
          glowColor={glowColor}
        />
      )}

      <div className="magic-bento-viewport">
        <div
          ref={gridRef}
          className="magic-bento-section w-full max-w-none min-w-0 select-none relative"
          style={{ fontSize: 'clamp(0.875rem, 0.85rem + 0.35vw, 1rem)' }}
        >
          <div
            className={`magic-bento-image-grid${
              imageItems.length === 5 ? ' magic-bento-image-grid--5' : ''
            }${imageItems.length === 6 ? ' magic-bento-image-grid--6' : ''}`}
          >
          {imageItems.map((item, index) => {
            const hasContent = item.content != null;
            const baseClassName = `magic-bento-card flex flex-col justify-between relative w-full max-w-full rounded-xl border border-solid font-light overflow-hidden ${
              enableBorderGlow ? 'magic-bento-card--border-glow' : ''
            } ${hasContent ? 'magic-bento-card--content' : 'magic-bento-card--media'}`;

            const cardStyle = {
              backgroundColor: hasContent ? 'var(--sp-surface, #fafafa)' : 'var(--background-dark)',
              borderColor: hasContent ? 'var(--sp-border, rgba(0, 0, 0, 0.12))' : 'var(--border-color)',
              color: hasContent ? 'var(--sp-text, #1c1c1c)' : 'var(--white)',
              '--glow-x': '50%',
              '--glow-y': '50%',
              '--glow-intensity': '0',
              '--glow-radius': '200px',
            } as React.CSSProperties;

            const inner = hasContent ? (
              <>
                {item.label ? (
                  <div className="relative z-[2] flex shrink-0 justify-between items-start gap-2 px-3 pt-3 pb-1 text-[var(--sp-text,#1c1c1c)] border-b border-[var(--sp-border,rgba(0,0,0,0.08))]">
                    <span
                      className={`font-mono text-[11px] uppercase tracking-widest font-semibold opacity-90 ${
                        textAutoHide ? 'magic-bento-text-clamp-1' : ''
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>
                ) : null}
                <div className="magic-bento-cell--content relative z-[1] flex flex-col flex-1 min-h-0 min-w-0 w-full overflow-auto p-2 sm:p-3 text-[var(--sp-text,#1c1c1c)]">
                  {item.content}
                </div>
              </>
            ) : (
              <>
                <div className="magic-bento-media-sizehold" aria-hidden />
                {!item.hideMediaFrame ? (
                  <div className="magic-bento-media-frame absolute inset-0 z-0">
                    <img
                      src={item.src ?? ''}
                      alt={item.alt ?? ''}
                      className="pointer-events-none"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                ) : null}
                <div className="absolute inset-0 z-[1] pointer-events-none bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                {item.label ? (
                  <div className="relative z-[2] flex justify-between items-start gap-3 p-4 text-white">
                    <span
                      className={`font-mono text-xs uppercase tracking-widest opacity-95 drop-shadow-md ${
                        textAutoHide ? 'magic-bento-text-clamp-1' : ''
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>
                ) : null}
              </>
            );

            const cellKey = `bento-cell-${index}`;

            if (enableStars) {
              return (
                <ParticleCard
                  key={cellKey}
                  className={baseClassName}
                  style={cardStyle}
                  disableAnimations={shouldDisableAnimations}
                  particleCount={particleCount}
                  glowColor={glowColor}
                  enableTilt={enableTilt}
                  clickEffect={clickEffect}
                  enableMagnetism={enableMagnetism}
                >
                  {inner}
                </ParticleCard>
              );
            }

            return (
              <div key={cellKey} className={baseClassName} style={cardStyle}>
                {inner}
              </div>
            );
          })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MagicBento;
