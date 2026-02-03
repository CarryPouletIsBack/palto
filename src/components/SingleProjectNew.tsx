import { useState, useRef, useEffect, useMemo, useCallback, type FC, type MouseEvent, type TouchEvent } from 'react';
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
}

const SingleProjectNew: FC<SingleProjectProps> = ({ projectData, onBackClick, coverImage = null, projectCategory = null, onSwipeYChange }) => {
  const [isClosing, setIsClosing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
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
        className={`page active single-project-page ${isClosing ? 'closing' : ''} ${isDragging ? 'dragging' : ''}`}
        style={isDragging ? {
          y: y,
          top: `${topPosition}px`,
        } : isClosing ? {
          y: screenHeight,
          top: `${topPosition}px`,
        } : {
          y: 0,
          top: `${topPosition}px`,
        }}
        animate={!isDragging && isClosing ? {
          y: screenHeight,
        } : !isDragging ? {
          y: 0,
        } : undefined}
        transition={{
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
            {projectData.year && <p className="project-date">{projectData.year}</p>}
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
            {projectData.subtitle && <p className="project-subtitle">{projectData.subtitle}</p>}
          </div>

          {/* Contexte du projet (même bloc, gap 40px) */}
          {(projectData.objectifs || projectData.teamNote) && (
            <section id="context" className="project-section context-project-section">
              <div className="context-project-wrapper">
                <h2 className="section-title">Contexte du projet</h2>
                <div className="context-project-grid">
                <div className="context-project-left">
                  <div className="context-intro">
                    <p>{projectData.summary}</p>
                  </div>
                  {projectData.objectifs && projectData.objectifs.length > 0 && (
                    <div className="context-objectifs">
                      <h3 className="context-subtitle">Objectifs</h3>
                      <div className="context-objectifs-list">
                        {projectData.objectifs.map((obj, i) => (
                          <p key={i}>{obj}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="context-project-right">
                  <h3 className="context-equipe-title">L&apos;équipe projet</h3>
                  <table className="figma-equipe-table">
                    <thead>
                      <tr>
                        <th>RÔLE</th>
                        <th>NOM PRÉNOM</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectData.team.map((member, index) => {
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
                    <p className="context-team-note">{projectData.teamNote}</p>
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
                <li><a href="#introduction" className="toc-link">Résumé / Introduction</a></li>
                <li><a href="#team" className="toc-link">L'équipe projet</a></li>
                {projectData.approach && (
                  <li><a href="#approach" className="toc-link">{projectData.approach.title}</a></li>
                )}
                <li><a href="#case-studie" className="toc-link">Case Studie</a></li>
                {projectData.wireframes && (
                  <li><a href="#wireframes" className="toc-link">Idéation & Solutions testées</a></li>
                )}
                {projectData.designSystem && (
                  <li><a href="#design-system" className="toc-link">{projectData.designSystem.colorPalette.title}</a></li>
                )}
                {projectData.designSystem?.typography && (
                  <li><a href="#typography" className="toc-link">{projectData.designSystem.typography.title}</a></li>
                )}
                <li><a href="#implementation" className="toc-link">Implémentation & Technologies</a></li>
                <li><a href="#results" className="toc-link">Résultats & Impact</a></li>
              </ul>
            </nav>
          </div>
        </section>

        {/* 2. Résumé / Introduction (masqué si Contexte du projet affiché) */}
        {!projectData.objectifs && !projectData.teamNote && (
        <section id="introduction" className="project-section intro-section">
          <div className="section-card intro-metadata-container">
            <p className="intro-text">{projectData.summary}</p>
          </div>
        </section>
        )}

        {/* 2b. Problématique / Solution (gauche) + Matrice de positionnement (droite) */}
        {(projectData.problematique || projectData.solution || projectData.positionnementMatrix) && (
          <section id="problematique" className="project-section problematique-section">
            <div className="problematique-solution-grid">
              <div className="problematique-solution-texts">
                <div className="problematique-block">
                  <h2 className="section-title">Problématique</h2>
                  <p className="problematique-text">{projectData.problematique}</p>
                </div>
                <div className="solution-block">
                  <h2 className="section-title">Solution</h2>
                  <p className="solution-text">{projectData.solution}</p>
                </div>
              </div>
              {projectData.positionnementMatrix && (
                <div className="positionnement-matrix-wrapper">
                  <PositionnementMatrixChart
                    data={projectData.positionnementMatrix}
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
            <h2 className="section-title">L&apos;équipe projet</h2>
            <table className="figma-equipe-table">
              <thead>
                <tr>
                  <th>RÔLE</th>
                  <th>NOM PRÉNOM</th>
                </tr>
              </thead>
              <tbody>
                {projectData.team.map((member, index) => {
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
            <h2 className="section-title">Processus détaillé</h2>
            <p className="processus-intro">Le projet a débuté par une série de réunions avec la cliente pour comprendre ses besoins et ses contraintes :</p>
            <div className="processus-cards-wrapper">
              <Swiper
                modules={[Pagination]}
                spaceBetween={24}
                slidesPerView="auto"
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
                {projectData.processReunions.map((reunion, index) => (
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
            <p className="processus-summary">Le processus a suivi un cycle constant de recherche → idéation → prototypage → tests → ajustements, avec un dialogue régulier entre la cliente, l&apos;équipe de développement et moi-même. Cette approche a permis de créer une interface efficace, intuitive et parfaitement adaptée aux besoins réels des utilisateurs.</p>
          </section>
        )}

        {/* === Contenu Figma 10-84 (après processus) === */}

        {/* Audit */}
        <section id="audit" className="project-section figma-audit-section">
          <h2 className="section-title">Audit</h2>
          <div className="figma-two-cols">
            <p className="figma-lead">Avant de concevoir les premiers wireframes, j&apos;ai mené une phase de recherche afin de comprendre les usages d&apos;un outil de type CRM et les bonnes pratiques liées aux interfaces de gestion.</p>
            <p className="figma-body">Cette phase s&apos;est appuyée sur une veille UX/UI autour des dashboards, des systèmes de suivi, des alertes et des interfaces orientées productivité. Elle m&apos;a permis d&apos;identifier des patterns récurrents, notamment sur la hiérarchisation de l&apos;information, l&apos;utilisation des couleurs dans des contextes fonctionnels et la gestion des états (incomplet, en attente, validé).</p>
          </div>
          <div className="figma-audit-carousel-wrapper">
            <Swiper
              modules={[Pagination]}
              spaceBetween={24}
              slidesPerView="auto"
              pagination={{ clickable: true }}
              className="figma-audit-carousel"
              onSwiper={(swiper) => {
                const slideWidthPx = 506.667;
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
              {AUDIT_CAROUSEL_IMAGES.map((img, index) => (
                <SwiperSlide key={index} style={{ width: 506.667, minWidth: 506.667 }}>
                  <div className="figma-audit-slide">
                    <img src={img.src} alt={img.alt} loading="eager" decoding="async" />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </section>

        {/* Architecture & Flux */}
        <section id="architecture" className="project-section figma-architecture-section">
          <h2 className="section-title">Architecture &amp; Flux</h2>
          <div className="figma-two-cols">
            <p className="figma-lead">L&apos;entité &quot;Client&quot; est au cœur de notre architecture de base de données. Contrairement à une approche en silos, elle centralise toutes les sous-entités, incluant les Contacts (individus), leurs historiques d&apos;achats via WooCommerce, ainsi que leurs Formations passées ou futures.</p>
            <p className="figma-body">Cette phase s&apos;est appuyée sur une veille UX/UI autour des dashboards, des systèmes de suivi, des alertes et des interfaces orientées productivité.</p>
          </div>
          <h3 className="figma-subsection-title">User flow</h3>
          <div className="figma-userflow">
            {projectData.userFlow ? (
              <UserFlowChart data={projectData.userFlow} className="figma-userflow-chart" />
            ) : (
              <img src="/single-project/fe88fac0-9c5a-44ad-af6a-151d4da1bfa0.png" alt="User flow" className="figma-userflow-img" />
            )}
          </div>
        </section>

        {/* Design system (Figma 100-282 : Palette Pedaboard complète) */}
        {projectData.designSystem && (
          <section id="design-system" className="project-section figma-design-system-section">
            <h2 className="section-title">Design system</h2>
            <h3 className="figma-palette-title">Palette &quot;Pedaboard&quot;</h3>
            <p className="figma-caption">(Material Design)</p>
            <div className="figma-palette-table">
              <div className="figma-palette-header">
                <span>Rôle (Token)</span>
                <span>Usage / Fonction</span>
                <span className="figma-palette-header-hex">Valeur Hex</span>
              </div>
              {(projectData.title === 'Pedaboard'
                ? [
                    { role: 'Primary', usage: 'Couleur de marque. Utilisée pour les éléments clés (Boutons principaux, États actifs).', color: '#f07f00' },
                    { role: 'On Primary', usage: 'Texte & Icônes posés sur la couleur Primary.', color: '#ffffff' },
                    { role: 'Secondary', usage: 'Marque & Titres. Le "Bleu Canard" identitaire. Utilisé pour les titres, le logo et les éléments interactifs majeurs.', color: '#006d73' },
                    { role: 'On Secondary', usage: "Lisibilité. Assure la clarté des contenus positionnés sur les éléments d'accentuation (Vert Canard).", color: '#ffffff' },
                    { role: 'Surface (Main)', usage: "Fond d'Application. Un gris très pâle (« Off-White ») pour structurer l'espace de travail et réduire l'éblouissement.", color: '#f1f3f4' },
                    { role: 'On Surface', usage: 'Texte Principal. Un Bleu Nuit (et non du noir) qui réduit la fatigue oculaire.', color: '#2b2e48' },
                    { role: 'On Surface (Subtle)', usage: "Texte Secondaire. Gris moyen pour les métadonnées et labels moins importants, afin de hiérarchiser l'information.", color: '#7d7d7d' },
                  ]
                : (projectData.designSystem.colorPalette?.categories?.neutrals?.colors ?? []).slice(0, 7).map((c: { role: string; usage?: string; color: string }) => ({ role: c.role, usage: (c as { usage?: string }).usage ?? '', color: c.color }))
              ).map((c: { role: string; usage: string; color: string }, i: number) => (
                <div key={i} className="figma-palette-row">
                  <span>{c.role}</span>
                  <span>{c.usage}</span>
                  <span className="figma-swatch" style={{ backgroundColor: c.color }}>{c.color}</span>
                </div>
              ))}
            </div>
            <h3 className="figma-typescale-title">Typescale</h3>
            <p className="figma-caption">Base Value: 16</p>
            {projectData.designSystem && (
              <div className="figma-typescale-table">
                <div className="figma-typescale-header">
                  <span>Rôle</span>
                  <span>Typographie</span>
                  <span>Taille</span>
                  <span>Interlignage</span>
                  <span>Exemple</span>
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
          <h2 className="section-title">Conception &amp; Itération</h2>
          <div className="figma-two-cols">
            <p className="figma-lead">Avec un délai de conception fixé à deux mois et un budget restreint, j&apos;ai opté pour des solutions techniques simples afin d&apos;assurer la scalabilité dans le temps. Bien que la maquette ait été réalisée en &quot;Desktop First&quot;, le design a été pensé pour une intégration fluide en responsive.</p>
            <p className="figma-lead">À partir du cadrage, j&apos;ai conçu plusieurs itérations de wireframes jusqu&apos;à obtenir une version optimale en termes de navigation, de lisibilité et de faisabilité technique.</p>
          </div>
          <div className="figma-conception-mockups">
            <div className="figma-conception-card">
              <div className="figma-conception-card-media">
                <img src="/single-project/92b9c4b3-3a47-4482-ba0f-a5d916be93e1.png" alt="Wireframe — Hello John" />
              </div>
              <div className="figma-conception-captions">
                <p className="figma-conception-caption">J&apos;ai conservé le header supérieur pour offrir à l&apos;utilisateur un accès immédiat aux actions principales sans recherche inutile. Ce menu regroupe les accès aux 6 pages clés du produit.</p>
                <p className="figma-conception-caption">Barre d&apos;actions : J&apos;ai intégré une barre d&apos;actions fixe en haut de la zone principale pour simplifier les interactions. Les boutons contextuels restent ainsi toujours visibles et à portée de main.</p>
              </div>
            </div>
            <div className="figma-conception-card">
              <div className="figma-conception-card-media">
                <img src="/single-project/b81a3920-b92d-4a7d-af4c-4223b3f89174.png" alt="Maquette haute fidélité — Hello John" />
              </div>
              <div className="figma-conception-captions">
                <p className="figma-conception-caption">J&apos;ai confronté l&apos;identité visuelle de la cliente aux contraintes techniques du dashboard.</p>
                <p className="figma-conception-caption">L&apos;application brute des couleurs sur cette charte a permis de détecter instantanément les limites : 1. Rupture d&apos;accessibilité : les combinaisons texte/fond manquaient de contraste (notamment cartes clients). 2. Saturation des données : les teintes étaient trop invasives pour une interface dense.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Suite aux tests de contraste */}
        <section id="light-mode" className="project-section figma-light-mode-section">
          <h2 className="figma-big-title">Suite aux tests de contraste précédents, j&apos;ai opéré un virage radical vers une interface claire (Light Mode).</h2>
          <img src="/single-project/faffcc0f-0914-47bb-96dc-d2ab2b613174.png" alt="Light Mode" className="figma-full-width-img" />
        </section>

        {/* Expérience Utilisateur Finale */}
        <section id="experience-finale" className="project-section figma-experience-section">
          <h2 className="section-title">Expérience Utilisateur Finale</h2>
          <div className="figma-two-cols">
            <p className="figma-lead">Pour cette version finale, j&apos;ai privilégié une approche &quot;Clean UI&quot; en Light Mode. L&apos;objectif était de réduire drastiquement la charge mentale de l&apos;utilisateur face à la densité des données.</p>
            <p className="figma-lead">L&apos;interface s&apos;efface au profit du contenu : les zones d&apos;actions (Tâches, Rappels) sont immédiatement identifiables grâce aux touches de couleurs vives, tandis que les tableaux de données (Clients, Formations) offrent une lisibilité maximale pour une gestion quotidienne sans fatigue visuelle.</p>
          </div>
          <div className="figma-audit-carousel-wrapper">
            <Swiper
              modules={[Pagination]}
              spaceBetween={24}
              slidesPerView="auto"
              pagination={{ clickable: true }}
              className="figma-audit-carousel"
              onSwiper={(swiper) => {
                const slideWidthPx = 506.667;
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
              {EXPERIENCE_CAROUSEL_IMAGES.map((img, index) => (
                <SwiperSlide key={index} style={{ width: 506.667, minWidth: 506.667 }}>
                  <div className="figma-audit-slide">
                    <img src={img.src} alt={img.alt} loading="eager" decoding="async" />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </section>

        {/* Phase d'Intégration */}
        <section id="integration" className="project-section figma-integration-section">
          <h2 className="section-title">Phase d&apos;Intégration</h2>
          <h2 className="figma-big-title">Le projet est actuellement en cours de développement par l&apos;équipe technique. La mise en production étant à venir, aucune métrique quantitative (KPIs) n&apos;est disponible à ce jour.</h2>
          <p className="figma-lead">Cependant, la phase de Handoff (passage de relais) a permis de valider la faisabilité technique de l&apos;ensemble des composants, et les premiers retours qualitatifs sur le prototype animé confirment une nette amélioration de la fluidité de navigation par rapport aux outils précédents.</p>
          <img src="/single-project/68389a49-1620-4ab4-84a3-af8b45fd142f.png" alt="Intégration" className="figma-full-width-img" />
        </section>

        {/* Mes autres projets (Figma 117-135 : slider type carousel) */}
        <section id="autres-projets" className="project-section figma-autres-projets-section">
          <h2 className="section-title">Mes autres projets</h2>
          <div className="figma-autres-projets-carousel-wrapper">
            <Swiper
              modules={[Pagination]}
              className="figma-autres-projets-carousel"
              spaceBetween={24}
              slidesPerView="auto"
              pagination={{ clickable: true }}
              onSwiper={(swiper) => {
                const cardWidth = 1118;
                const applySlideWidth = () => {
                  const slides = swiper.slides;
                  for (let i = 0; i < slides.length; i++) {
                    (slides[i] as HTMLElement).style.width = `${cardWidth}px`;
                    (slides[i] as HTMLElement).style.minWidth = `${cardWidth}px`;
                  }
                };
                applySlideWidth();
                swiper.on('resize', applySlideWidth);
              }}
            >
              {[
                { slug: 'Pedaboard', title: 'Pedaboard', date: 'Décembre 2023', badges: ['Application', 'UX/UI', 'CRM'], coverImage: '/images/cover-project-pedaboard.png' },
                { slug: 'Playdago', title: 'Playdago', date: 'Février 2025', badges: ['Application', 'UX/UI'], coverImage: '/images/cover-project-playdago.png' },
              ].map((proj) => (
                <SwiperSlide key={proj.slug} style={{ width: 1118, minWidth: 1118 }}>
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
          <h2 className="section-title">Que fait-on ?</h2>
          <div className="figma-cta-grid">
            <a href="#processus" className="figma-cta-item">
              <span>Retourner en haut</span>
            </a>
            <a href="/" onClick={(e) => { e.preventDefault(); onBackClick(); }} className="figma-cta-item">
              <span>Retour à l&apos;accueil</span>
            </a>
            <a href="/about" className="figma-cta-item">
              <span>à propos</span>
            </a>
            <a href="/#contact" className="figma-cta-item">
              <span>Me contacter</span>
            </a>
          </div>
        </section>
        </div>
      </motion.div>
    </>
  );
};

export default SingleProjectNew;
