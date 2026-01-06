import './AboutNew.css'
import './About.css'
import { useState, useEffect, useMemo } from 'react'
import { TreeNode } from './flow/FlowTree'
import { flowData } from '../data/flowData'
import type { FlowNodeData } from '../data/flowData'
// @ts-expect-error - DotGrid is a JSX file without type declarations
import DotGrid from './DotGrid.jsx'
import HoverCard from './HoverCard'
import { aboutData } from '../data/aboutData'
import HumanBody3D from './HumanBody3D'
import StravaMap from './StravaMap'
import StravaRadarChart from './StravaRadarChart'
import TrainingJournalChart from './TrainingJournalChart'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
import { getStravaActivities, getStravaActivitiesByYear, getStravaAthlete, getStravaActivityDetails, formatDistance, formatTime, formatDate, type StravaActivity, type StravaAthlete } from '../services/stravaService'

const AboutNew = () => {
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set())
  const [selectedNodeData, setSelectedNodeData] = useState<FlowNodeData | null>(null)
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null)
  const [activeSection, setActiveSection] = useState<string>('about-intro')
  const [stravaActivities, setStravaActivities] = useState<StravaActivity[]>([])
  const [stravaActivities2025, setStravaActivities2025] = useState<StravaActivity[]>([])
  const [stravaActivitiesDetails, setStravaActivitiesDetails] = useState<StravaActivity[]>([])
  const [stravaLoading, setStravaLoading] = useState<boolean>(true)
  const [stravaError, setStravaError] = useState<string | null>(null)
  const [stravaAthlete, setStravaAthlete] = useState<StravaAthlete | null>(null)

  // Trouver le nœud dans les données
  const findNode = (data: FlowNodeData, id: string): FlowNodeData | null => {
    if (data.id === id) return data
    if (data.branches) {
      for (const branch of data.branches) {
        const found = findNode(branch, id)
        if (found) return found
      }
    }
    if (data.next) {
      const found = findNode(data.next, id)
      if (found) return found
    }
    return null
  }

  // Trouver tous les ascendants (parents) d'un nœud
  const findAncestors = (data: FlowNodeData, targetId: string, path: string[] = []): string[] | null => {
    // Si on a trouvé le nœud cible, retourner le chemin
    if (data.id === targetId) {
      return path
    }

    // Chercher dans les branches
    if (data.branches) {
      for (const branch of data.branches) {
        const result = findAncestors(branch, targetId, [...path, data.id])
        if (result) return result
      }
    }

    // Chercher dans next
    if (data.next) {
      const result = findAncestors(data.next, targetId, [...path, data.id])
      if (result) return result
    }

    return null
  }

  const handleNodeClick = (nodeId: string, event?: React.MouseEvent) => {
    const node = findNode(flowData, nodeId)
    
    if (node) {
      if (selectedNodeData?.id === nodeId) {
        // Si on clique sur le même nœud, fermer la popup
        setSelectedNodeData(null)
        setPopupPosition(null)
        setSelectedNodes(new Set())
      } else {
        // Sinon, ouvrir la popup et désélectionner tous les autres nœuds
        if (event) {
          const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
          const containerRect = document.querySelector('.skill-tree-container')?.getBoundingClientRect()
          
          if (containerRect) {
            // Positionner la popup à droite du nœud avec un petit offset
            setPopupPosition({
              x: rect.right - containerRect.left + 16,
              y: rect.top - containerRect.top + (rect.height / 2)
            })
          }
        }
        setSelectedNodeData(node)
        
        // Trouver tous les ascendants du nœud sélectionné
        const ancestors = findAncestors(flowData, nodeId)
        const nodesToSelect = ancestors ? [...ancestors, nodeId] : [nodeId]
        
        // Remplacer complètement le Set avec le nœud et tous ses ascendants
        setSelectedNodes(new Set(nodesToSelect))
      }
    }
  }

  const closePopup = () => {
    setSelectedNodeData(null)
    setPopupPosition(null)
  }

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId)
    const element = document.getElementById(sectionId)
    if (element) {
      const offset = 120 // Offset pour tenir compte de la barre de recherche
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - offset

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
    }
  }

  // Fonction pour récupérer l'URL de la photo de l'activité
  const getActivityPhotoUrl = (activity: StravaActivity): string | undefined => {
    if (activity?.primary_photo?.urls?.['600']) {
      return activity.primary_photo.urls['600']
    }
    if (activity?.photos?.primary?.urls?.['600']) {
      return activity.photos.primary.urls['600']
    }
    return undefined
  }

  // Calculer le total de kilomètres pour 2025
  const totalKm2025 = useMemo(() => {
    const totalMeters = stravaActivities2025.reduce((sum, activity) => sum + activity.distance, 0)
    return Math.round(totalMeters / 1000) // Convertir en km et arrondir
  }, [stravaActivities2025])

  // Récupérer les activités Strava et les infos de l'athlète
  useEffect(() => {
    const fetchStravaData = async () => {
      try {
        setStravaLoading(true)
        setStravaError(null)
        
        console.log('🔄 Début du chargement des données Strava...')
        
        // Récupérer les activités et les infos de l'athlète en parallèle
        const [activitiesResult, activities2025Result, athleteResult] = await Promise.allSettled([
          getStravaActivities(5),
          getStravaActivitiesByYear(2025),
          getStravaAthlete()
        ])
        
        // Traiter les résultats
        let activities: StravaActivity[] = []
        let activities2025: StravaActivity[] = []
        let athlete: StravaAthlete | null = null
        let hasError = false
        const errors: string[] = []
        
        if (activitiesResult.status === 'fulfilled') {
          activities = activitiesResult.value
          console.log(`✅ Activités chargées: ${activities.length}`)
        } else {
          console.error('❌ Erreur getStravaActivities:', activitiesResult.reason)
          errors.push(`Activités: ${activitiesResult.reason?.message || 'Erreur inconnue'}`)
          hasError = true
        }
        
        if (activities2025Result.status === 'fulfilled') {
          activities2025 = activities2025Result.value
          console.log(`✅ Activités 2025 chargées: ${activities2025.length}`)
        } else {
          console.error('❌ Erreur getStravaActivitiesByYear:', activities2025Result.reason)
          errors.push(`Activités 2025: ${activities2025Result.reason?.message || 'Erreur inconnue'}`)
          hasError = true
        }
        
        if (athleteResult.status === 'fulfilled') {
          athlete = athleteResult.value
          console.log('✅ Athlète chargé:', athlete?.firstname)
        } else {
          console.error('❌ Erreur getStravaAthlete:', athleteResult.reason)
          errors.push(`Athlète: ${athleteResult.reason?.message || 'Erreur inconnue'}`)
          hasError = true
        }
        
        setStravaActivities(activities)
        setStravaActivities2025(activities2025)
        setStravaAthlete(athlete)
        
        // Si on a des erreurs mais pas de données, afficher l'erreur
        if (hasError && activities.length === 0 && activities2025.length === 0 && !athlete) {
          setStravaError(errors.join(' | '))
        }
        
        // Récupérer les détails des activités (avec photos et polylines)
        if (activities.length > 0) {
          try {
            console.log('🔄 Chargement des détails des activités...')
            const activitiesDetails = await Promise.all(
              activities.map(activity => 
                getStravaActivityDetails(activity.id).catch((err) => {
                  console.warn(`⚠️ Erreur détails activité ${activity.id}:`, err)
                  return activity
                })
              )
            )
            setStravaActivitiesDetails(activitiesDetails)
            console.log(`✅ Détails chargés pour ${activitiesDetails.length} activités`)
          } catch (error) {
            console.warn('⚠️ Erreur lors de la récupération des détails des activités:', error)
            // En cas d'erreur, utiliser les activités de base
            setStravaActivitiesDetails(activities)
          }
        } else {
          setStravaActivitiesDetails([])
        }
        
        console.log('✅ Chargement Strava terminé')
      } catch (error) {
        console.error('❌ Erreur globale lors du chargement des données Strava:', error)
        setStravaError(error instanceof Error ? error.message : 'Erreur lors du chargement des données')
      } finally {
        setStravaLoading(false)
      }
    }

    fetchStravaData()
  }, [])

  return (
    <div className="page active apropos-new-page">
      <div className="apropos-new-page-bg">
        <DotGrid
          dotSize={3}
          gap={10}
          baseColor="#b51a00"
          activeColor="#e32400"
          proximity={140}
          speedTrigger={100}
          shockRadius={240}
          shockStrength={5}
          maxSpeed={5000}
          resistance={750}
          returnDuration={1.5}
        />
      </div>
      
      {/* Menu de navigation sous la search bar */}
      <div className="about-new-nav-menu">
        <button 
          className={`nav-menu-button ${activeSection === 'about-intro' ? 'active' : ''}`}
          onClick={() => scrollToSection('about-intro')}
        >
          Introduction
        </button>
        <button 
          className={`nav-menu-button ${activeSection === 'about-description' ? 'active' : ''}`}
          onClick={() => scrollToSection('about-description')}
        >
          Description
        </button>
        <button 
          className={`nav-menu-button ${activeSection === 'about-tree' ? 'active' : ''}`}
          onClick={() => scrollToSection('about-tree')}
        >
          Arbre de compétences
        </button>
      </div>

      <div className="main-apropos-new">
        {/* ============================================
            SECTION INTRODUCTION - 3 COLONNES AVEC SILHOUETTE 3D
            ============================================ */}
        {activeSection === 'about-intro' && (
          <div id="about-intro" className="intro-three-columns">
            {/* Header avec (C) theme / about */}
            <div className="skill-tree-header">
              <div className="skill-tree-header-left">
                <span>(C)</span>
                <span>theme</span>
              </div>
              <div className="skill-tree-header-right">about</div>
            </div>
            
            {/* ============================================
                .intro-columns-container
                Container principal pour le layout en 3 colonnes
                Structure: [Gauche] [Centre 3D] [Droite]
                
                CSS: grid-template-columns: 1fr auto 1fr
                - Colonne gauche (1fr): Cartes Strava (Profil + Performance)
                - Colonne centre (auto): Modèle 3D HumanBody3D
                - Colonne droite (1fr): Cartes Strava (Entraînement + Activités)
                ============================================ */}
            <div className="intro-columns-container">
              {/* ============================================
                  COLONNE GAUCHE - .intro-column-left
                  Contient 2 cartes Strava :
                  1. Profil (nom, ville, poids)
                  2. Performance (graphique radar + total km 2025)
                  ============================================ */}
              <div className="intro-column intro-column-left">
                {/* Première carte - Informations personnelles */}
                <div className="hero-card services-card">
                  <div className="card-header">
                    <h2 className="card-title">Profil</h2>
                    <div className="card-arrow">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="arrow-icon">
                        <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                  <div className="services-content">
                    {stravaLoading ? (
                      <div className="service-item">
                        <div className="service-text">
                          <p style={{ color: '#71717a', fontSize: '14px' }}>Chargement...</p>
                        </div>
                      </div>
                    ) : stravaError ? (
                      <div className="service-item">
                        <div className="service-text">
                          <p style={{ color: '#f1582a', fontSize: '14px' }}>Erreur de chargement</p>
                        </div>
                      </div>
                    ) : stravaAthlete ? (
                      <>
                        <div className="service-item">
                          <div className="service-text">
                            <p className="service-description" style={{ marginBottom: '12px', fontWeight: '600', color: '#000000', fontSize: '16px' }}>
                              {stravaAthlete.firstname} {stravaAthlete.lastname}
                            </p>
                            <div className="service-tags">
                              {stravaAthlete.city && (
                                <span className="tag">{stravaAthlete.city}</span>
                              )}
                              {stravaAthlete.state && (
                                <span className="tag">{stravaAthlete.state}</span>
                              )}
                              {stravaAthlete.country && (
                                <span className="tag">{stravaAthlete.country}</span>
                              )}
                            </div>
                            {stravaAthlete.weight && (
                              <p style={{ color: '#71717a', fontSize: '12px', marginTop: '8px' }}>
                                Poids: {stravaAthlete.weight} kg
                              </p>
                            )}
                          </div>
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>

                {/* Deuxième carte - Graphique Radar Strava */}
                <div className="hero-card services-card strava-radar-card">
                  <div className="card-header">
                    <h2 className="card-title">Performance</h2>
                    <div className="card-arrow">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="arrow-icon">
                        <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                  <div className="services-content strava-radar-content">
                    {stravaLoading ? (
                      <div className="strava-radar-placeholder">
                        <p>Chargement des données...</p>
                      </div>
                    ) : stravaError ? (
                      <div className="strava-radar-placeholder">
                        <p style={{ color: '#f1582a', marginBottom: '8px' }}>Erreur</p>
                        <p style={{ fontSize: '12px', color: '#71717a' }}>{stravaError}</p>
                      </div>
                    ) : stravaActivities2025.length === 0 ? (
                      <div className="strava-radar-placeholder">
                        <p>Aucune activité disponible</p>
                      </div>
                    ) : (
                      <>
                        <div className="strava-total-km">
                          <p className="strava-total-km-label">Total 2025</p>
                          <p className="strava-total-km-value">{totalKm2025} km</p>
                        </div>
                        <StravaRadarChart activities={stravaActivities2025} />
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              {/* ============================================
                  COLONNE CENTRALE - .intro-column-center
                  Contient le modèle 3D HumanBody3D
                  - Affichage du nuage de points
                  - Rotation automatique avec OrbitControls
                  - Responsive: devient pleine largeur sur mobile
                  ============================================ */}
              <div className="intro-column intro-column-center">
                <div className="human-silhouette-container">
                  <HumanBody3D />
                </div>
              </div>
              
              {/* ============================================
                  COLONNE DROITE - .intro-column-right
                  Contient 2 cartes Strava :
                  1. Entraînement (graphique journal d'entraînement)
                  2. Activités (carousel Swiper avec les 5 dernières activités)
                  ============================================ */}
              <div className="intro-column intro-column-right">
                {/* Première carte - Graphique d'entraînement */}
                <div className="hero-card services-card">
                  <div className="card-header">
                    <h2 className="card-title">Entraînement</h2>
                    <div className="card-arrow">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="arrow-icon">
                        <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                  <div className="services-content strava-stats-content">
                    {stravaLoading ? (
                      <div style={{ width: '100%', height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(0,0,0,0.4)', fontSize: '14px' }}>
                        Chargement des données...
                      </div>
                    ) : stravaError ? (
                      <div style={{ width: '100%', height: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#f1582a', fontSize: '14px', padding: '16px', textAlign: 'center' }}>
                        <p style={{ marginBottom: '8px', fontWeight: '500' }}>Erreur</p>
                        <p style={{ fontSize: '12px', color: '#71717a' }}>{stravaError}</p>
                      </div>
                    ) : stravaActivities2025.length === 0 ? (
                      <div style={{ width: '100%', height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(0,0,0,0.4)', fontSize: '14px' }}>
                        Aucune activité disponible
                      </div>
                    ) : (
                      <TrainingJournalChart activities={stravaActivities2025} />
                    )}
                  </div>
                </div>
                
                {/* Deuxième carte - Activités Strava */}
                <div className="hero-card services-card">
                  <div className="card-header">
                    <h2 className="card-title">Activités</h2>
                    <div className="card-arrow">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="arrow-icon">
                        <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                  <div className="services-content">
                    {stravaLoading ? (
                      <div className="service-item">
                        <div className="service-text">
                          <p style={{ color: '#71717a', fontSize: '14px' }}>Chargement des activités...</p>
                        </div>
                      </div>
                    ) : stravaError ? (
                      <div className="service-item">
                        <div className="service-text">
                          <p style={{ color: '#f1582a', fontSize: '14px', marginBottom: '8px', fontWeight: '500' }}>
                            Erreur de connexion Strava
                          </p>
                          <p style={{ color: '#71717a', fontSize: '12px' }}>
                            {stravaError}
                          </p>
                        </div>
                      </div>
                    ) : stravaActivitiesDetails.length > 0 ? (
                      <Swiper
                        modules={[Pagination]}
                        spaceBetween={16}
                        slidesPerView={1}
                        pagination={{ 
                          clickable: true,
                          bulletClass: 'swiper-pagination-bullet custom-bullet',
                          bulletActiveClass: 'swiper-pagination-bullet-active custom-bullet-active'
                        }}
                        className="strava-activities-swiper"
                      >
                        {stravaActivitiesDetails.map((activity, index) => {
                          const photoUrl = getActivityPhotoUrl(activity)
                          const polyline = activity.map?.summary_polyline || ''
                          const hasBackground = !!photoUrl
                          
                          return (
                            <SwiperSlide key={activity.id || index}>
                              <div className="service-item" style={{ 
                                background: hasBackground ? `url(${photoUrl}) center/cover` : 'transparent',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                position: 'relative',
                                minHeight: '200px'
                              }}>
                                {hasBackground && (
                                  <div style={{
                                    position: 'absolute',
                                    inset: 0,
                                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.7))',
                                    zIndex: 1
                                  }} />
                                )}
                                <div className="service-text" style={{ 
                                  position: 'relative', 
                                  zIndex: 2,
                                  color: hasBackground ? '#ffffff' : '#000000'
                                }}>
                                  <p className="service-description" style={{ 
                                    fontWeight: '600', 
                                    fontSize: '16px',
                                    marginBottom: '8px',
                                    color: hasBackground ? '#ffffff' : '#000000'
                                  }}>
                                    {activity.name}
                                  </p>
                                  <div className="service-tags">
                                    <span className="tag">{activity.type}</span>
                                    <span className="tag">{formatDistance(activity.distance)} km</span>
                                    <span className="tag">{formatTime(activity.moving_time)}</span>
                                    {activity.total_elevation_gain > 0 && (
                                      <span className="tag">+{Math.round(activity.total_elevation_gain)}m</span>
                                    )}
                                  </div>
                                  <p style={{ color: hasBackground ? 'rgba(255, 255, 255, 0.9)' : '#71717a', fontSize: '12px', marginTop: '4px' }}>
                                    {formatDate(activity.start_date_local)}
                                  </p>
                                </div>
                                <div className="service-arrow">
                                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="arrow-icon">
                                    <path d="M7 17L17 7M17 7H7M17 7V17" stroke={hasBackground ? '#ffffff' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </div>
                                {polyline && (
                                  <div style={{ 
                                    position: 'absolute', 
                                    bottom: 0, 
                                    left: 0, 
                                    right: 0, 
                                    height: '60px',
                                    opacity: 0.3,
                                    zIndex: 1
                                  }}>
                                    <StravaMap polyline={polyline} />
                                  </div>
                                )}
                              </div>
                            </SwiperSlide>
                          )
                        })}
                      </Swiper>
                    ) : stravaError ? (
                      <div className="service-item">
                        <div className="service-text">
                          <p style={{ color: '#f1582a', fontSize: '14px', marginBottom: '8px', fontWeight: '500' }}>
                            Erreur de connexion Strava
                          </p>
                          <p style={{ color: '#71717a', fontSize: '12px' }}>
                            {stravaError}
                          </p>
                          <p style={{ color: '#71717a', fontSize: '11px', marginTop: '8px', fontStyle: 'italic' }}>
                            Vérifiez que vercel dev est lancé et que les variables d'environnement sont configurées.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="service-item">
                        <div className="service-text">
                          <p style={{ color: '#71717a', fontSize: '14px' }}>Aucune activité disponible</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section Description - Contenu de About */}
        {activeSection === 'about-description' && (
          <div id="about-description" className="about-intro-content-wrapper">
            <div className="about-intro-section">
              <div className="about-intro-content">
                <div className="about-text-column">
                  <h2 className="about-intro-title">À propos de moi</h2>
                  <p className="about-intro-description">
                    Passionné par le design et le développement, je crée des expériences digitales 
                    qui marquent les esprits. Mon approche allie créativité et technique pour 
                    transformer vos idées en solutions innovantes.
                  </p>
                  <p className="about-intro-description">
                    Spécialisé dans le design d'interface et le développement front-end, 
                    je mets mon expertise au service de projets variés, de l'application mobile 
                    au site web corporate.
                  </p>
                </div>
                <div className="about-photo-column">
                  <div className="about-photo-container">
                    <img 
                      src="/images/portrait-anthony.jpg" 
                      alt="Anthony Merault" 
                      className="about-photo"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section listing - Statistiques */}
            <div className="listing-section">
              {aboutData.stats.map((stat, index) => (
                <HoverCard key={index} intensity={0.05} scale={1.02}>
                  <div className="stat-card">
                    {stat.label === 'Niveau' ? (
                      <>
                        <p>{stat.label}</p>
                        <h3>{stat.value}</h3>
                      </>
                    ) : (
                      <>
                        <h3>{stat.value}</h3>
                        <p>{stat.label}</p>
                      </>
                    )}
                  </div>
                </HoverCard>
              ))}
            </div>

            {/* Carte principale cardLg */}
            <div className="card-lg">
              <div className="card-border"></div>
              <p className="card-title">{aboutData.mainDescription.title}</p>
              <div className="card-content">
                {aboutData.mainDescription.content.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </div>

            {/* Section content - Deux colonnes */}
            <div className="content-section">
              {/* Colonne gauche */}
              <div className="content-left">
                {/* Carte Compétences */}
                <div className="card-small">
                  <div className="card-border"></div>
                  <p className="card-title">{aboutData.skills.title}</p>
                  <div className="card-content">
                    {aboutData.skills.items.map((skill, index) => (
                      <p key={index}>{skill}</p>
                    ))}
                  </div>
                </div>

                {/* Carte Outils */}
                <div className="card-small">
                  <div className="card-border"></div>
                  <p className="card-title">{aboutData.tools.title}</p>
                  <div className="card-content">
                    {aboutData.tools.items.map((tool, index) => (
                      <p key={index}>{tool}</p>
                    ))}
                  </div>
                </div>

                {/* Carte Intérêts */}
                <div className="card-small">
                  <div className="card-border"></div>
                  <p className="card-title">{aboutData.interests.title}</p>
                  <div className="card-content">
                    {aboutData.interests.items.map((interest, index) => (
                      <p key={index}>{interest}</p>
                    ))}
                  </div>
                </div>
              </div>

              {/* Colonne droite - Expériences */}
              <div className="content-right">
                <div className="card-large">
                  <div className="card-border"></div>
                  <p className="card-title">Expériences</p>

                  {aboutData.experiences.map((experience, index) => (
                    <div key={index} className="experience-item">
                      <div className="experience-header">
                        <p className="company-name">{experience.company}</p>
                        {experience.badges.map((badge, badgeIndex) => (
                          <div key={badgeIndex} className="experience-badge">
                            <div className="badge-border"></div>
                            <p className="badge-text">{badge}</p>
                          </div>
                        ))}
                      </div>
                      <p className="experience-period">{experience.period}</p>
                      <div className="experience-description">
                        {experience.description.map((desc, descIndex) => (
                          <p key={descIndex}>{desc}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Section Formations */}
            <p className="formations-title">Formations</p>

            {/* Tableau des formations */}
            <div className="formations-table">
              <div className="table-header">
                <div className="table-col-name">
                  <p>Nom</p>
                </div>
                <div className="table-col-school">
                  <p>école</p>
                </div>
                <div className="table-col-year">
                  <p>Année</p>
                </div>
              </div>
              
              <div className="table-rows">
                {aboutData.formations.map((formation, index) => (
                  <div key={index}>
                    {index > 0 && <div className="table-separator"></div>}
                    <div className="table-row">
                      <div className="table-col-name">
                        <p>{formation.name}</p>
                      </div>
                      <div className="table-col-school">
                        <p>{formation.school}</p>
                      </div>
                      <div className="table-col-year">
                        <p>{formation.year}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Section Arbre de compétences */}
        {activeSection === 'about-tree' && (
          <div className="skill-tree-wrapper">
            <div className="skill-tree-header">
              <div className="skill-tree-header-left">
                <span>(C)</span>
                <span>theme</span>
              </div>
              <div className="skill-tree-header-right">about</div>
            </div>
            <div id="about-tree" className="skill-tree-container">
            <TreeNode 
              data={flowData} 
              selectedNodes={selectedNodes}
              onNodeClick={handleNodeClick}
            />
            
            {/* Popup Tooltip */}
            {selectedNodeData && popupPosition && (
              <div 
                className="node-popup-tooltip"
                style={{
                  left: `${popupPosition.x}px`,
                  top: `${popupPosition.y}px`,
                  transform: 'translateY(-50%)'
                }}
              >
                <button className="node-popup-close" onClick={closePopup}>×</button>
                <h3 className="node-popup-title">{selectedNodeData.label}</h3>
                {selectedNodeData.description && (
                  <p className="node-popup-description">{selectedNodeData.description}</p>
                )}
                {selectedNodeData.branches && selectedNodeData.branches.length > 0 && (
                  <div className="node-popup-competences">
                    <h4 className="node-popup-competences-title">Compétences :</h4>
                    <ul className="node-popup-competences-list">
                      {selectedNodeData.branches.map((branch) => (
                        <li key={branch.id} className="node-popup-competence-item">
                          {branch.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  )
}

export default AboutNew
