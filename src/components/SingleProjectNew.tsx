import { useState, useRef, useEffect, useMemo, useCallback, type FC, type MouseEvent, type TouchEvent, type CSSProperties } from 'react';
import { motion, useMotionValue } from 'framer-motion';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import './SingleProject.css';
import { type ProjectData } from '../data/projectsNew';
import BlurText from './BlurText';
import { Tree, Folder, File } from './ui/file-tree';
import { Safari } from './ui/safari';
import DonutChartRace from './DonutChartRace';

// Constantes en dehors du composant pour éviter les re-créations
const CLOSE_THRESHOLD = 100;

// Fonction utilitaire en dehors du composant
const getTextColor = (backgroundColor: string): string => {
  const hex = backgroundColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
};

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

        {/* 1. Titre Principal avec badges */}
        <div className="project-header-section">
          <h1 className="project-main-title">
            <BlurText text={projectData.title} className="project-main-title" />
          </h1>
          {projectData.subtitle && <p className="project-subtitle">{projectData.subtitle}</p>}
          <div className="project-badges">
            {projectCategory && <span className="project-badge">{projectCategory}</span>}
            {projectData.badges?.filter(badge => {
              // Filtrer les badges de type catégorie (Application, Site Web, etc.)
              const categoryBadges = ['Application', 'Site Web', 'Navigation', 'Logo', 'Motion', 'PLV']
              return !categoryBadges.includes(badge)
            }).map((badge, index) => (
              <span key={index} className="project-badge">{badge}</span>
            ))}
          </div>
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

        {/* 2. Résumé / Introduction */}
        <section id="introduction" className="project-section intro-section">
          <div className="section-card intro-metadata-container">
            <p className="intro-text">{projectData.summary}</p>
            <div className="metadata-bubbles">
              <div className="metadata-bubble">
                <span className="metadata-label">Année</span>
                <span className="metadata-value">{projectData.year}</span>
              </div>
              <div className="metadata-bubble">
                <span className="metadata-label">Durée</span>
                <span className="metadata-value">{projectData.duration}</span>
              </div>
              <div className="metadata-bubble">
                <span className="metadata-label">Type</span>
                <span className="metadata-value">{projectData.type}</span>
              </div>
            </div>
          </div>
        </section>

        {/* 3. L'équipe projet */}
        <section id="team" className="project-section team-section">
          <div className="section-card">
            <h2 className="section-title">L'équipe projet</h2>
            <div className="team-carousel-wrapper">
              <Swiper
                modules={[Pagination]}
                spaceBetween={0}
                slidesPerView={1.2}
                centeredSlides={true}
                pagination={{
                  clickable: true,
                  bulletClass: 'swiper-pagination-bullet team-bullet',
                  bulletActiveClass: 'swiper-pagination-bullet-active team-bullet-active'
                }}
                breakpoints={{
                  640: {
                    slidesPerView: 2.2,
                    spaceBetween: 0
                  },
                  1024: {
                    slidesPerView: 3.2,
                    spaceBetween: 0
                  }
                }}
                className="team-carousel"
              >
                {projectData.team.map((member, index) => {
                  // Séparer le nom et le poste
                  let name, role;
                  
                  if (member.includes(',') && member.includes('(')) {
                    // Format: "Nom, Poste (détails)"
                    const parts = member.split(',');
                    name = parts[0].trim();
                    role = parts[1].trim();
                  } else if (member.includes(',')) {
                    // Format: "Nom, Poste"
                    const parts = member.split(',');
                    name = parts[0].trim();
                    role = parts[1].trim();
                  } else if (member.includes('(') && member.includes(')')) {
                    // Format: "Nom (poste)"
                    const openParen = member.indexOf('(');
                    name = member.substring(0, openParen).trim();
                    role = member.substring(openParen).trim();
                  } else {
                    // Format: "Nom" seulement
                    name = member;
                    role = '';
                  }
                  
                  return (
                    <SwiperSlide key={index}>
                      <div className="team-member">
                        <div className="team-member-header">
                          <div className="team-member-name">{name}</div>
                          {role && <div className="team-member-role">{role}</div>}
                        </div>
                        <div className="team-member-image-section">
                          <div className="imguser">
                            <img 
                              src="/images/portrait-anthony.jpg" 
                              alt={name}
                              className="team-member-image"
                            />
                          </div>
                        </div>
                        <div className="team-member-contact">
                          <a 
                            href="https://www.instagram.com/meraultony" 
                            className="team-member-contact-link"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            @meraultony
                          </a>
                        </div>
                      </div>
                    </SwiperSlide>
                  );
                })}
              </Swiper>
            </div>
          </div>
        </section>


        {/* 5. Contexte & Démarche */}
        <section id="approach" className="project-section context-approach-section">
          <div className="context-approach-container">
            {/* Démarche & Approche */}
            <div className="section-card">
              <h2 className="section-title">{projectData.approach.title}</h2>
              <div className="approach-items-container">
                {projectData.approach.sections.map((section, index) => (
                  <div key={index} className="approach-item">
                    <h3 className="approach-subtitle">{section.subtitle}</h3>
                    <p className="approach-content">{section.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 6. Case Studie */}
        <section id="case-studie" className="project-section case-studie-section">
          <div className="section-card">
            <h2 className="section-title">Processus détaillé – PlayDaGo</h2>
            <div className="case-studie-content">

              {/* Recherche utilisateur / Interviews */}
              <div className="case-studie-subsection">
                <h4 className="case-studie-subtitle">Recherche utilisateur / Interviews</h4>
                <p className="case-studie-text">
                  Le projet a débuté par une série de réunions avec la cliente pour comprendre ses besoins et ses contraintes :
                </p>
                <ul className="case-studie-list">
                  <li>
                    <strong>Première réunion :</strong> découverte des outils existants, des plateformes utilisées et des difficultés rencontrées au quotidien. La cliente expliquait comment ses informations étaient dispersées et comment cela compliquait le suivi des clients et la gestion des formations.
                  </li>
                  <li>
                    <strong>Deuxième réunion :</strong> co-construction du cahier des charges, en priorisant les fonctionnalités essentielles comme le tableau de bord centralisé, le suivi des formations et les notifications automatiques.
                  </li>
                  <li>
                    <strong>Troisième réunion :</strong> discussion sur les contraintes pédagogiques et organisationnelles, définition des parcours utilisateurs principaux et validation des workflows critiques.
                  </li>
                  <li>
                    <strong>Quatrième réunion :</strong> validation des premières maquettes conceptuelles et recueil des retours détaillés sur l'expérience et la hiérarchie de l'information.
                  </li>
                </ul>
                <p className="case-studie-text" style={{ marginTop: '16px' }}>
                  Cette phase a permis de cerner précisément les besoins fonctionnels et UX, et de construire un cahier des charges évolutif et clair.
                </p>
              </div>

              {/* Veille concurrentielle */}
              <div className="case-studie-subsection">
                <h4 className="case-studie-subtitle">Veille concurrentielle</h4>
                <p className="case-studie-text">
                  Avant toute conception, une analyse des applications et outils similaires a été menée pour identifier les bonnes pratiques UX/UI :
                </p>
                <ul className="case-studie-list">
                  <li>Étude des parcours pédagogiques pour rendre la navigation fluide et intuitive.</li>
                  <li>Observation des systèmes de suivi de formation et des alertes pour déterminer les méthodes les plus efficaces d'information automatique.</li>
                  <li>Sélection des éléments pertinents et identification des points à améliorer par rapport aux concurrents.</li>
                </ul>
                <p className="case-studie-text" style={{ marginTop: '16px' }}>
                  Cette veille a servi de référence pour les décisions de design et a permis de créer un prototype adapté aux usages réels.
                </p>
              </div>

              {/* Idéation & Solutions testées */}
              <div className="case-studie-subsection">
                <h4 className="case-studie-subtitle">Idéation & Solutions testées</h4>
                <ul className="case-studie-list">
                  <li>
                    <strong>Wireframes :</strong> plusieurs esquisses pour organiser les informations et tester différents layouts pour le tableau de bord et les fiches clients.
                  </li>
                  <li>
                    <strong>Prototypes interactifs sur Figma :</strong> simulation de l'expérience utilisateur pour tester la navigation et la hiérarchie des informations.
                  </li>
                  <li>
                    <strong>Réunions de feedback :</strong> points hebdomadaires avec la cliente pour valider les choix et affiner les parcours. Les ajustements principaux concernaient la hiérarchie des tâches, la visibilité des notifications et l'ergonomie du menu latéral.
                  </li>
                  <li>
                    <strong>Itérations successives :</strong> chaque feedback a été intégré pour améliorer la lisibilité, l'efficacité et la fluidité des parcours utilisateur.
                  </li>
                </ul>
              </div>

              {/* Tests & itérations */}
              <div className="case-studie-subsection">
                <h4 className="case-studie-subtitle">Tests & itérations</h4>
                <ul className="case-studie-list">
                  <li>
                    <strong>Validation technique :</strong> réunions avec l'équipe front-end et back-end pour vérifier la faisabilité et planifier le développement.
                  </li>
                  <li>
                    <strong>Tests utilisateurs :</strong> tests sur un panel restreint de clients pilotes pour identifier les points de friction.
                  </li>
                  <li>
                    <strong>Corrections et ajustements :</strong> amélioration des boutons d'action, réorganisation des cartes et modules de suivi, clarification des icônes et des notifications.
                  </li>
                  <li>
                    <strong>Itération continue :</strong> ce cycle de tests et corrections a été répété jusqu'à ce que l'interface soit intuitive, cohérente et répondant parfaitement aux besoins de la cliente.
                  </li>
                </ul>
              </div>

              {/* Résumé narratif */}
              <div className="case-studie-subsection case-studie-summary">
                <h4 className="case-studie-subtitle case-studie-summary-title">💡 Résumé narratif</h4>
                <p className="case-studie-text">
                  Le processus a suivi un cycle constant de recherche → idéation → prototypage → tests → ajustements, avec un dialogue régulier entre la cliente, l'équipe de développement et moi-même. Cette approche a permis de créer une interface efficace, intuitive et parfaitement adaptée aux besoins réels des utilisateurs.
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* 7. Wireframes & Maquettes */}
        {projectData.wireframes && (
          <section id="wireframes" className="project-section wireframes-section">
            <h2 className="section-title">Idéation & Solutions testées</h2>
            
            {/* Safari Browser Mockup */}
            {projectData.wireframes && projectData.wireframes.items && projectData.wireframes.items.length > 0 && projectData.wireframes.items[0].image && (
              <div style={{ marginTop: '24px', marginBottom: '24px', width: '100%', display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: '100%', maxWidth: '1203px' }}>
                  <Safari
                    url="https://example.com"
                    imageSrc={projectData.wireframes.items[0].image}
                  />
                </div>
              </div>
            )}
            
            {/* File Tree Component */}
            <div className="wireframe-file-tree-container" style={{ marginTop: '24px', marginBottom: '24px' }}>
              <Tree
                elements={[
                  {
                    id: 'wireframes',
                    name: 'Wireframes',
                    children: [
                      {
                        id: 'pages',
                        name: 'Pages',
                        children: [
                          { id: 'home', name: 'Home' },
                          { id: 'dashboard', name: 'Dashboard' },
                          { id: 'profile', name: 'Profile' },
                        ],
                      },
                      {
                        id: 'components',
                        name: 'Components',
                        children: [
                          { id: 'buttons', name: 'Buttons' },
                          { id: 'forms', name: 'Forms' },
                          { id: 'cards', name: 'Cards' },
                        ],
                      },
                    ],
                  },
                ]}
                className="w-full"
              >
                <Folder element="Wireframes" value="wireframes">
                  <Folder element="Pages" value="pages">
                    <File value="home">Home</File>
                    <File value="dashboard">Dashboard</File>
                    <File value="profile">Profile</File>
                  </Folder>
                  <Folder element="Components" value="components">
                    <File value="buttons">Buttons</File>
                    <File value="forms">Forms</File>
                    <File value="cards">Cards</File>
                  </Folder>
                </Folder>
              </Tree>
            </div>
            
            <div className="wireframe-link-container">
              <a 
                href="https://www.figma.com/design/Pukbs388PcEAKvHJyGphm2/P%C3%A9daboard?node-id=92-10832&m=dev" 
                target="_blank" 
                rel="noopener noreferrer"
                className="wireframe-figma-link"
              >
                Voir le prototype interactif sur Figma →
              </a>
            </div>
          </section>
        )}


        {/* 7. Design System - Palette colorimétrique */}
        <section id="design-system" className="project-section design-system-section">
          <div className="color-palette-section">
            <h2>{projectData.designSystem.colorPalette.title}</h2>
            <p>{projectData.designSystem.colorPalette.description}</p>
            
            {/* Neutrals */}
            <div className="color-category">
              <h5>{projectData.designSystem.colorPalette.categories.neutrals.title}</h5>
              <div className="neutrals-content-grid">
                <div className="neutrals-table-container">
                  <div className="table-wrapper">
                <table className="color-table">
                  <thead>
                    <tr>
                      <th>Rôle</th>
                      <th>Nom Figma (token)</th>
                      <th>Couleur</th>
                      <th>Utilisation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectData.designSystem.colorPalette.categories.neutrals.colors.map((color, index) => (
                      <tr key={index}>
                        <td>{color.role}</td>
                        <td>{color.token}</td>
                        <td>
                          <div className="color-preview" style={{ backgroundColor: color.color }}>
                            <span style={{ color: getTextColor(color.color) }}>{color.color}</span>
                          </div>
                        </td>
                        <td>{color.usage}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                  </div>
                </div>
                
                {/* Grille Bento avec 7 carrés représentant les rôles */}
                <div className="neutrals-bento-container">
                  <div className="neutrals-bento-grid">
                {projectData.designSystem.colorPalette.categories.neutrals.colors.map((colorRole, index) => {
                  // Déterminer quelle surface et quel texte afficher selon le rôle
                  const getVisualConfig = (role: string) => {
                    const neutrals = projectData.designSystem.colorPalette.categories.neutrals.colors;
                    const surfacePrim = neutrals.find(c => c.role === 'Surface principale');
                    const surfaceSec = neutrals.find(c => c.role === 'Surface secondaire');
                    const surfaceElev = neutrals.find(c => c.role === 'Surface surélevée');
                    const textPrim = neutrals.find(c => c.role === 'Texte principal');
                    const textSec = neutrals.find(c => c.role === 'Texte secondaire');
                    const textInv = neutrals.find(c => c.role === 'Texte inversé');
                    
                    if (role === 'Surface principale') {
                      return { bg: surfacePrim?.color || '#F1F3F4', text: textPrim?.color || '#1C1C1C', label: 'Texte principal', usage: surfacePrim?.usage };
                    } else if (role === 'Surface secondaire') {
                      return { bg: surfaceSec?.color || '#DCE3EB', text: textPrim?.color || '#1C1C1C', label: 'Texte principal', usage: surfaceSec?.usage };
                    } else if (role === 'Surface surélevée') {
                      return { bg: surfaceElev?.color || '#FFFFFF', text: textPrim?.color || '#1C1C1C', label: 'Texte principal', usage: surfaceElev?.usage };
                    } else if (role === 'Texte principal') {
                      return { bg: surfacePrim?.color || '#F1F3F4', text: textPrim?.color || '#1C1C1C', label: 'Texte principal', usage: textPrim?.usage };
                    } else if (role === 'Texte secondaire') {
                      return { bg: surfaceSec?.color || '#DCE3EB', text: textSec?.color || '#4D4D4D', label: 'Texte secondaire', usage: textSec?.usage };
                    } else if (role === 'Bordure') {
                      return { bg: surfacePrim?.color || '#F1F3F4', text: '#DCDCDD', label: 'Bordure', usage: colorRole.usage };
                    } else if (role === 'Texte inversé') {
                      // Texte inversé sur un fond coloré (simuler un bouton)
                      return { bg: '#007D9F', text: textInv?.color || '#FFFFFF', label: 'Texte inversé', usage: textInv?.usage };
                    }
                    return { bg: colorRole.color, text: '#000', label: colorRole.role, usage: colorRole.usage };
                  };
                  
                  const config = getVisualConfig(colorRole.role);
                  
                  return (
                    <div 
                      key={index}
                      className="bento-square" 
                      style={{ 
                        backgroundColor: config.bg,
                        color: config.text
                      }}
                    >
                      <div className="bento-square-content">
                        <span className="bento-role">{config.label}</span>
                        {config.usage && <span className="bento-usage">{config.usage}</span>}
                      </div>
                    </div>
                  );
                })}
                  </div>
                </div>
              </div>
            </div>

            {/* Primary */}
            <div className="color-category">
              <h5>{projectData.designSystem.colorPalette.categories.primary.title}</h5>
              <div className="neutrals-content-grid">
                <div className="neutrals-table-container">
                  <div className="table-wrapper">
                    <table className="color-table">
                      <thead>
                        <tr>
                          <th>Rôle</th>
                          <th>Nom Figma (token)</th>
                          <th>Couleur</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projectData.designSystem.colorPalette.categories.primary.colors.map((color, index) => (
                          <tr key={index}>
                            <td>{color.role}</td>
                            <td>{color.token}</td>
                            <td>
                              <div className="color-preview" style={{ backgroundColor: color.color }}>
                                <span style={{ color: getTextColor(color.color) }}>{color.color}</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <div className="neutrals-bento-container">
                  <div className="color-bento-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gridTemplateRows: 'repeat(2, 1fr)' }}>
                    {projectData.designSystem.colorPalette.categories.primary.colors.map((colorRole, index) => {
                      const neutrals = projectData.designSystem.colorPalette.categories.neutrals.colors;
                      const textOnPrimary = projectData.designSystem.colorPalette.categories.primary.colors.find(c => c.role.includes('Texte'));
                      const surfacePrim = neutrals.find(c => c.role === 'Surface principale');
                      
                      let config;
                      if (colorRole.role === 'Primaire') {
                        config = { bg: colorRole.color, text: textOnPrimary?.color || '#FFFFFF', label: 'Primaire', showText: 'Texte sur bouton' };
                      } else if (colorRole.role === 'Hover') {
                        config = { bg: colorRole.color, text: textOnPrimary?.color || '#FFFFFF', label: 'Hover', showText: 'État survol' };
                      } else if (colorRole.role === 'Pressed') {
                        config = { bg: colorRole.color, text: textOnPrimary?.color || '#FFFFFF', label: 'Pressed', showText: 'État pressé' };
                      } else if (colorRole.role.includes('Texte')) {
                        config = { bg: surfacePrim?.color || '#F1F3F4', text: colorRole.color, label: colorRole.role, showText: 'Exemple texte' };
                      } else {
                        config = { bg: colorRole.color, text: getTextColor(colorRole.color), label: colorRole.role };
                      }
                      
                      return (
                        <div 
                          key={index}
                          className="bento-square" 
                          style={{ 
                            backgroundColor: config.bg,
                            color: config.text
                          }}
                        >
                          <div className="bento-square-content">
                            <span className="bento-role">{config.label}</span>
                            {config.showText && <span className="bento-usage">{config.showText}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Secondary */}
            <div className="color-category">
              <h5>{projectData.designSystem.colorPalette.categories.secondary.title}</h5>
              <div className="neutrals-content-grid">
                <div className="neutrals-table-container">
                  <div className="table-wrapper">
                    <table className="color-table">
                      <thead>
                        <tr>
                          <th>Rôle</th>
                          <th>Nom Figma (token)</th>
                          <th>Couleur</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projectData.designSystem.colorPalette.categories.secondary.colors.map((color, index) => (
                          <tr key={index}>
                            <td>{color.role}</td>
                            <td>{color.token}</td>
                            <td>
                              <div className="color-preview" style={{ backgroundColor: color.color }}>
                                <span style={{ color: getTextColor(color.color) }}>{color.color}</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <div className="neutrals-bento-container">
                  <div className="color-bento-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: '1fr' }}>
                    {projectData.designSystem.colorPalette.categories.secondary.colors.map((colorRole, index) => {
                      const neutrals = projectData.designSystem.colorPalette.categories.neutrals.colors;
                      const textOnSecondary = projectData.designSystem.colorPalette.categories.secondary.colors.find(c => c.role.includes('Texte'));
                      const surfacePrim = neutrals.find(c => c.role === 'Surface principale');
                      
                      let config;
                      if (colorRole.role === 'Secondaire') {
                        config = { bg: colorRole.color, text: textOnSecondary?.color || '#FFFFFF', label: 'Secondaire', showText: 'Texte sur bouton' };
                      } else if (colorRole.role === 'Hover') {
                        config = { bg: colorRole.color, text: textOnSecondary?.color || '#FFFFFF', label: 'Hover', showText: 'État survol' };
                      } else if (colorRole.role.includes('Texte')) {
                        config = { bg: surfacePrim?.color || '#F1F3F4', text: colorRole.color, label: colorRole.role, showText: 'Exemple texte' };
                      } else {
                        config = { bg: colorRole.color, text: getTextColor(colorRole.color), label: colorRole.role };
                      }
                      
                      return (
                        <div 
                          key={index}
                          className="bento-square" 
                          style={{ 
                            backgroundColor: config.bg,
                            color: config.text
                          }}
                        >
                          <div className="bento-square-content">
                            <span className="bento-role">{config.label}</span>
                            {config.showText && <span className="bento-usage">{config.showText}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Accent */}
            <div className="color-category">
              <h5>{projectData.designSystem.colorPalette.categories.accent.title}</h5>
              <div className="neutrals-content-grid">
                <div className="neutrals-table-container">
                  <div className="table-wrapper">
                    <table className="color-table">
                      <thead>
                        <tr>
                          <th>Rôle</th>
                          <th>Nom Figma (token)</th>
                          <th>Couleur</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projectData.designSystem.colorPalette.categories.accent.colors.map((color, index) => (
                          <tr key={index}>
                            <td>{color.role}</td>
                            <td>{color.token}</td>
                            <td>
                              <div className="color-preview" style={{ backgroundColor: color.color }}>
                                <span style={{ color: getTextColor(color.color) }}>{color.color}</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <div className="neutrals-bento-container">
                  <div className="color-bento-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gridTemplateRows: '1fr' }}>
                    {projectData.designSystem.colorPalette.categories.accent.colors.map((colorRole, index) => {
                      const neutrals = projectData.designSystem.colorPalette.categories.neutrals.colors;
                      const textOnAccent = projectData.designSystem.colorPalette.categories.accent.colors.find(c => c.role.includes('Texte'));
                      const surfacePrim = neutrals.find(c => c.role === 'Surface principale');
                      
                      let config;
                      if (colorRole.role === 'Accent') {
                        config = { bg: colorRole.color, text: textOnAccent?.color || '#1C1C1C', label: 'Accent', showText: 'Texte sur accent' };
                      } else if (colorRole.role.includes('Texte')) {
                        config = { bg: surfacePrim?.color || '#F1F3F4', text: colorRole.color, label: colorRole.role, showText: 'Exemple texte' };
                      } else {
                        config = { bg: colorRole.color, text: getTextColor(colorRole.color), label: colorRole.role };
                      }
                      
                      return (
                        <div 
                          key={index}
                          className="bento-square" 
                          style={{ 
                            backgroundColor: config.bg,
                            color: config.text
                          }}
                        >
                          <div className="bento-square-content">
                            <span className="bento-role">{config.label}</span>
                            {config.showText && <span className="bento-usage">{config.showText}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Error */}
            <div className="color-category">
              <h5>{projectData.designSystem.colorPalette.categories.error.title}</h5>
              <div className="neutrals-content-grid">
                <div className="neutrals-table-container">
                  <div className="table-wrapper">
                    <table className="color-table">
                      <thead>
                        <tr>
                          <th>Rôle</th>
                          <th>Nom Figma (token)</th>
                          <th>Couleur</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projectData.designSystem.colorPalette.categories.error.colors.map((color, index) => (
                          <tr key={index}>
                            <td>{color.role}</td>
                            <td>{color.token}</td>
                            <td>
                              <div className="color-preview" style={{ backgroundColor: color.color }}>
                                <span style={{ color: getTextColor(color.color) }}>{color.color}</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <div className="neutrals-bento-container">
                  <div className="color-bento-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: '1fr' }}>
                    {projectData.designSystem.colorPalette.categories.error.colors.map((colorRole, index) => {
                      const neutrals = projectData.designSystem.colorPalette.categories.neutrals.colors;
                      const textOnError = projectData.designSystem.colorPalette.categories.error.colors.find(c => c.role.includes('Texte'));
                      const surfacePrim = neutrals.find(c => c.role === 'Surface principale');
                      
                      let config;
                      if (colorRole.role === 'Erreur') {
                        config = { bg: colorRole.color, text: textOnError?.color || '#FFFFFF', label: 'Erreur', showText: 'Texte sur erreur' };
                      } else if (colorRole.role === 'Hover') {
                        config = { bg: colorRole.color, text: textOnError?.color || '#FFFFFF', label: 'Hover', showText: 'État survol' };
                      } else if (colorRole.role.includes('Texte')) {
                        config = { bg: surfacePrim?.color || '#F1F3F4', text: colorRole.color, label: colorRole.role, showText: 'Exemple texte' };
                      } else {
                        config = { bg: colorRole.color, text: getTextColor(colorRole.color), label: colorRole.role };
                      }
                      
                      return (
                        <div 
                          key={index}
                          className="bento-square" 
                          style={{ 
                            backgroundColor: config.bg,
                            color: config.text
                          }}
                        >
                          <div className="bento-square-content">
                            <span className="bento-role">{config.label}</span>
                            {config.showText && <span className="bento-usage">{config.showText}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 8. Design System - Typographie */}
        <section id="typography" className="project-section typography-section">
          <h2>{projectData.designSystem.typography.title}</h2>
          <p>{projectData.designSystem.typography.description}</p>
          
          <div className="typography-content-grid">
            {/* Colonne gauche - Tableau */}
            <div className="typography-table-container">
              <div className="table-wrapper">
                <table className="typography-table">
                  <thead>
                    <tr>
                      <th>Style</th>
                      <th>typographie</th>
                      <th>exemple</th>
                      <th>taille px</th>
                      <th>Interlignage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectData.designSystem.typography.items.map((type, index) => (
                      <tr key={index}>
                        <td>{type.style}</td>
                        <td>{type.font}</td>
                        <td className="typography-example" style={{ 
                          fontSize: type.size + 'px',
                          fontFamily: type.font.includes('Inter') ? 'Inter, sans-serif' : 'inherit'
                        }}>
                          Hello {projectData.title}
                        </td>
                        <td>{type.size}</td>
                        <td>{type.lineHeight}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Colonne droite - Alphabet */}
            <div className="typography-alphabet-container">
              <div className="alphabet-display">
                {(() => {
                  // Obtenir les typographies uniques utilisées (normaliser le cas)
                  const fontsMap = new Map<string, string>();
                  projectData.designSystem.typography.items.forEach(item => {
                    const normalizedFont = item.font.trim();
                    if (!fontsMap.has(normalizedFont.toLowerCase())) {
                      fontsMap.set(normalizedFont.toLowerCase(), normalizedFont);
                    }
                  });
                  const uniqueFonts = Array.from(fontsMap.values());
                  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                  const numbers = '0123456789';
                  
                  return uniqueFonts.map((font, fontIndex) => {
                    const fontFamily = 'Inter, sans-serif';
                    const specialChars = '!@#$%&*()[]{}+-=_|\\:;"\'<>,.?/~`';
                  
                  return (
                      <div key={fontIndex} className="alphabet-font-group">
                      <div className="alphabet-font-name">
                          <h3>{font}</h3>
                      </div>
                      <div className="alphabet-letters" style={{ fontFamily }}>
                        {alphabet.split('').map((letter, idx) => (
                          <span key={idx} className="alphabet-letter">{letter}</span>
                        ))}
                      </div>
                      <div className="alphabet-numbers" style={{ fontFamily }}>
                        {numbers.split('').map((number, idx) => (
                          <span key={idx} className="alphabet-number">{number}</span>
                        ))}
                      </div>
                        <div className="alphabet-special-chars" style={{ fontFamily }}>
                          {specialChars.split('').map((char, idx) => (
                            <span key={idx} className="alphabet-special-char">{char}</span>
                          ))}
                        </div>
                      </div>
                  );
                  });
                })()}
              </div>
            </div>
          </div>
        </section>

        {/* 9. Composants - Starter Pack */}
        <section className="project-section components-section">
          <div className="section-card">
            <div className="components-header">
              <h2 className="components-title">Composants</h2>
            </div>
            <div className="components-content">
              <div className="components-wrapper">
                
                {/* Groupe Search */}
                <div className="flex flex-col gap-2">
                
                  {/* Search (loupe) blanc */}
                  <div className="bg-white box-border content-stretch flex gap-[10px] items-center justify-end p-[12px] relative rounded-[100px] shrink-0 w-[44px] h-[44px]">
                    <div className="relative shrink-0 size-[20px]">
                      <div className="absolute contents inset-[8.33%_8.31%_8.31%_8.33%]">
                        <div className="absolute inset-[8.33%_8.31%_8.31%_8.33%]">
                          <img alt="Icône de recherche" className="block max-w-none size-full" src={searchIconBlue} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Search (loupe) orange */}
                  <div className="bg-[#f07f00] box-border content-stretch flex gap-[10px] items-center justify-center p-[12px] relative rounded-[100px] shrink-0 w-[44px] h-[44px]">
                    <div className="relative shrink-0 size-[20px]">
                      <div className="absolute contents inset-[8.33%_8.31%_8.31%_8.33%]">
                        <div className="absolute inset-[8.33%_8.31%_8.31%_8.33%]">
                          <img alt="Icône de recherche" className="block max-w-none size-full" src={searchIconWhite} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Groupe Dashboard */}
                <div className="flex flex-col gap-2">

                  {/* Dashboard blanc */}
                  <div className="bg-white box-border content-stretch flex gap-[8px] h-[44px] items-center justify-center px-[16px] py-0 relative rounded-[32px] shrink-0">
                    <div className="relative shrink-0 size-[32px]">
                      <div className="absolute contents inset-[8.333%]">
                        <div className="absolute inset-[8.333%]">
                          <img alt="Icône tableau de bord" className="block max-w-none size-full" src={dashboardIconNewBlue} />
                        </div>
                      </div>
                    </div>
                    <p className="font-['Satoshi:Bold',_sans-serif] leading-[1.5] not-italic relative shrink-0 text-[#007d9f] text-[16px] text-nowrap tracking-[2.08px] uppercase whitespace-pre">Dashboard</p>
                  </div>

                  {/* Dashboard orange */}
                  <div className="bg-[#f07f00] box-border content-stretch flex gap-[8px] h-[44px] items-center justify-center px-[16px] py-0 relative rounded-[32px] shrink-0">
                    <div className="relative shrink-0 size-[32px]">
                      <div className="absolute contents inset-[8.333%]">
                        <div className="absolute inset-[8.333%]">
                          <img alt="Icône tableau de bord" className="block max-w-none size-full" src={dashboardIconNewWhite} />
                        </div>
                      </div>
                    </div>
                    <p className="font-['Satoshi:Bold',_sans-serif] leading-[1.5] not-italic relative shrink-0 text-[16px] text-nowrap text-white tracking-[2.08px] uppercase whitespace-pre">Dashboard</p>
                  </div>
                </div>

                {/* Groupe Client */}
                <div className="flex flex-col gap-2">
                  {/* Client blanc */}
                  <div className="bg-white box-border content-stretch flex gap-[8px] h-[44px] items-center justify-center px-[16px] py-0 relative rounded-[32px] shrink-0">
                    <div className="relative shrink-0 size-[32px]">
                      <div className="absolute contents inset-[8.333%]">
                        <div className="absolute inset-[8.333%]">
                          <img alt="Icône tableau de bord" className="block max-w-none size-full" src={dashboardIconWhite} />
                        </div>
                      </div>
                    </div>
                    <p className="font-bold text-[#007d9f] text-[16px] tracking-[2.08px] uppercase">Client</p>
                  </div>

                  {/* Client orange */}
                  <div className="bg-[#f07f00] box-border content-stretch flex gap-[8px] h-[44px] items-center justify-center px-[16px] py-0 relative rounded-[32px] shrink-0">
                    <div className="relative shrink-0 size-[32px]">
                      <div className="absolute contents inset-[8.333%]">
                        <div className="absolute inset-[8.333%]">
                          <img alt="Icône tableau de bord" className="block max-w-none size-full" src={dashboardIconBlue} />
                        </div>
                      </div>
                    </div>
                    <p className="font-bold text-white text-[16px] tracking-[2.08px] uppercase">Client</p>
                  </div>

                  {/* Client bleu */}
                  <div className="bg-[#007d9f] box-border content-stretch flex gap-[8px] h-[44px] items-center justify-center px-[16px] py-0 relative rounded-[32px] shrink-0">
                    <div className="relative shrink-0 size-[32px]">
                      <div className="absolute contents inset-[8.333%]">
                        <div className="absolute inset-[8.333%]">
                          <img alt="Icône client" className="block max-w-none size-full" src={clientIconBlue} />
                        </div>
                      </div>
                    </div>
                    <p className="font-bold text-white text-[16px] tracking-[2.08px] uppercase">Client</p>
                  </div>
                </div>

                {/* Groupe Filter */}
                <div className="flex flex-col gap-2">
                  {/* Filter (filtre) blanc */}
                  <div className="bg-white box-border content-stretch flex gap-[10px] items-center justify-end p-[12px] relative rounded-[100px] shrink-0 w-[44px] h-[44px]">
                    <div className="flex h-[calc(1px*((var(--transform-inner-width)*1)+(var(--transform-inner-height)*0)))] items-center justify-center relative shrink-0 w-[calc(1px*((var(--transform-inner-height)*1)+(var(--transform-inner-width)*0)))]" style={{ "--transform-inner-width": "0", "--transform-inner-height": "0" } as CSSProperties}>
                      <div className="flex-none rotate-[270deg]">
                        <div className="relative size-[24px]">
                          <div className="absolute contents inset-[8.333%]">
                            <div className="absolute inset-[8.333%]">
                              <img alt="Icône filtre" className="block max-w-none size-full" src={filterIconWhite} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Filter (filtre) orange */}
                  <div className="bg-[#f07f00] box-border content-stretch flex gap-[10px] items-center justify-center p-[12px] relative rounded-[100px] shrink-0 w-[44px] h-[44px]">
                    <div className="flex h-[calc(1px*((var(--transform-inner-width)*1)+(var(--transform-inner-height)*0)))] items-center justify-center relative shrink-0 w-[calc(1px*((var(--transform-inner-height)*1)+(var(--transform-inner-width)*0)))]" style={{ "--transform-inner-width": "0", "--transform-inner-height": "0" } as CSSProperties}>
                      <div className="flex-none rotate-[270deg]">
                        <div className="relative size-[24px]">
                          <div className="absolute contents inset-[8.333%]">
                            <div className="absolute inset-[8.333%]">
                              <img alt="Icône filtre" className="block max-w-none size-full" src={filterIconBlue} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Groupe Expand */}
                <div className="flex flex-col gap-2">
                  {/* Expand (flèche) blanc */}
                  <div className="bg-white box-border content-stretch flex gap-[10px] items-center justify-end p-[12px] relative rounded-[100px] shrink-0 w-[44px] h-[44px]">
                    <div className="flex h-[calc(1px*((var(--transform-inner-width)*0.7071067690849304)+(var(--transform-inner-height)*0.7071067690849304)))] items-center justify-center relative shrink-0 w-[calc(1px*((var(--transform-inner-height)*0.7071067690849304)+(var(--transform-inner-width)*0.7071067690849304)))]" style={{ "--transform-inner-width": "0", "--transform-inner-height": "0" } as CSSProperties}>
                      <div className="flex-none rotate-[315deg]">
                        <div className="h-[16px] relative w-[14px]">
                          <img alt="Icône expansion" className="block max-w-none size-full" src={expandIconWhite} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expand (flèche) orange */}
                  <div className="bg-[#f07f00] box-border content-stretch flex gap-[10px] items-center justify-center p-[12px] relative rounded-[100px] shrink-0 w-[44px] h-[44px]">
                    <div className="flex h-[calc(1px*((var(--transform-inner-width)*0.7071067690849304)+(var(--transform-inner-height)*0.7071067690849304)))] items-center justify-center relative shrink-0 w-[calc(1px*((var(--transform-inner-height)*0.7071067690849304)+(var(--transform-inner-width)*0.7071067690849304)))]" style={{ "--transform-inner-width": "0", "--transform-inner-height": "0" } as CSSProperties}>
                      <div className="flex-none rotate-[315deg]">
                        <div className="h-[16px] relative w-[14px]">
                          <img alt="Icône expansion" className="block max-w-none size-full" src={expandIconBlue} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Groupe Pen */}
                <div className="flex flex-col gap-2">
                  {/* Pen-to-square (stylo) blanc */}
                  <div className="bg-white box-border content-stretch flex gap-[10px] items-center justify-end p-[12px] relative rounded-[100px] shrink-0 w-[44px] h-[44px]">
                    <div className="relative shrink-0 size-[20px]">
                      <img alt="Icône stylo" className="block max-w-none size-full" src={penIconWhite} />
                    </div>
                  </div>

                  {/* Pen-to-square (stylo) orange */}
                  <div className="bg-[#f07f00] box-border content-stretch flex gap-[10px] items-center justify-center p-[12px] relative rounded-[100px] shrink-0 w-[44px] h-[44px]">
                    <div className="relative shrink-0 size-[20px]">
                      <img alt="Icône stylo" className="block max-w-none size-full" src={penIconBlue} />
                    </div>
                  </div>
                </div>

                {/* Groupe Bell */}
                <div className="flex flex-col gap-2">
                  {/* Bell (cloche) blanc */}
                  <div className="bg-white box-border content-stretch flex gap-[10px] items-center justify-end p-[12px] relative rounded-[100px] shrink-0 w-[44px] h-[44px]">
                    <div className="h-[28px] relative shrink-0 w-[24px]">
                      <img alt="Icône notification" className="block max-w-none size-full" src={bellIconWhite} />
                    </div>
                  </div>

                  {/* Bell (cloche) orange */}
                  <div className="bg-[#f07f00] box-border content-stretch flex gap-[10px] items-center justify-center p-[12px] relative rounded-[100px] shrink-0 w-[44px] h-[44px]">
                    <div className="h-[28px] relative shrink-0 w-[24px]">
                      <img alt="Icône notification" className="block max-w-none size-full" src={bellIconBlue} />
                    </div>
                  </div>
                </div>

                {/* Groupe Contact */}
                <div className="flex flex-col gap-2">
                  {/* Contact blanc */}
                  <div className="bg-white box-border content-stretch flex gap-[8px] h-[44px] items-center justify-center px-[16px] py-0 relative rounded-[32px] shrink-0">
                    <div className="relative shrink-0 size-[32px]">
                      <div className="absolute contents inset-[8.333%]">
                        <div className="absolute inset-[8.333%]">
                          <img alt="Icône contact" className="block max-w-none size-full" src={contactIconBlue} />
                        </div>
                      </div>
                    </div>
                    <p className="font-['Satoshi:Bold',_sans-serif] leading-[1.5] not-italic relative shrink-0 text-[#007d9f] text-[16px] text-nowrap tracking-[2.08px] uppercase whitespace-pre">Contact</p>
                  </div>

                  {/* Contact orange */}
                  <div className="bg-[#f07f00] box-border content-stretch flex gap-[8px] h-[44px] items-center justify-center px-[16px] py-0 relative rounded-[32px] shrink-0">
                    <div className="relative shrink-0 size-[32px]">
                      <div className="absolute contents inset-[8.333%]">
                        <div className="absolute inset-[8.333%]">
                          <img alt="Icône contact" className="block max-w-none size-full" src={contactIconWhite} />
                        </div>
                      </div>
                    </div>
                    <p className="font-['Satoshi:Bold',_sans-serif] leading-[1.5] not-italic relative shrink-0 text-[16px] text-nowrap text-white tracking-[2.08px] uppercase whitespace-pre">Contact</p>
                  </div>
                </div>

                {/* Groupe Formation */}
                <div className="flex flex-col gap-2">
                  {/* Formation blanc */}
                  <div className="bg-white box-border content-stretch flex gap-[8px] h-[44px] items-center justify-center px-[16px] py-0 relative rounded-[32px] shrink-0">
                    <div className="relative shrink-0 size-[32px]">
                      <div className="absolute contents inset-[8.333%]">
                        <div className="absolute inset-[8.333%]">
                          <img alt="Icône formation" className="block max-w-none size-full" src={formationIconBlue} />
                        </div>
                      </div>
                    </div>
                    <p className="font-['Satoshi:Bold',_sans-serif] leading-[1.5] not-italic relative shrink-0 text-[#007d9f] text-[16px] text-nowrap tracking-[2.08px] uppercase whitespace-pre">Formation</p>
                  </div>

                  {/* Formation orange */}
                  <div className="bg-[#f07f00] box-border content-stretch flex gap-[8px] h-[44px] items-center justify-center px-[16px] py-0 relative rounded-[32px] shrink-0">
                    <div className="relative shrink-0 size-[32px]">
                      <div className="absolute contents inset-[8.333%]">
                        <div className="absolute inset-[8.333%]">
                          <img alt="Icône formation" className="block max-w-none size-full" src={formationIconWhite} />
                        </div>
                      </div>
                    </div>
                    <p className="font-['Satoshi:Bold',_sans-serif] leading-[1.5] not-italic relative shrink-0 text-[16px] text-nowrap text-white tracking-[2.08px] uppercase whitespace-pre">Formation</p>
                  </div>
                </div>

                {/* Groupe Boutique */}
                <div className="flex flex-col gap-2">
                  {/* Boutique blanc */}
                  <div className="bg-white box-border content-stretch flex gap-[8px] h-[44px] items-center justify-center px-[16px] py-0 relative rounded-[32px] shrink-0">
                    <div className="relative shrink-0 size-[32px]">
                      <div className="absolute contents inset-[8.333%]">
                        <div className="absolute inset-[8.333%]">
                          <img alt="Icône boutique" className="block max-w-none size-full" src={boutiqueIconBlue} />
                        </div>
                      </div>
                    </div>
                    <p className="font-['Satoshi:Bold',_sans-serif] leading-[1.5] not-italic relative shrink-0 text-[#007d9f] text-[16px] text-nowrap tracking-[2.08px] uppercase whitespace-pre">Boutique</p>
                  </div>

                  {/* Boutique orange */}
                  <div className="bg-[#f07f00] box-border content-stretch flex gap-[8px] h-[44px] items-center justify-center px-[16px] py-0 relative rounded-[32px] shrink-0">
                    <div className="relative shrink-0 size-[32px]">
                      <div className="absolute contents inset-[8.333%]">
                        <div className="absolute inset-[8.333%]">
                          <img alt="Icône boutique" className="block max-w-none size-full" src={boutiqueIconWhite} />
                        </div>
                      </div>
                    </div>
                    <p className="font-['Satoshi:Bold',_sans-serif] leading-[1.5] not-italic relative shrink-0 text-[16px] text-nowrap text-white tracking-[2.08px] uppercase whitespace-pre">Boutique</p>
                  </div>
                </div>

                {/* Groupe Laboratoire */}
                <div className="flex flex-col gap-2">
                  {/* Laboratoire blanc */}
                  <div className="bg-white box-border content-stretch flex gap-[8px] h-[44px] items-center justify-center px-[16px] py-0 relative rounded-[32px] shrink-0">
                    <div className="relative shrink-0 size-[32px]">
                      <div className="absolute contents inset-[8.333%]">
                        <div className="absolute inset-[8.333%]">
                          <img alt="Icône laboratoire" className="block max-w-none size-full" src={laboratoireIconBlue} />
                        </div>
                      </div>
                    </div>
                    <p className="font-['Satoshi:Bold',_sans-serif] leading-[1.5] not-italic relative shrink-0 text-[#007d9f] text-[16px] text-nowrap tracking-[2.08px] uppercase whitespace-pre">Laboratoire</p>
                  </div>

                  {/* Laboratoire orange */}
                  <div className="bg-[#f07f00] box-border content-stretch flex gap-[8px] h-[44px] items-center justify-center px-[16px] py-0 relative rounded-[32px] shrink-0">
                    <div className="relative shrink-0 size-[32px]">
                      <div className="absolute contents inset-[8.333%]">
                        <div className="absolute inset-[8.333%]">
                          <img alt="Icône laboratoire" className="block max-w-none size-full" src={laboratoireIconWhite} />
                        </div>
                      </div>
                    </div>
                    <p className="font-['Satoshi:Bold',_sans-serif] leading-[1.5] not-italic relative shrink-0 text-[16px] text-nowrap text-white tracking-[2.08px] uppercase whitespace-pre">Laboratoire</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 10. Implémentation & Technologies */}
        {projectData.implementation && (
          <section id="implementation" className="project-section implementation-section">
            <div className="section-card">
              <h2 className="section-title">Implémentation & Technologies</h2>
              <div className="section-content">
                <div className="tech-stack">
                  {projectData.implementation.technologies.map((tech, index) => (
                    <span key={index} className="tech-badge">{tech}</span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 11. Résultats & Impact */}
        {projectData.results && (
          <section id="results" className="project-section results-section">
            <div className="section-card">
              <h2 className="section-title">Résultats & Impact</h2>
              
              {/* Section des donut charts */}
              {projectData.results.metrics && projectData.results.metrics.length > 0 && (
                <div className="results-bottom-section">
                  {projectData.results.metrics.map((metric, index) => {
                    // Extraire la valeur numérique du texte (ex: "40% sur la gestion quotidienne" -> 40)
                    const valueMatch = metric.value.match(/(\d+)%/);
                    const numericValue = valueMatch ? parseInt(valueMatch[1], 10) : 0;
                    
                    return (
                      <div key={index} className="results-bottom-content">
                        {/* Colonne gauche - Donut chart animé */}
                        <div className="results-left-column">
                          <DonutChartRace
                            value={numericValue}
                            color="#f1582a"
                            size={200}
                            animated={true}
                            delay={index * 200} // Délai progressif pour l'effet "race"
                          />
                        </div>
                        
                        {/* Colonne droite - Titre et description */}
                        <div className="results-right-column">
                          <p className="results-bottom-subtitle">{metric.label}</p>
                          <p className="results-bottom-percentage">{metric.value}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* Feedback et améliorations si disponibles */}
              {projectData.results.feedback && (
                <div className="results-feedback" style={{ marginTop: '32px' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: 500, color: '#070912', marginBottom: '16px' }}>
                    Retour client
                  </h3>
                  <p style={{ fontSize: '16px', lineHeight: 1.8, color: '#222' }}>
                    {projectData.results.feedback}
                  </p>
                </div>
              )}
              
              {projectData.results.improvements && (
                <div className="results-improvements" style={{ marginTop: '24px' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: 500, color: '#070912', marginBottom: '16px' }}>
                    Pistes d'amélioration
                  </h3>
                  <p style={{ fontSize: '16px', lineHeight: 1.8, color: '#222' }}>
                    {projectData.results.improvements}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}
        </div>
      </motion.div>
    </>
  );
};

export default SingleProjectNew;
