import { useState, useRef, useEffect, useMemo, useCallback, type FC, type MouseEvent, type TouchEvent } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { trackEvent } from '../services/googleAnalyticsTracking';
import { motion, useMotionValue } from 'framer-motion';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import './SingleProject.css';
import { type ProjectData } from '../data/projectsNew';
import BlurText from './BlurText';
import DonutChartRace from './DonutChartRace';
import PositionnementMatrixChart from './PositionnementMatrixChart';
import UserFlowChart from './UserFlowChart';
import Button from './Button';
import ContactModal from './ContactModal';

// Constantes en dehors du composant pour éviter les re-créations
const CLOSE_THRESHOLD = 100;

// Import des icônes SVG
import searchIconBlue from '../assets/4610de4ae01e3b351bbcba9c930287159bbda981.svg'
import searchIconWhite from '../assets/90ec6f610076fb768a47e2428a1538d04533d860.svg'
import filterIconBlue from '../assets/bde286e6c3f17f2b7616efd3cb0505db16cb2c80.svg'
import filterIconWhite from '../assets/d64646fec8e22fb6cc43fff0865f1aed605ce1db.svg'
import expandIconBlue from '../assets/0663ecdf0b920b6cf763604a0f82d6820aa79455.svg'
import expandIconWhite from '../assets/fd72e19660aeb34b38d4c1d978e7c4eb2c18625d.svg'
import penIconBlue from '../assets/263f9c29cac74d7682e3473ce21888bd06efd26b.svg'
import penIconWhite from '../assets/ad0941a6384370c3132550cf8e7b080872bf8c70.svg'
import bellIconBlue from '../assets/098befb8181ea6bad4360e3d71f1968d62a269ab.svg'
import bellIconWhite from '../assets/c5bca19bef4558c083d96fdc742e2d8e9f4a9d4c.svg'
import dashboardIconBlue from '../assets/a7ca5d8579da186571215f0d46b524b056c90c10.svg'
import dashboardIconWhite from '../assets/96565d943652d5bf44ea725b8aa77fe03479a74a.svg'
import clientIconBlue from '../assets/5920fd75dd2c6e76db991a9b942e996b1c710f0e.svg'
import laboratoireIconBlue from '../assets/4cdaeeb22fdcbf2d5c03c0c40e4bfa84e3124cc1.svg'
import laboratoireIconWhite from '../assets/43ff308b7a1db138e79250570a476d75f810d253.svg'
import dashboardIconNewBlue from '../assets/b710cf10aac89b656f43227be944d998471a6343.svg'
import dashboardIconNewWhite from '../assets/2132bf0ef9c4bc9f146dda1255d5e7d49b16171f.svg'
import contactIconBlue from '../assets/6319879794d05613192a650b6c2fff239e7a7ad1.svg'
import contactIconWhite from '../assets/d98522e79f209b17064ab4de482c788242183e6c.svg'
import formationIconBlue from '../assets/44168eca3dd85916f934d8ab1b7b41967aff31f4.svg'
import formationIconWhite from '../assets/93d42323f5ac3dc5fadde5c92e8d5135e38d2981.svg'
import boutiqueIconBlue from '../assets/9dc5c3ec76d7852c81cd48b560b25b52336544c2.svg'
import boutiqueIconWhite from '../assets/3bea835efaa0ca18d639afff7d53d9069da477c0.svg'
/** Base URL pour les assets (public/) – respecte base en prod si défini) */
const assetBase = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') + '/';

/** URLs des images du carrousel Audit (public/single-project/) */
const AUDIT_CAROUSEL_IMAGES = [
  { src: `${assetBase}single-project/16399a4e-f4ad-465b-beb3-98b56cc27f6b.png`, alt: 'Audit – veille UX/UI 1' },
  { src: `${assetBase}single-project/f6437219-c377-476d-820c-a6d2a5f9fabd.png`, alt: 'Audit – veille UX/UI 2' },
  { src: `${assetBase}single-project/f6a7cf16-6dd5-4dee-9cb5-9231547be2f4.png`, alt: 'Audit – veille UX/UI 3' },
] as const;

/** URLs des images du carrousel Expérience Utilisateur Finale (même carousel que Audit) */
const EXPERIENCE_CAROUSEL_IMAGES = [
  { src: `${assetBase}single-project/598cf848-fdb1-464a-ab89-0063ee1035a3.png`, alt: 'Expérience 1' },
  { src: `${assetBase}single-project/0a6760e8-d76a-4d0e-b311-9d2d1f65e33a.png`, alt: 'Expérience 2' },
  { src: `${assetBase}single-project/a6e3eda5-8a3b-4755-98c0-e1158e9765c5.png`, alt: 'Expérience 3' },
] as const;

interface SingleProjectProps {
  projectData: ProjectData;
  onBackClick: () => void;
  coverImage?: string | null;
  projectCategory?: string | null;
  onSwipeYChange?: (y: number) => void;
  coverFullscreenActive?: boolean;
}

const SingleProjectNew: FC<SingleProjectProps> = ({ projectData, onBackClick, coverImage = null, projectCategory = null, onSwipeYChange, coverFullscreenActive = false }) => {
  const { t, language } = useLanguage();
  const isEn = language === 'en';
  const [isClosing, setIsClosing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const pageRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const tocRef = useRef<HTMLDivElement>(null);
  
  // Motion values pour le swipe down
  const y = useMotionValue(0);
  
  // Mémoriser la hauteur de l'écran pour éviter les recalculs
  const screenHeight = useMemo(() => {
    return typeof window !== 'undefined' ? window.innerHeight : 800;
  }, []);

  // Calculer la position top en fonction du scroll (de 48vh + 100px à 0)
  const topPosition = useMemo(() => {
    const maxScroll = 200; // Nombre de pixels de scroll pour atteindre le haut
    const initialTop = screenHeight * 0.48 + 100; // 48vh + 100px en pixels
    const scrollProgress = Math.min(scrollTop / maxScroll, 1); // 0 à 1
    return initialTop * (1 - scrollProgress); // De 48vh + 100px à 0
  }, [scrollTop, screenHeight]);

  // Écouter le scroll pour mettre à jour la position
  useEffect(() => {
    const handleScroll = () => {
      if (pageRef.current) {
        setScrollTop(pageRef.current.scrollTop);
      }
    };

    const pageElement = pageRef.current;
    if (pageElement) {
      pageElement.addEventListener('scroll', handleScroll, { passive: true });
      return () => {
        pageElement.removeEventListener('scroll', handleScroll);
      };
    }
  }, []);

  // Notifier le parent de la valeur initiale
  useEffect(() => {
    if (onSwipeYChange) {
      onSwipeYChange(0);
    }
  }, []); // Seulement au montage

  // Remonter en haut de la page à chaque changement de projet (prev/next)
  useEffect(() => {
    const el = pageRef.current;
    if (el) el.scrollTo(0, 0);
  }, [projectData.id]);

  // JSON-LD CreativeWork pour que les IA et crawlers (avec JS) puissent lire le contenu du projet
  useEffect(() => {
    const baseUrl = (import.meta.env.VITE_SITE_URL as string) || (typeof window !== 'undefined' ? window.location.origin : '')
    const slug = projectData.title.toLowerCase()
    const urlFr = `${baseUrl.replace(/\/$/, '')}/fr/${slug}`
    const urlEn = `${baseUrl.replace(/\/$/, '')}/en/${slug}`
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'CreativeWork',
      name: projectData.title,
      description: projectData.summary,
      author: { '@type': 'Person', name: 'Anthony Merault', jobTitle: 'Product Designer | Building Complex SaaS & Design Systems' },
      datePublished: projectData.year || undefined,
      url: projectData.projectUrl || urlFr,
      mainEntityOfPage: [{ '@id': urlFr }, { '@id': urlEn }],
      inLanguage: ['fr', 'en'],
    }
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify(jsonLd)
    script.id = 'project-json-ld'
    document.head.appendChild(script)
    return () => {
      const el = document.getElementById('project-json-ld')
      if (el) el.remove()
    }
  }, [projectData.title, projectData.summary, projectData.year, projectData.projectUrl])



  // Vérifier si on peut swiper (on peut toujours swiper depuis la barre)
  const canSwipe = useCallback(() => {
    const target = pageRef.current;
    if (!target) return false;
    // Permettre le swipe même si on a scrollé un peu
    return true;
  }, []);

  // Gestion du drag avec logique exacte comme React Native (comportement Facebook)
  // Comme useAnimatedGestureHandler avec ctx.startY et event.translationY
  const [startY, setStartY] = useState<number | null>(null);
  const [startYValue, setStartYValue] = useState<number>(0); // ctx.startY
  const [initialScrollTop, setInitialScrollTop] = useState<number>(0); // Sauvegarder le scroll initial

  const handleBarMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (canSwipe()) {
      const target = pageRef.current;
      setInitialScrollTop(target ? target.scrollTop : 0);
      setIsDragging(true);
      setStartY(e.clientY);
      setStartYValue(y.get()); // Sauvegarder la position Y actuelle (comme ctx.startY)
    }
  };

  const handleBarTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (canSwipe()) {
      const target = pageRef.current;
      setInitialScrollTop(target ? target.scrollTop : 0);
      setIsDragging(true);
      setStartY(e.touches[0].clientY);
      setStartYValue(y.get()); // Sauvegarder la position Y actuelle (comme ctx.startY)
    }
  };

  // Event listeners globaux pour suivre le mouvement en temps réel (comme PanGestureHandler)
  useEffect(() => {
    if (!isDragging || startY === null) return;

    const handleMouseMove = (e: MouseEvent) => {
      const target = pageRef.current;
      
      // Calculer la translation depuis le point de départ (comme event.translationY en RN)
      const translationY = e.clientY - startY;
      
      // Si on tire vers le haut (translationY < 0), vérifier si on scroll
      if (translationY < 0) {
        // Si on a scrollé depuis le début du drag, annuler le drag pour permettre le scroll
        if (target && target.scrollTop > initialScrollTop + 5) {
          setIsDragging(false);
          setStartY(null);
          setStartYValue(0);
          y.set(0);
          if (onSwipeYChange) {
            onSwipeYChange(0);
          }
          return;
        }
        // Sinon, ne rien faire pour permettre le scroll normal
        return;
      }
      
      // Si on tire vers le bas (translationY > 0), continuer le drag même si on a scrollé
      e.preventDefault();
      e.stopPropagation();
      
      // Calculer la prochaine position Y (comme ctx.startY + event.translationY dans l'exemple RN)
      const nextY = startYValue + translationY;
      
      // Empêcher de monter au-dessus de 0 (comme Math.max(0, nextY) dans l'exemple RN)
      const newY = Math.max(0, nextY);
      y.set(newY);
      if (onSwipeYChange) {
        onSwipeYChange(newY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      const target = pageRef.current;
      
      // Calculer la translation depuis le point de départ (comme event.translationY en RN)
      const translationY = e.touches[0].clientY - startY;
      
      // Si on tire vers le haut (translationY < 0), vérifier si on scroll
      if (translationY < 0) {
        // Si on a scrollé depuis le début du drag, annuler le drag pour permettre le scroll
        if (target && target.scrollTop > initialScrollTop + 5) {
          setIsDragging(false);
          setStartY(null);
          setStartYValue(0);
          y.set(0);
          if (onSwipeYChange) {
            onSwipeYChange(0);
          }
          return;
        }
        // Sinon, ne rien faire pour permettre le scroll normal
        return;
      }
      
      // Si on tire vers le bas (translationY > 0), continuer le drag même si on a scrollé
      e.preventDefault();
      e.stopPropagation();
      
      // Calculer la prochaine position Y (comme ctx.startY + event.translationY dans l'exemple RN)
      const nextY = startYValue + translationY;
      
      // Empêcher de monter au-dessus de 0 (comme Math.max(0, nextY) dans l'exemple RN)
      const newY = Math.max(0, nextY);
      y.set(newY);
      if (onSwipeYChange) {
        onSwipeYChange(newY);
      }
    };

    // Handler unifié pour mouseup et touchend
    const handleEnd = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      const currentY = y.get();
      
      setIsDragging(false);
      setStartY(null);
      setStartYValue(0);
      
      // onEnd : décider de fermer ou revenir (comme dans l'exemple RN)
      if (currentY > CLOSE_THRESHOLD) {
        // Fermer avec animation (comme withSpring(SCREEN_HEIGHT))
        y.set(screenHeight);
        setIsClosing(true);
        setTimeout(() => {
          onBackClick();
        }, 400);
      } else {
        // Revenir à 0 avec animation (comme withSpring(0))
        y.set(0);
        if (onSwipeYChange) {
          onSwipeYChange(0);
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: false });
    window.addEventListener('mouseup', handleEnd, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleEnd, { passive: false });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, startY, startYValue, initialScrollTop, y, screenHeight, onSwipeYChange, onBackClick]);

  // Notifier le parent des changements de y directement dans les handlers

  return (
    <>
      <motion.div 
        ref={pageRef}
        className={`page active single-project-page ${isClosing ? 'closing' : ''} ${isDragging ? 'dragging' : ''} ${coverFullscreenActive ? 'cover-fullscreen-active' : ''}`}
        style={
          isDragging
            ? { y: y, top: `${topPosition}px` }
            : { top: `${topPosition}px` }
        }
        animate={
          isDragging
            ? undefined
            : (isClosing || coverFullscreenActive)
              ? { y: screenHeight }
              : { y: 0 }
        }
        transition={coverFullscreenActive
          ? { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }
          : {
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
        initial={false}
      >
        {/* Barre de fermeture en haut */}
        <div 
          ref={barRef}
          className="swipe-indicator-bar"
          style={{ 
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
          onMouseDown={handleBarMouseDown}
          onTouchStart={handleBarTouchStart}
        >
          <div className="swipe-indicator-handle"></div>
        </div>
        
        <div className="main-single-project">

        {/* 1. Header (Figma: date → titre → badges) */}
        {/* Bloc unique Figma : date, titre, badges + Contexte du projet, gap 40px */}
        <div className="project-top-block">
          <div className="project-header-section">
            {projectData.year && <p className="project-date">{isEn && projectData.translations?.en?.year ? projectData.translations.en.year : projectData.year}</p>}
            <h1 className="project-main-title">
              <BlurText text={projectData.title} className="project-main-title" />
            </h1>
            <div className="project-badges">
              {projectCategory && <span className="project-badge">{projectCategory}</span>}
              {projectData.badges?.filter(badge => {
                const categoryBadges = ['Application', 'Site Web', 'Navigation', 'Logo', 'Motion', 'PLV'];
                return !categoryBadges.includes(badge);
              }).map((badge, index) => (
                <span key={index} className="project-badge">{badge}</span>
              ))}
            </div>
            {projectData.subtitle && <p className="project-subtitle">{isEn && projectData.translations?.en?.subtitle ? projectData.translations.en.subtitle : projectData.subtitle}</p>}
            {projectData.projectUrl && (
              <a
                href={projectData.projectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="project-external-link"
                onClick={() => trackEvent('click', 'project_external', projectData.title)}
              >
                {t('project.viewProject')}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
              </a>
            )}
          </div>

          {/* Contexte du projet (même bloc, gap 40px) */}
          {(projectData.objectifs || projectData.teamNote) && (
            <section id="context" className="project-section context-project-section">
              <div className="context-project-wrapper">
                <h2 className="section-title">{t('project.context')}</h2>
                <div className="context-project-grid">
                <div className="context-project-left">
                  <div className="context-intro">
                    <p>{isEn && projectData.translations?.en?.summary ? projectData.translations.en.summary : projectData.summary}</p>
                  </div>
                  {(projectData.objectifs?.length ?? 0) > 0 && (
                    <div className="context-objectifs">
                      <h3 className="context-subtitle">{t('project.objectives')}</h3>
                      <div className="context-objectifs-list">
                        {(isEn && projectData.translations?.en?.objectifs ? projectData.translations.en.objectifs : projectData.objectifs!).map((obj, i) => (
                          <p key={i}>{obj}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="context-project-right">
                  <h3 className="context-equipe-title">{t('project.team')}</h3>
                  <table className="figma-equipe-table">
                    <thead>
                      <tr>
                        <th>{t('project.role')}</th>
                        <th>{t('project.name')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(isEn && projectData.translations?.en?.team ? projectData.translations.en.team : projectData.team).map((member, index) => {
                        const parts = member.includes(',') ? member.split(',').map(s => s.trim()) : [member, ''];
                        const name = parts[0] ?? '';
                        const role = parts[1] ?? '';
                        return (
                          <tr key={index}>
                            <td>{role}</td>
                            <td>{name}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {projectData.teamNote && (
                    <p className="context-team-note">{isEn && projectData.translations?.en?.teamNote ? projectData.translations.en.teamNote : projectData.teamNote}</p>
                  )}
                </div>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* 1.5. Sommaire */}
        <section className="project-section table-of-contents-section">
          <div ref={tocRef} className="section-card">
            <nav className="table-of-contents">
              <ul className="toc-list">
                <li><a href="#introduction" className="toc-link">{t('project.tocSummary')}</a></li>
                <li><a href="#team" className="toc-link">{t('project.tocTeam')}</a></li>
                {projectData.approach && (
                  <li><a href="#approach" className="toc-link">{projectData.approach.title}</a></li>
                )}
                <li><a href="#case-studie" className="toc-link">{t('project.caseStudie')}</a></li>
                {projectData.wireframes && (
                  <li><a href="#wireframes" className="toc-link">{t('project.ideation')}</a></li>
                )}
                {projectData.designSystem && (
                  <li><a href="#design-system" className="toc-link">{projectData.designSystem.colorPalette.title}</a></li>
                )}
                {projectData.designSystem?.typography && (
                  <li><a href="#typography" className="toc-link">{projectData.designSystem.typography.title}</a></li>
                )}
                <li><a href="#implementation" className="toc-link">{t('project.implementation')}</a></li>
                <li><a href="#results" className="toc-link">{t('project.results')}</a></li>
              </ul>
            </nav>
          </div>
        </section>

        {/* 2. Résumé / Introduction (masqué si Contexte du projet affiché) */}
        {!projectData.objectifs && !projectData.teamNote && (
        <section id="introduction" className="project-section intro-section">
          <div className="section-card intro-metadata-container">
            <p className="intro-text">{isEn && projectData.translations?.en?.summary ? projectData.translations.en.summary : projectData.summary}</p>
          </div>
        </section>
        )}

        {/* 2b. Problématique / Solution (gauche) + Matrice de positionnement (droite) */}
        {(projectData.problematique || projectData.solution || projectData.positionnementMatrix) && (
          <section id="problematique" className="project-section problematique-section">
            <div className="problematique-solution-grid">
              <div className="problematique-solution-texts">
                <div className="problematique-block">
                  <h2 className="section-title">{t('project.problematique')}</h2>
                  <p className="problematique-text">{isEn && projectData.translations?.en?.problematique ? projectData.translations.en.problematique : projectData.problematique}</p>
                </div>
                <div className="solution-block">
                  <h2 className="section-title">{t('project.solution')}</h2>
                  <p className="solution-text">{isEn && projectData.translations?.en?.solution ? projectData.translations.en.solution : projectData.solution}</p>
                </div>
              </div>
              {projectData.positionnementMatrix && (
                <div className="positionnement-matrix-wrapper">
                  <PositionnementMatrixChart
                    data={isEn && projectData.translations?.en?.positionnementMatrix ? projectData.translations.en.positionnementMatrix : projectData.positionnementMatrix}
                    className="positionnement-matrix-chart"
                  />
                </div>
              )}
            </div>
          </section>
        )}

        {/* 3. L'équipe projet (Figma 96-98) */}
        {!projectData.teamNote && (
        <section id="team" className="project-section team-section">
          <div className="section-card">
            <h2 className="section-title">{t('project.team')}</h2>
            <table className="figma-equipe-table">
              <thead>
                <tr>
                    <th>{t('project.role')}</th>
                    <th>{t('project.name')}</th>
                </tr>
              </thead>
              <tbody>
                {(isEn && projectData.translations?.en?.team ? projectData.translations.en.team : projectData.team).map((member, index) => {
                  const parts = member.includes(',') ? member.split(',').map(s => s.trim()) : [member, ''];
                  const name = parts[0] ?? '';
                  const role = parts[1] ?? '';
                  return (
                    <tr key={index}>
                      <td>{role}</td>
                      <td>{name}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
        )}

        {/* 4. Processus détaillé – 4 cartes (Figma) */}
        {projectData.processReunions && projectData.processReunions.length > 0 && (
          <section id="processus" className="project-section processus-cards-section">
            <h2 className="section-title">{t('project.process')}</h2>
            <p className="processus-intro">{t('project.processIntro')}</p>
            <div className="processus-cards-wrapper">
              <Swiper
                modules={[Pagination]}
                spaceBetween={24}
                slidesPerView="auto"
                centeredSlides={true}
                pagination={{ clickable: true }}
                className="processus-cards-swiper"
                onSwiper={(swiper) => {
                  const slideWidthPx = 406;
                  const applySlideWidth = () => {
                    swiper.slides.forEach((slide) => {
                      const el = slide as HTMLElement;
                      el.style.width = `${slideWidthPx}px`;
                      el.style.minWidth = `${slideWidthPx}px`;
                    });
                    swiper.update();
                  };
                  applySlideWidth();
                  swiper.on('resize', applySlideWidth);
                }}
              >
                {(isEn && projectData.translations?.en?.processReunions ? projectData.translations.en.processReunions : projectData.processReunions).map((reunion, index) => (
                  <SwiperSlide key={index} style={{ width: 406, minWidth: 406 }}>
                    <div className="processus-card">
                      <div className="processus-card-content">
                        <span className="processus-card-label">{reunion.label}</span>
                        <h3 className="processus-card-title">{reunion.title}</h3>
                        <p className="processus-card-desc">{reunion.description}</p>
                      </div>
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
            <p className="processus-summary">{t('project.processSummary')}</p>
          </section>
        )}

        {/* === Contenu Figma 10-84 (après processus) === */}

        {/* Audit */}
        <section id="audit" className="project-section figma-audit-section">
          <h2 className="section-title">{t('project.audit')}</h2>
          <div className="figma-two-cols">
            <p className="figma-lead">{t('project.auditLead')}</p>
            <p className="figma-body">{t('project.auditBody')}</p>
          </div>
          <div className="figma-audit-carousel-wrapper">
            <Swiper
              modules={[Pagination]}
              spaceBetween={24}
              slidesPerView="auto"
              centeredSlides={true}
              pagination={{ clickable: true }}
              className="figma-audit-carousel"
              onSwiper={(swiper) => {
                const idealWidth = 506.667;
                const applySlideWidth = () => {
                  const w = Math.min(idealWidth, Math.max(0, swiper.width - 24));
                  swiper.slides.forEach((slide) => {
                    const el = slide as HTMLElement;
                    el.style.width = `${w}px`;
                    el.style.minWidth = `${w}px`;
                  });
                  swiper.update();
                };
                applySlideWidth();
                swiper.on('resize', applySlideWidth);
              }}
            >
              {AUDIT_CAROUSEL_IMAGES.map((img, index) => (
                <SwiperSlide key={index}>
                  <div className="figma-audit-slide">
                    <img src={img.src} alt={t(`project.auditAlt${index + 1}`)} loading="eager" decoding="async" />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </section>

        {/* Architecture & Flux */}
        <section id="architecture" className="project-section figma-architecture-section">
          <h2 className="section-title">{t('project.architecture')}</h2>
          <div className="figma-two-cols">
            <p className="figma-lead">{t('project.archLead')}</p>
            <p className="figma-body">{t('project.archBody')}</p>
          </div>
          <h3 className="figma-subsection-title">{t('project.userFlow')}</h3>
          <div className="figma-userflow">
            {projectData.userFlow ? (
              <UserFlowChart data={isEn && projectData.translations?.en?.userFlow ? projectData.translations.en.userFlow : projectData.userFlow} className="figma-userflow-chart" />
            ) : (
              <img src="/single-project/fe88fac0-9c5a-44ad-af6a-151d4da1bfa0.png" alt="User flow" className="figma-userflow-img" />
            )}
          </div>
        </section>

        {/* Design system (Figma 100-282 : Palette Pedaboard complète) */}
        {projectData.designSystem && (
          <section id="design-system" className="project-section figma-design-system-section">
            <h2 className="section-title">{t('project.designSystem')}</h2>
            <h3 className="figma-palette-title">{t('project.palette')}</h3>
            <p className="figma-caption">{t('project.materialDesign')}</p>
            <div className="figma-palette-table">
              <div className="figma-palette-header">
                <span>{t('project.roleToken')}</span>
                <span>{t('project.usage')}</span>
                <span className="figma-palette-header-hex">{t('project.hexValue')}</span>
              </div>
              {(projectData.title === 'Pedaboard'
                ? (isEn
                    ? [
                        { role: 'Primary', usage: 'Brand color. Used for key elements (primary buttons, active states).', color: '#f07f00' },
                        { role: 'On Primary', usage: 'Text & icons on Primary color.', color: '#ffffff' },
                        { role: 'Secondary', usage: 'Brand & titles. The distinctive "Teal". Used for titles, logo and major interactive elements.', color: '#006d73' },
                        { role: 'On Secondary', usage: 'Readability. Ensures clarity of content on accent elements (Teal).', color: '#ffffff' },
                        { role: 'Surface (Main)', usage: 'App background. Very pale grey ("Off-White") to structure the workspace and reduce glare.', color: '#f1f3f4' },
                        { role: 'On Surface', usage: 'Main text. Navy blue (not black) to reduce eye strain.', color: '#2b2e48' },
                        { role: 'On Surface (Subtle)', usage: 'Secondary text. Medium grey for metadata and less important labels.', color: '#7d7d7d' },
                      ]
                    : [
                        { role: 'Primary', usage: 'Couleur de marque. Utilisée pour les éléments clés (Boutons principaux, États actifs).', color: '#f07f00' },
                        { role: 'On Primary', usage: 'Texte & Icônes posés sur la couleur Primary.', color: '#ffffff' },
                        { role: 'Secondary', usage: 'Marque & Titres. Le "Bleu Canard" identitaire. Utilisé pour les titres, le logo et les éléments interactifs majeurs.', color: '#006d73' },
                        { role: 'On Secondary', usage: "Lisibilité. Assure la clarté des contenus positionnés sur les éléments d'accentuation (Vert Canard).", color: '#ffffff' },
                        { role: 'Surface (Main)', usage: "Fond d'Application. Un gris très pâle (« Off-White ») pour structurer l'espace de travail et réduire l'éblouissement.", color: '#f1f3f4' },
                        { role: 'On Surface', usage: 'Texte Principal. Un Bleu Nuit (et non du noir) qui réduit la fatigue oculaire.', color: '#2b2e48' },
                        { role: 'On Surface (Subtle)', usage: "Texte Secondaire. Gris moyen pour les métadonnées et labels moins importants, afin de hiérarchiser l'information.", color: '#7d7d7d' },
                      ])
                : (projectData.designSystem.colorPalette?.categories?.neutrals?.colors ?? []).slice(0, 7).map((c: { role: string; usage?: string; color: string }, i: number) => {
                    const en = isEn && projectData.translations?.en?.designSystemNeutrals?.[i];
                    return { role: en?.role ?? c.role, usage: en?.usage ?? (c as { usage?: string }).usage ?? '', color: c.color };
                  })
              ).map((c: { role: string; usage: string; color: string }, i: number) => (
                <div key={i} className="figma-palette-row">
                  <span>{c.role}</span>
                  <span>{c.usage}</span>
                  <span className="figma-swatch" style={{ backgroundColor: c.color }}>{c.color}</span>
                </div>
              ))}
            </div>
            <h3 className="figma-typescale-title">{t('project.typescale')}</h3>
            <p className="figma-caption">{t('project.baseValue')}</p>
            {projectData.designSystem && (
              <div className="figma-typescale-table">
                <div className="figma-typescale-header">
                  <span>{t('project.roleCol')}</span>
                  <span>{t('project.typography')}</span>
                  <span>{t('project.size')}</span>
                  <span>{t('project.lineHeight')}</span>
                  <span>{t('project.example')}</span>
                </div>
                {(projectData.title === 'Pedaboard'
                  ? [
                      { role: 'H1', typo: 'Inter Bold', size: '32px (2.0rem)', line: '150% (48px)', weight: 700, sizePx: 32, example: 'The Quick Brown Fox Jumps Over The Lazy Dog' },
                      { role: 'H2', typo: 'Inter SemiBold', size: '29px (1.8rem)', line: '150% (44px)', weight: 600, sizePx: 29, example: 'The Quick Brown Fox Jumps Over The Lazy Dog' },
                      { role: 'H3', typo: 'Inter Medium', size: '26px (1.6rem)', line: '150% (39px)', weight: 500, sizePx: 26, example: 'The Quick Brown Fox Jumps Over The Lazy Dog' },
                      { role: 'H4', typo: 'Inter Medium', size: '23px (1.4rem)', line: '150% (35px)', weight: 500, sizePx: 23, example: 'The Quick Brown Fox Jumps Over The Lazy Dog' },
                      { role: 'Body', typo: 'Inter Regular', size: '16px (1.0rem)', line: '150% (24px)', weight: 400, sizePx: 16, example: 'The Quick Brown Fox Jumps Over The Lazy Dog' },
                      { role: 'Label', typo: 'Inter Medium', size: '14px (0.875rem)', line: '150% (21px)', weight: 500, sizePx: 14, example: 'The Quick Brown Fox Jumps Over The Lazy Dog' },
                      { role: 'Caption', typo: 'Inter Regular', size: '13px (0.8rem)', line: '150% (20px)', weight: 400, sizePx: 13, example: 'The quick brown fox jumps over the lazy dog' },
                    ]
                  : (projectData.designSystem.typography?.items ?? []).slice(0, 7).map((item: { style: string; font: string; size: string; lineHeight: string }) => {
                      const sizeNum = parseInt(item.size, 10) || 16;
                      const weight = item.font.toLowerCase().includes('bold') ? 700 : item.font.toLowerCase().includes('semi') ? 600 : item.font.toLowerCase().includes('medium') ? 500 : 400;
                      return {
                        role: item.style,
                        typo: item.font,
                        size: `${item.size}px`,
                        line: item.lineHeight,
                        weight,
                        sizePx: sizeNum,
                        example: 'The Quick Brown Fox Jumps Over The Lazy Dog',
                      };
                    })
                ).map((row: { role: string; typo: string; size: string; line: string; weight: number; sizePx: number; example: string }, i: number) => (
                  <div key={i} className="figma-typescale-row">
                    <span className="figma-typescale-role">{row.role}</span>
                    <span className="figma-typescale-typo">{row.typo}</span>
                    <span className="figma-typescale-size">{row.size}</span>
                    <span className="figma-typescale-line">{row.line}</span>
                    <span className="figma-typescale-example" style={{ fontWeight: row.weight, fontSize: row.sizePx, lineHeight: 1.5 }}>{row.example}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Conception & Itération (Figma 100-424) */}
        <section id="conception" className="project-section figma-conception-section">
          <h2 className="section-title">{t('project.conception')}</h2>
          <div className="figma-two-cols">
            <p className="figma-lead">{t('project.conceptionLead1')}</p>
            <p className="figma-lead">{t('project.conceptionLead2')}</p>
          </div>
          <div className="figma-conception-mockups">
            <div className="figma-conception-card">
              <div className="figma-conception-card-media">
                <img src="/single-project/92b9c4b3-3a47-4482-ba0f-a5d916be93e1.png" alt={t('project.wireframeAlt')} />
              </div>
              <div className="figma-conception-captions">
                <p className="figma-conception-caption">{t('project.conceptionCaption1')}</p>
                <p className="figma-conception-caption">{t('project.conceptionCaption2')}</p>
              </div>
            </div>
            <div className="figma-conception-card">
              <div className="figma-conception-card-media">
                <img src="/single-project/b81a3920-b92d-4a7d-af4c-4223b3f89174.png" alt={t('project.maquetteAlt')} />
              </div>
              <div className="figma-conception-captions">
                <p className="figma-conception-caption">{t('project.conceptionCaption3')}</p>
                <p className="figma-conception-caption">{t('project.conceptionCaption4')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Suite aux tests de contraste */}
        <section id="light-mode" className="project-section figma-light-mode-section">
          <h2 className="figma-big-title">{t('project.contrastTitle')}</h2>
          <img src="/single-project/faffcc0f-0914-47bb-96dc-d2ab2b613174.png" alt="Light Mode" className="figma-full-width-img" />
        </section>

        {/* Expérience Utilisateur Finale */}
        <section id="experience-finale" className="project-section figma-experience-section">
          <h2 className="section-title">{t('project.experienceFinale')}</h2>
          <div className="figma-two-cols">
            <p className="figma-lead">{t('project.experienceLead1')}</p>
            <p className="figma-lead">{t('project.experienceLead2')}</p>
          </div>
          <div className="figma-audit-carousel-wrapper">
            <Swiper
              modules={[Pagination]}
              spaceBetween={24}
              slidesPerView="auto"
              centeredSlides={true}
              pagination={{ clickable: true }}
              className="figma-audit-carousel"
              onSwiper={(swiper) => {
                const idealWidth = 506.667;
                const applySlideWidth = () => {
                  const w = Math.min(idealWidth, Math.max(0, swiper.width - 24));
                  swiper.slides.forEach((slide) => {
                    const el = slide as HTMLElement;
                    el.style.width = `${w}px`;
                    el.style.minWidth = `${w}px`;
                  });
                  swiper.update();
                };
                applySlideWidth();
                swiper.on('resize', applySlideWidth);
              }}
            >
              {EXPERIENCE_CAROUSEL_IMAGES.map((img, index) => (
                <SwiperSlide key={index}>
                  <div className="figma-audit-slide">
                    <img src={img.src} alt={t(`project.experienceAlt${index + 1}`)} loading="eager" decoding="async" />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </section>

        {/* Phase d'Intégration */}
        <section id="integration" className="project-section figma-integration-section">
          <h2 className="section-title">{t('project.integration')}</h2>
          <h2 className="figma-big-title">{t('project.integrationTitle')}</h2>
          <p className="figma-lead">{t('project.integrationLead')}</p>
          <img src="/single-project/68389a49-1620-4ab4-84a3-af8b45fd142f.png" alt={t('project.integrationAlt')} className="figma-full-width-img" />
        </section>

        {/* Mes autres projets (Figma 117-135 : slider type carousel) */}
        <section id="autres-projets" className="project-section figma-autres-projets-section">
          <h2 className="section-title">{t('project.otherProjects')}</h2>
          <div className="figma-autres-projets-carousel-wrapper">
            <Swiper
              modules={[Pagination]}
              className="figma-autres-projets-carousel"
              spaceBetween={24}
              slidesPerView="auto"
              centeredSlides={true}
              pagination={{ clickable: true }}
              onSwiper={(swiper) => {
                const idealWidth = 1118;
                const applySlideWidth = () => {
                  const w = Math.min(idealWidth, Math.max(0, swiper.width - 24));
                  swiper.slides.forEach((slide) => {
                    const el = slide as HTMLElement;
                    el.style.width = `${w}px`;
                    el.style.minWidth = `${w}px`;
                  });
                  swiper.update();
                };
                applySlideWidth();
                swiper.on('resize', applySlideWidth);
              }}
            >
              {[
                { slug: 'Pedaboard', title: 'Pedaboard', date: t('project.december2023'), badges: [t('hero.categoryApplication'), 'UX/UI', 'CRM'], coverImage: '/images/cover-project-pedaboard.png' },
                { slug: 'Playdago', title: 'Playdago', date: t('project.february2025'), badges: [t('hero.categoryApplication'), 'UX/UI'], coverImage: '/images/cover-project-playdago.png' },
                { slug: 'Kaldera', title: 'Kaldera', date: '2025', badges: [t('hero.categorySiteWeb'), 'UX/UI', 'Simulation'], coverImage: '/images/cover-project-kaldera.png' },
              ].map((proj) => (
                <SwiperSlide key={proj.slug}>
                  <a href={`/project/${proj.slug}`} className="figma-projet-mockup-card">
                    <div className="figma-projet-mockup">
                      <div className="figma-projet-mockup-bar" aria-hidden />
                      <div className="figma-projet-mockup-screen">
                        <img src={proj.coverImage} alt={proj.title} loading="lazy" decoding="async" />
                      </div>
                      <div className="figma-projet-mockup-overlay">
                        {proj.date && <span className="figma-projet-date">{proj.date}</span>}
                        <h3 className="figma-projet-name">{proj.title}</h3>
                        {proj.badges && proj.badges.length > 0 && (
                          <div className="figma-projet-badges">
                            {proj.badges.map((badge: string) => (
                              <span key={badge} className="project-badge">{badge}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </a>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </section>

        {/* Que fait-on ? */}
        <section id="que-fait-on" className="project-section figma-cta-section">
          <h2 className="section-title">{t('project.whatNext')}</h2>
          <div className="figma-cta-grid">
            <Button
              variant="secondary"
              className="figma-cta-item"
              onClick={() => {
                trackEvent('click', 'project_cta', 'back_to_top');
                document.getElementById('processus')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              {t('project.backToTop')}
            </Button>
            <Button
              variant="secondary"
              className="figma-cta-item"
              onClick={() => {
                trackEvent('click', 'project_cta', 'back_home');
                onBackClick();
              }}
            >
              {t('project.backHome')}
            </Button>
            <Button
              variant="secondary"
              className="figma-cta-item"
              onClick={() => {
                trackEvent('click', 'project_cta', 'about');
                window.location.href = '/about';
              }}
            >
              {t('project.aboutLink')}
            </Button>
            <Button
              variant="secondary"
              className="figma-cta-item"
              onClick={() => {
                trackEvent('click', 'project_cta', 'contact');
                setShowContactModal(true);
              }}
            >
              {t('project.contactMe')}
            </Button>
          </div>
        </section>
        <ContactModal
          isOpen={showContactModal}
          onClose={() => setShowContactModal(false)}
        />
        </div>
      </motion.div>

      {/* Bouton Contact fixe en bas d'écran, visible au scroll (même style que close/arrows) */}
      {scrollTop > 150 && (
        <div className="single-project-contact-fab-wrap">
          <button
            type="button"
            className="single-project-contact-fab"
            onClick={() => {
              trackEvent('click', 'project_cta', 'contact_fab');
              setShowContactModal(true);
            }}
            aria-label={t('project.contactMe')}
          >
            {t('project.contactMe')}
          </button>
        </div>
      )}
    </>
  );
};

export default SingleProjectNew;
