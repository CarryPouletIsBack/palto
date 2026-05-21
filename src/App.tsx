import { useState, useEffect, useRef, useCallback } from 'react'
// import { SpeedInsights } from '@vercel/speed-insights/react'
import AnalyticsGuard from './components/AnalyticsGuard'
import Header from './components/Header'
import Hero from './components/Hero'
import HeroChauffeur from './components/HeroChauffeur'
import Project from './components/Project'
import ProjectCoverCarousel from './components/ProjectCoverCarousel'
import Dashboard from './components/Dashboard'
import ClientCompteDashboard from './components/ClientCompteDashboard'
import ClientMeetDriverPage from './components/ClientMeetDriverPage'
import ClientAuthPage from './components/ClientAuthPage'
import ChauffeurAuthPage from './components/ChauffeurAuthPage'
import DriverNavigationView from './components/DriverNavigationView'
import ErrorPage from './components/ErrorPage'
import Contact from './components/Contact'
import Menu from './components/Menu'
import { DestinationSpotlight } from './components/DestinationSpotlight'
import { GeolocationPromptBanner } from './components/GeolocationPromptBanner'
import { getDestinationById, type PopularDestination } from './data/popularDestinations'
import { Toaster } from 'sonner'
import { isAuthenticated, isClientAuthenticated, type AccountRole } from './services/authService'
import {
  FONT_SCALE_CHANGED_EVENT,
  clampFontScalePercent,
  loadClientAppPreferences,
} from './constants/clientAppPreferencesStorage'
import { trackPageView, trackEvent } from './services/googleAnalyticsTracking'
import { useLanguage } from './contexts/LanguageContext'
import { purgeStaleLocalSnapshotsOnce } from './services/purgeStaleLocalSnapshots'
import './App.css'
import { PLACEHOLDER_COVER } from './constants/imagePlaceholders'

const PROJECT_COVER_IMAGES: Record<string, string> = {
  Go: PLACEHOLDER_COVER,
}

const PROJECT_ORDER = ['Go'] as const

/** Pages plein document : scroll vertical desktop (index.css + Hero.css). */
const DOCUMENT_SCROLL_PAGE_IDS = new Set([
  'client-compte',
  'client-meet-driver',
  'contact',
  '404',
  'dashboard',
  'dashboard-navigation',
])

/** Dernière vue « racine » Palto (accueil / carte), persistée en local. */
const PALTO_VIEW_STORAGE_KEY = 'palto:view'

/** Pages qu’on peut montrer derrière une vue projet (Go) — doit rester aligné avec `renderCurrentPage`. */
const PROJECT_BACKDROP_PAGE_IDS = new Set(['accueil', 'accueil-chauffeur', 'contact', 'client-compte'])

function App() {
  const { language, setLanguage } = useLanguage()
  const [currentPage, setCurrentPage] = useState('accueil')
  /** Id course pour `/dashboard/navigation/:id` */
  const [navigationCourseId, setNavigationCourseId] = useState<string | null>(null)
  const [previousPage, setPreviousPage] = useState('accueil')
  const [currentProjectImage, setCurrentProjectImage] = useState<string | null>(null)
  const [currentProjectCategory, setCurrentProjectCategory] = useState<string | null>(null)
  const [projectSwipeY, setProjectSwipeY] = useState(0)
  const [coverLiftProgress, setCoverLiftProgress] = useState(0)
  /** Lift + scroll contenu (page Go) — masquer le bouton fermer sur la cover */
  const [projectScrollCombined, setProjectScrollCombined] = useState(0)
  const [coverFullscreenActive, setCoverFullscreenActive] = useState(false)
  const [coverFullscreenModalOpen, setCoverFullscreenModalOpen] = useState(false)
  const coverFullscreenModalTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** Dernière page hors-projet « valide comme fond » — utilisé au popstate /go pour ne pas forcer l’accueil. */
  const projectBackdropSourcePageRef = useRef<string>('accueil')
  const [error, setError] = useState<Error | null>(null)
  const [isAuthChecked, setIsAuthChecked] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [authUiTick, setAuthUiTick] = useState(0)

  const [appFontZoomFactor, setAppFontZoomFactor] = useState(
    () => clampFontScalePercent(loadClientAppPreferences().fontScalePercent) / 100
  )

  useEffect(() => {
    purgeStaleLocalSnapshotsOnce()
  }, [])

  useEffect(() => {
    const onFontScale = (e: Event) => {
      const ce = e as CustomEvent<{ factor?: number }>
      if (typeof ce.detail?.factor === 'number' && Number.isFinite(ce.detail.factor)) {
        setAppFontZoomFactor(ce.detail.factor)
      }
    }
    window.addEventListener(FONT_SCALE_CHANGED_EVENT, onFontScale as EventListener)
    return () => window.removeEventListener(FONT_SCALE_CHANGED_EVENT, onFontScale as EventListener)
  }, [])

  /** Pages projet (/go) : `position:fixed` + scroll interne — zoom sur un ancêtre casse Chrome ; on zoom `#root` comme avant. */
  useEffect(() => {
    const root = document.getElementById('root')
    if (!(root instanceof HTMLElement)) return
    const isProjectShell = currentPage.startsWith('project-') || currentPage === 'project'
    if (isProjectShell) {
      root.style.zoom = String(appFontZoomFactor)
    } else {
      root.style.zoom = '1'
    }
    return () => {
      root.style.zoom = '1'
    }
  }, [currentPage, appFontZoomFactor])

  // Nettoyer le timeout fullscreen cover à la destruction
  useEffect(() => {
    return () => {
      if (coverFullscreenModalTimeoutRef.current) {
        clearTimeout(coverFullscreenModalTimeoutRef.current)
      }
    }
  }, [])

  const isProjectRoute = currentPage.startsWith('project-') || currentPage === 'project'
  useEffect(() => {
    if (!isProjectRoute) setProjectScrollCombined(0)
  }, [isProjectRoute])

  useEffect(() => {
    if (!currentPage.startsWith('project-') && currentPage !== 'project') {
      if (PROJECT_BACKDROP_PAGE_IDS.has(currentPage)) {
        projectBackdropSourcePageRef.current = currentPage
      }
    }
  }, [currentPage])

  // Gestion d'erreur globale
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setError(event.error)
    }
    
    window.addEventListener('error', handleError)
    return () => window.removeEventListener('error', handleError)
  }, [])

  // Vérifier l'authentification au chargement + détecter langue et route depuis l'URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const pageParam = urlParams.get('page')
    const pathname = window.location.pathname

    // Langue depuis l'URL : /fr/... ou /en/...
    if (pathname.startsWith('/fr') || pathname === '/fr') {
      setLanguage('fr')
    } else if (pathname.startsWith('/en') || pathname === '/en') {
      setLanguage('en')
    }

    // Détecter la route depuis le pathname ou le paramètre page
    let targetPage = pageParam
    let navCourseFromPath: string | null = null

    // Si pas de paramètre page, vérifier le pathname (supporter /fr et /en en préfixe)
    let pathToMatch = pathname
    if (pathname.startsWith('/fr') || pathname.startsWith('/en')) {
      pathToMatch = pathname.replace(/^\/(fr|en)/, '') || '/'
    }
    // Navigation chauffeur : le chemin prime sur ?page=dashboard
    if (pathToMatch.startsWith('/dashboard/navigation/')) {
      const navSeg = pathToMatch.replace(/^\/dashboard\/navigation\//, '').split('/')[0] ?? ''
      const decodedNav = navSeg ? decodeURIComponent(navSeg) : ''
      if (decodedNav) {
        targetPage = 'dashboard-navigation'
        navCourseFromPath = decodedNav
      }
    }
    if (!targetPage) {
      if (pathToMatch === '/' || pathToMatch === '') {
        targetPage = 'accueil'
      } else if (pathToMatch === '/chauffeur') {
        targetPage = 'accueil-chauffeur'
      } else if (
        pathToMatch === '/dashboard' ||
        (pathToMatch.startsWith('/dashboard') && !pathToMatch.startsWith('/dashboard/navigation'))
      ) {
        targetPage = 'dashboard'
      } else if (pathToMatch === '/menu' || pathToMatch.startsWith('/menu')) {
        targetPage = 'menu'
      } else if (pathToMatch === '/about' || pathToMatch === '/apropos' || pathToMatch.startsWith('/about')) {
        targetPage = '404'
      } else if (pathToMatch === '/contact' || pathToMatch.startsWith('/contact')) {
        targetPage = 'contact'
      } else if (pathToMatch === '/compte/course') {
        targetPage = 'client-meet-driver'
      } else if (pathToMatch === '/compte' || pathToMatch.startsWith('/compte')) {
        targetPage = 'client-compte'
      } else if (pathToMatch.startsWith('/lieu/')) {
        const raw = pathToMatch.replace(/^\/lieu\//, '').split('/')[0] ?? ''
        const destId = raw ? decodeURIComponent(raw) : ''
        if (destId && getDestinationById(destId)) {
          targetPage = `destination-${destId}`
        } else {
          targetPage = '404'
        }
      } else if (pathToMatch.startsWith('/project/')) {
        const projectId = pathToMatch.replace(/^\/project\//, '').toLowerCase()
        if (projectId === 'go') {
          targetPage = 'project-Go'
        } else {
          targetPage = '404'
        }
      } else if (/^\/go$/i.test(pathToMatch)) {
        targetPage = 'project-Go'
      } else {
        targetPage = '404'
      }
    }

    // Chemin /…/compte prime sur ?page=… ; ?page=compte → id interne client-compte
    if (pathToMatch === '/compte/course') {
      targetPage = 'client-meet-driver'
    } else if (pathToMatch === '/compte' || pathToMatch.startsWith('/compte/')) {
      targetPage = 'client-compte'
    } else if (targetPage === 'compte' || pageParam === 'compte') {
      targetPage = 'client-compte'
    }

    if (targetPage === 'dashboard-navigation' && navCourseFromPath) {
      setNavigationCourseId(navCourseFromPath)
    } else if (targetPage === 'dashboard') {
      setNavigationCourseId(null)
    }
    
    if (targetPage === 'dashboard' || targetPage === 'dashboard-navigation') {
      // Vérifier si on a des tokens OAuth2 dans l'URL (retour de Google)
      const hasOAuthTokens = urlParams.has('access_token')
      
      // Si on a des tokens OAuth2, considérer comme authentifié
      // Sinon, vérifier l'authentification email/password
      const authenticated = hasOAuthTokens || isAuthenticated()
      setIsLoggedIn(authenticated)
      setCurrentPage(targetPage)
      
      // Mettre à jour l'URL pour inclure ?page=dashboard si nécessaire (vue dashboard simple uniquement)
      if (
        targetPage === 'dashboard' &&
        !pageParam &&
        pathname === '/dashboard'
      ) {
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.set('page', 'dashboard')
        window.history.replaceState({}, document.title, newUrl.toString())
      }
    } else {
      setIsLoggedIn(true)
      if (targetPage) {
        setCurrentPage(targetPage)
        if (targetPage.startsWith('project-')) {
          setPreviousPage('accueil')
          const projectName = targetPage.replace('project-', '')
          setCurrentProjectImage(PROJECT_COVER_IMAGES[projectName] ?? null)
        }
        if (targetPage.startsWith('destination-')) {
          setPreviousPage('accueil')
        }
      }
    }
    
    setIsAuthChecked(true)
  }, [])

  // Rediriger / ou '' vers /fr ou /en pour afficher la langue dans l'URL
  useEffect(() => {
    if (!isAuthChecked) return
    const pathname = window.location.pathname
    if (pathname === '/' || pathname === '') {
      window.history.replaceState({}, document.title, language === 'en' ? '/en' : '/fr')
    }
  }, [isAuthChecked, language])

  // Mapping page -> URL path (avec préfixe langue /fr ou /en)
  const getPathFromPage = (page: string): string => {
    return getPathForLang(page, language)
  }

  /** Path pour une page et une langue donnée (pour hreflang SEO). */
  function getPathForLang(page: string, lang: 'fr' | 'en'): string {
    const prefix = lang === 'en' ? '/en' : '/fr'
    if (page === 'accueil' || page === '404') return prefix
    if (page === 'accueil-chauffeur') return `${prefix}/chauffeur`
    if (page === 'menu') return `${prefix}/menu`
    if (page === 'contact') return `${prefix}/contact`
    if (page === 'dashboard') return `${prefix}/dashboard`
    if (page === 'client-meet-driver') return `${prefix}/compte/course`
    if (page === 'client-compte') return `${prefix}/compte`
    if (page === 'dashboard-navigation') {
      return navigationCourseId
        ? `${prefix}/dashboard/navigation/${encodeURIComponent(navigationCourseId)}`
        : `${prefix}/dashboard`
    }
    if (page.startsWith('destination-')) {
      const id = page.slice('destination-'.length)
      if (!id) return prefix
      return `${prefix}/lieu/${encodeURIComponent(id)}`
    }
    if (page.startsWith('project-')) {
      const name = page.replace('project-', '')
      const slug = name.toLowerCase()
      if (slug === 'go') return `${prefix}/go`
      return `${prefix}/project/${name}`
    }
    return prefix
  }

  const openDriverNavigation = useCallback((courseId: string) => {
    setNavigationCourseId(courseId)
    setCurrentPage('dashboard-navigation')
    const prefix = language === 'en' ? '/en' : '/fr'
    window.history.pushState({}, '', `${prefix}/dashboard/navigation/${encodeURIComponent(courseId)}`)
  }, [language])

  const closeDriverNavigation = useCallback(() => {
    setNavigationCourseId(null)
    setCurrentPage('dashboard')
    const prefix = language === 'en' ? '/en' : '/fr'
    window.history.pushState({}, '', `${prefix}/dashboard`)
  }, [language])

  const handleOpenClientAccountAuth = useCallback(
    (mode: 'login' | 'signup') => {
      const prefix = language === 'en' ? '/en' : '/fr'
      const base = `${prefix}/compte`
      const url = mode === 'signup' ? `${base}?clientSignup=1` : base
      setPreviousPage(currentPage)
      trackEvent('click', 'hero_topbar_auth', mode)
      window.history.pushState({}, '', url)
      setCurrentPage('client-compte')
    },
    [currentPage, language]
  )

  const handleOpenClientAccount = useCallback(() => {
    const prefix = language === 'en' ? '/en' : '/fr'
    trackEvent('click', 'navigation', 'hero_client_account')
    setPreviousPage('accueil')
    window.history.pushState({}, '', `${prefix}/compte`)
    setCurrentPage('client-compte')
  }, [language])

  const handleOpenClientMeetDriver = useCallback(() => {
    const prefix = language === 'en' ? '/en' : '/fr'
    setPreviousPage(currentPage)
    trackEvent('click', 'navigation', 'client_meet_driver_open')
    window.history.pushState({}, '', `${prefix}/compte/course`)
    setCurrentPage('client-meet-driver')
  }, [currentPage, language])

  const handleOpenChauffeurAuth = useCallback(
    (mode: 'login' | 'signup') => {
      const prefix = language === 'en' ? '/en' : '/fr'
      const url =
        mode === 'signup'
          ? `${prefix}/dashboard?chauffeurSignup=1`
          : `${prefix}/dashboard?dashboardView=user`
      window.history.pushState({}, '', url)
      setCurrentPage('dashboard')
    },
    [language]
  )

  /** Après connexion : ouvrir le dashboard chauffeur ou le compte passager selon le rôle détecté. */
  const redirectAfterAuth = useCallback(
    (role: AccountRole, options?: { preferDashboard?: boolean }) => {
      const prefix = language === 'en' ? '/en' : '/fr'
      setAuthUiTick((n) => n + 1)
      const openDashboard = role === 'chauffeur' || options?.preferDashboard === true
      if (openDashboard) {
        window.history.pushState({}, '', `${prefix}/dashboard?dashboardView=user`)
        setCurrentPage('dashboard')
      } else {
        window.history.pushState({}, '', `${prefix}/compte`)
        setCurrentPage('client-compte')
      }
    },
    [language]
  )

  /** Retour vue racine Palto : accueil, reset course / état projet, persistance locale. */
  const navigateToPaltoHomeRoot = useCallback(() => {
    trackEvent('click', 'navigation', 'logo_home')
    if (coverFullscreenModalTimeoutRef.current) {
      clearTimeout(coverFullscreenModalTimeoutRef.current)
      coverFullscreenModalTimeoutRef.current = null
    }
    setProjectSwipeY(0)
    setCoverLiftProgress(0)
    setProjectScrollCombined(0)
    setCoverFullscreenActive(false)
    setCoverFullscreenModalOpen(false)
    setCurrentProjectImage(null)
    setCurrentProjectCategory(null)
    setPreviousPage('accueil')
    setCurrentPage('accueil')
    window.history.pushState({}, '', getPathForLang('accueil', language))
    try {
      localStorage.setItem(PALTO_VIEW_STORAGE_KEY, 'accueil')
    } catch {
      /* ignore */
    }
    window.scrollTo(0, 0)
  }, [language])

  const navigateToChauffeurHomeRoot = useCallback(() => {
    trackEvent('click', 'navigation', 'logo_chauffeur_home')
    if (coverFullscreenModalTimeoutRef.current) {
      clearTimeout(coverFullscreenModalTimeoutRef.current)
      coverFullscreenModalTimeoutRef.current = null
    }
    setProjectSwipeY(0)
    setCoverLiftProgress(0)
    setProjectScrollCombined(0)
    setCoverFullscreenActive(false)
    setCoverFullscreenModalOpen(false)
    setCurrentProjectImage(null)
    setCurrentProjectCategory(null)
    setPreviousPage('accueil-chauffeur')
    setCurrentPage('accueil-chauffeur')
    window.history.pushState({}, '', getPathForLang('accueil-chauffeur', language))
    try {
      localStorage.setItem(PALTO_VIEW_STORAGE_KEY, 'accueil-chauffeur')
    } catch {
      /* ignore */
    }
    window.scrollTo(0, 0)
  }, [language])

  // Synchroniser l'URL quand la langue change (garder la même page)
  useEffect(() => {
    if (!isAuthChecked) return
    const path = getPathFromPage(currentPage)
    const currentPath = window.location.pathname + window.location.search
    if (path !== currentPath && currentPage !== 'dashboard' && currentPage !== 'dashboard-navigation') {
      window.history.replaceState({}, document.title, path)
    }
  }, [language, currentPage])

  // SEO : canonical, hreflang + x-default (anglais par défaut pour public international / Linear)
  const siteBaseUrl = (import.meta.env.VITE_SITE_URL as string) || (typeof window !== 'undefined' ? window.location.origin : '')
  useEffect(() => {
    if (!siteBaseUrl || currentPage === 'dashboard' || currentPage === 'dashboard-navigation') return
    const base = siteBaseUrl.replace(/\/$/, '')
    const currentPath = getPathFromPage(currentPage)
    const canonicalUrl = `${base}${currentPath}`

    // Canonical : URL propre de la page (évite duplicate content avec ?utm_* etc.)
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = canonicalUrl

    // hreflang
    const existing = document.querySelectorAll('link[rel="alternate"][hreflang]')
    existing.forEach((el) => el.remove())
    const pathFr = getPathForLang(currentPage, 'fr')
    const pathEn = getPathForLang(currentPage, 'en')
    const linkFr = document.createElement('link')
    linkFr.rel = 'alternate'
    linkFr.hreflang = 'fr'
    linkFr.href = `${base}${pathFr}`
    const linkEn = document.createElement('link')
    linkEn.rel = 'alternate'
    linkEn.hreflang = 'en'
    linkEn.href = `${base}${pathEn}`
    const linkDefault = document.createElement('link')
    linkDefault.rel = 'alternate'
    linkDefault.hreflang = 'x-default'
    linkDefault.href = `${base}${pathEn}`
    document.head.appendChild(linkFr)
    document.head.appendChild(linkEn)
    document.head.appendChild(linkDefault)
    return () => {
      linkFr.remove()
      linkEn.remove()
      linkDefault.remove()
    }
  }, [currentPage, siteBaseUrl])

  // Titre du document (onglet + SEO) à chaque changement de page
  useEffect(() => {
    document.title = getPageTitle(currentPage)
  }, [currentPage, language])

  // Écouter le bouton Retour du navigateur
  useEffect(() => {
    const handlePopState = () => {
      const pathname = window.location.pathname
      const pathToMatch = pathname.startsWith('/fr') || pathname.startsWith('/en')
        ? pathname.replace(/^\/(fr|en)/, '') || '/'
        : pathname
      if (pathToMatch === '/' || pathToMatch === '') {
        setCurrentPage('accueil')
      } else if (pathToMatch === '/chauffeur') {
        setCurrentPage('accueil-chauffeur')
      } else if (pathToMatch === '/about' || pathToMatch === '/apropos' || pathToMatch.startsWith('/about')) {
        setCurrentPage('404')
      } else if (pathToMatch === '/contact') {
        setCurrentPage('contact')
      } else if (pathToMatch === '/compte/course') {
        setCurrentPage('client-meet-driver')
      } else if (pathToMatch === '/compte' || pathToMatch.startsWith('/compte')) {
        setCurrentPage('client-compte')
      } else if (pathToMatch.startsWith('/dashboard/navigation/')) {
        const navSeg = pathToMatch.replace(/^\/dashboard\/navigation\//, '').split('/')[0] ?? ''
        const id = navSeg ? decodeURIComponent(navSeg) : ''
        if (id) {
          setNavigationCourseId(id)
          setCurrentPage('dashboard-navigation')
        } else {
          setNavigationCourseId(null)
          setCurrentPage('dashboard')
        }
      } else if (pathToMatch === '/dashboard') {
        setNavigationCourseId(null)
        setCurrentPage('dashboard')
      } else if (pathToMatch === '/menu' || pathToMatch.startsWith('/menu')) {
        setCurrentPage('menu')
      } else if (/^\/go$/i.test(pathToMatch)) {
        const from = projectBackdropSourcePageRef.current
        setPreviousPage(PROJECT_BACKDROP_PAGE_IDS.has(from) ? from : 'accueil')
        setCurrentProjectImage(PROJECT_COVER_IMAGES.Go ?? null)
        setCurrentPage('project-Go')
      } else if (pathToMatch.startsWith('/lieu/')) {
        const raw = pathToMatch.replace(/^\/lieu\//, '').split('/')[0] ?? ''
        const destId = raw ? decodeURIComponent(raw) : ''
        if (destId && getDestinationById(destId)) {
          setCurrentPage(`destination-${destId}`)
        } else {
          setCurrentPage('404')
        }
      } else if (pathToMatch.startsWith('/project/')) {
        const id = pathToMatch.replace(/^\/project\//, '').toLowerCase()
        if (id === 'go') {
          const from = projectBackdropSourcePageRef.current
          setPreviousPage(PROJECT_BACKDROP_PAGE_IDS.has(from) ? from : 'accueil')
          setCurrentProjectImage(PROJECT_COVER_IMAGES.Go ?? null)
          setCurrentPage('project-Go')
        } else {
          setCurrentPage('404')
        }
      } else {
        setCurrentPage('404')
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Fonction helper pour obtenir le titre de la page
  const getPageTitle = (page: string): string => {
    if (page === 'client-meet-driver') {
      return language === 'en' ? 'Your driver — Palto' : 'Votre chauffeur — Palto'
    }
    const titles: Record<string, string> = {
      accueil: 'Accueil — Palto',
      'accueil-chauffeur': language === 'en' ? 'Drivers — Palto' : 'Chauffeurs — Palto',
      menu: 'Menu — Palto',
      contact: 'Contact — Palto',
      dashboard: 'Dashboard — Palto',
      'client-compte': 'Mon compte — Palto',
      login: 'Connexion — Palto',
    }

    if (page === 'dashboard-navigation') {
      return 'Navigation course — Palto'
    }
    
    if (page.startsWith('project-')) {
      const projectName = page.replace('project-', '')
      return `${projectName} — Projet — Palto`
    }

    if (page.startsWith('destination-')) {
      const id = page.replace('destination-', '')
      const d = getDestinationById(id)
      if (d) {
        const label = language === 'en' ? d.titleEn : d.titleFr
        return `${label} — Palto`
      }
    }

    return titles[page] || 'Palto'
  }

  // Gestion des paramètres d'URL pour la navigation (sauf dashboard)
  useEffect(() => {
    if (isAuthChecked && currentPage !== 'dashboard' && currentPage !== 'dashboard-navigation') {
      const pathname = window.location.pathname
      const pathToMatch =
        pathname.startsWith('/fr') || pathname.startsWith('/en')
          ? pathname.replace(/^\/(fr|en)/, '') || '/'
          : pathname
      if (pathToMatch === '/compte/course') {
        setCurrentPage('client-meet-driver')
        return
      }
      if (pathToMatch === '/compte' || pathToMatch.startsWith('/compte/')) {
        setCurrentPage('client-compte')
        return
      }
      const urlParams = new URLSearchParams(window.location.search)
      const pageParam = urlParams.get('page')
      if (
        pageParam &&
        pageParam !== 'dashboard' &&
        !pathToMatch.startsWith('/lieu/')
      ) {
        setCurrentPage(pageParam === 'compte' ? 'client-compte' : pageParam)
      }
    }
  }, [isAuthChecked, currentPage])

  useEffect(() => {
    // Gestion des classes sur le body pour les styles globaux
    // Menu
    if (currentPage === 'menu') {
      document.body.classList.add('menu-active')
    } 
    // Si on est sur un projet et qu'on vient du menu, garder le fond menu
    else if (currentPage.startsWith('project-') && previousPage === 'menu') {
      document.body.classList.add('menu-active')
    }
    // Sinon, utiliser le fond normal (accueil)
    else {
      document.body.classList.remove('menu-active')
    }
    
    // Page d'accueil et Login
    if (currentPage === 'accueil' || currentPage === 'accueil-chauffeur' || currentPage === 'login') {
      document.body.classList.add('accueil-page')
    } else {
      document.body.classList.remove('accueil-page')
    }

    // Classe dédiée dashboard (évite les interférences de styles accueil)
    if (currentPage === 'dashboard' || currentPage === 'dashboard-navigation') {
      document.body.classList.add('dashboard-page')
    } else {
      document.body.classList.remove('dashboard-page')
    }

    if (DOCUMENT_SCROLL_PAGE_IDS.has(currentPage) || currentPage.startsWith('destination-')) {
      document.body.classList.add('document-scroll-page')
    } else {
      document.body.classList.remove('document-scroll-page')
    }

    // Track page view avec Google Analytics
    const pageTitle = getPageTitle(currentPage)
    trackPageView(`/${currentPage}`, pageTitle)
  }, [currentPage, previousPage, language])

  useEffect(() => {
    const lock = currentPage.startsWith('project-')
    if (lock) {
      document.documentElement.classList.add('project-page-open')
      document.body.classList.add('project-page-open')
    } else {
      document.documentElement.classList.remove('project-page-open')
      document.body.classList.remove('project-page-open')
    }
    return () => {
      document.documentElement.classList.remove('project-page-open')
      document.body.classList.remove('project-page-open')
    }
  }, [currentPage])

  const handlePageChange = (page: string, projectImage?: string, projectCategory?: string) => {
    // Si on navigue vers un projet, toujours sauvegarder la page actuelle comme page précédente
    if (page.startsWith('project-') && !currentPage.startsWith('project-')) {
      setPreviousPage(currentPage)
      if (projectImage) setCurrentProjectImage(projectImage)
      if (projectCategory) setCurrentProjectCategory(projectCategory)
      const projectName = page.replace('project-', '')
      trackEvent('open_project', 'navigation', projectName)
      window.history.pushState({}, '', getPathFromPage(page))
    } else {
      if (page.startsWith('destination-') && !currentPage.startsWith('destination-')) {
        setPreviousPage(currentPage)
        trackEvent('click', 'hero_destination_spotlight', page.replace('destination-', ''))
      }
      window.history.pushState({}, '', getPathFromPage(page))
    }
    setCurrentPage(page)
  }

  const handleContactClick = () => {
    trackEvent('click', 'contact', 'header_contact')
    setPreviousPage(currentPage)
    setCurrentPage('contact')
    window.history.pushState({}, '', getPathFromPage('contact'))
  }

  const handleLogoClick = () => {
    navigateToPaltoHomeRoot()
  }

  const handleBookToGoFromSpotlight = useCallback(
    (destination: PopularDestination) => {
      setPreviousPage(currentPage)
      setCurrentProjectImage(destination.imageSrc?.trim() ? destination.imageSrc : PLACEHOLDER_COVER)
      setCurrentProjectCategory('Course')
      setCurrentPage('project-Go')
      trackEvent('click', 'destination_spotlight_book', destination.id)
      window.history.pushState({}, '', getPathFromPage('project-Go'))
    },
    [currentPage, language]
  )

  const renderCurrentPage = () => {
    const isProjectPage = currentPage.startsWith('project-') || currentPage === 'project'
    const destinationId = currentPage.startsWith('destination-') ? currentPage.replace('destination-', '') : ''
    const destinationSpotlightActive = Boolean(destinationId && getDestinationById(destinationId))

    return (
      <>
        {destinationSpotlightActive && (
          <DestinationSpotlight
            destinationId={destinationId}
            onBack={() => {
              setCurrentPage(previousPage)
              window.history.pushState({}, '', getPathFromPage(previousPage))
            }}
            onNavigateHome={navigateToPaltoHomeRoot}
            onOpenClientAccountAuth={handleOpenClientAccountAuth}
            onBookToGo={handleBookToGoFromSpotlight}
            onOpenClientAccount={handleOpenClientAccount}
            onOpenClientLiveMeet={handleOpenClientMeetDriver}
          />
        )}

        {currentPage.startsWith('destination-') && !destinationSpotlightActive && (
          <ErrorPage
            code={404}
            onBackToHome={() => {
              setCurrentPage('accueil')
              window.history.pushState({}, '', getPathFromPage('accueil'))
            }}
            onProjectClick={(slug) => {
              setPreviousPage('accueil')
              setCurrentPage(`project-${slug}`)
              setCurrentProjectImage(PROJECT_COVER_IMAGES[slug] ?? null)
              window.history.pushState({}, '', getPathFromPage(`project-${slug}`))
            }}
          />
        )}

        {/* Afficher la page d'accueil */}
        {currentPage === 'accueil' && (
          <Hero
            onPageChange={handlePageChange}
            onOpenClientAccountAuth={handleOpenClientAccountAuth}
            onOpenClientAccount={handleOpenClientAccount}
            onOpenClientLiveMeet={handleOpenClientMeetDriver}
            onNavigateHome={navigateToPaltoHomeRoot}
            onOpenChauffeurAuth={handleOpenChauffeurAuth}
          />
        )}

        {currentPage === 'accueil-chauffeur' && (
          <HeroChauffeur
            onPageChange={handlePageChange}
            onOpenClientAccountAuth={handleOpenClientAccountAuth}
            onOpenClientAccount={handleOpenClientAccount}
            onOpenClientLiveMeet={handleOpenClientMeetDriver}
            onNavigateHome={navigateToChauffeurHomeRoot}
            onOpenChauffeurAuth={handleOpenChauffeurAuth}
          />
        )}

        {/* Page d'erreur 404 */}
        {currentPage === '404' && (
          <ErrorPage
            code={404}
            onBackToHome={() => {
              setCurrentPage('accueil')
              window.history.pushState({}, '', getPathFromPage('accueil'))
            }}
            onProjectClick={(slug) => {
              setPreviousPage('accueil')
              setCurrentPage(`project-${slug}`)
              setCurrentProjectImage(PROJECT_COVER_IMAGES[slug] ?? null)
              window.history.pushState({}, '', getPathFromPage(`project-${slug}`))
            }}
          />
        )}
        
        {/* Afficher les autres pages normalement quand on n'est pas sur un projet */}
        {!isProjectPage &&
          currentPage !== 'accueil' &&
          currentPage !== 'accueil-chauffeur' &&
          currentPage !== '404' &&
          !currentPage.startsWith('destination-') && (
          <>
            {currentPage === 'menu' && <Menu onPageChange={handlePageChange} />}
            {currentPage === 'contact' && (
              <Contact
                onBackClick={() => {
                  setCurrentPage(previousPage)
                  window.history.pushState({}, '', getPathFromPage(previousPage))
                }}
              />
            )}
            {currentPage === 'client-compte' && (
              (authUiTick >= 0 && isClientAuthenticated()) ? (
                <ClientCompteDashboard
                  onBack={() => {
                    setCurrentPage('accueil')
                    window.history.pushState({}, '', getPathFromPage('accueil'))
                  }}
                  onOpenClientLiveMeet={handleOpenClientMeetDriver}
                />
              ) : (
                <ClientAuthPage
                  onClose={() => {
                    setCurrentPage('accueil')
                    window.history.pushState({}, '', getPathFromPage('accueil'))
                  }}
                  onAuthSuccess={redirectAfterAuth}
                />
              )
            )}
            {currentPage === 'client-meet-driver' && (
              <ClientMeetDriverPage
                onBack={() => {
                  const dest =
                    previousPage && previousPage !== 'client-meet-driver' ? previousPage : 'accueil'
                  setCurrentPage(dest)
                  window.history.pushState({}, '', getPathFromPage(dest))
                }}
              />
            )}
            {currentPage === 'dashboard' && (
              (authUiTick >= 0 && isAuthenticated()) ? (
                <Dashboard
                  onOpenActiveCourseNavigation={openDriverNavigation}
                  onNavigatePublicHome={navigateToPaltoHomeRoot}
                  onNavigateDriverHome={navigateToChauffeurHomeRoot}
                />
              ) : (
                <ChauffeurAuthPage
                  onClose={() => {
                    setCurrentPage('accueil-chauffeur')
                    window.history.pushState({}, '', getPathFromPage('accueil-chauffeur'))
                  }}
                  onAuthSuccess={(role) => redirectAfterAuth(role, { preferDashboard: true })}
                />
              )
            )}
            {currentPage === 'dashboard-navigation' && navigationCourseId && (
              isAuthenticated() ? (
                <DriverNavigationView courseId={navigationCourseId} onClose={closeDriverNavigation} />
              ) : (
                <ChauffeurAuthPage onAuthSuccess={(role) => redirectAfterAuth(role, { preferDashboard: true })} />
              )
            )}
          </>
        )}
        
        {/* Afficher la page précédente en arrière-plan quand on est sur un projet */}
        {isProjectPage && (
          <>
            {previousPage === 'accueil' && (
              <Hero
                onPageChange={handlePageChange}
                onOpenClientAccountAuth={handleOpenClientAccountAuth}
                onOpenClientAccount={handleOpenClientAccount}
                onOpenClientLiveMeet={handleOpenClientMeetDriver}
                onNavigateHome={navigateToPaltoHomeRoot}
                onOpenChauffeurAuth={handleOpenChauffeurAuth}
              />
            )}
            {previousPage === 'accueil-chauffeur' && (
              <HeroChauffeur
                onPageChange={handlePageChange}
                onOpenClientAccountAuth={handleOpenClientAccountAuth}
                onOpenClientAccount={handleOpenClientAccount}
                onOpenClientLiveMeet={handleOpenClientMeetDriver}
                onNavigateHome={navigateToChauffeurHomeRoot}
                onOpenChauffeurAuth={handleOpenChauffeurAuth}
              />
            )}
            {previousPage === 'contact' && (
              <Contact onBackClick={() => {}} />
            )}
            {previousPage === 'client-compte' && (
              <ClientCompteDashboard onBack={() => {}} onOpenClientLiveMeet={handleOpenClientMeetDriver} />
            )}
          </>
        )}
        
        {/* Image de couverture carousel au-dessus de la page Go */}
        {isProjectPage && currentProjectImage && (
          <ProjectCoverCarousel 
            coverImage={currentProjectImage} 
            projectName={currentPage.startsWith('project-') ? currentPage.replace('project-', '') : 'Go'}
            swipeY={projectSwipeY}
            coverLiftProgress={coverLiftProgress}
            hideCloseOnScroll={projectScrollCombined > 32}
            coverFullscreenActive={coverFullscreenActive}
            isFullscreenModalOpen={coverFullscreenModalOpen}
            onFullscreenOpen={() => {
              if (coverFullscreenModalTimeoutRef.current) clearTimeout(coverFullscreenModalTimeoutRef.current)
              setCoverFullscreenActive(true)
              setCoverFullscreenModalOpen(false)
              coverFullscreenModalTimeoutRef.current = setTimeout(() => {
                coverFullscreenModalTimeoutRef.current = null
                setCoverFullscreenModalOpen(true)
              }, 550)
            }}
            onFullscreenClose={() => {
              if (coverFullscreenModalTimeoutRef.current) {
                clearTimeout(coverFullscreenModalTimeoutRef.current)
                coverFullscreenModalTimeoutRef.current = null
              }
              setCoverFullscreenModalOpen(false)
              setCoverFullscreenActive(false)
            }}
            onClose={() => {
              trackEvent('close_project', 'navigation', currentPage.replace('project-', ''))
              setProjectSwipeY(0)
              setCoverLiftProgress(0)
              setCurrentPage(previousPage)
              window.history.pushState({}, '', getPathFromPage(previousPage))
            }}
            onPreviousProject={() => {
              window.scrollTo(0, 0)
              const currentName = currentPage.startsWith('project-') ? currentPage.replace('project-', '') : 'Go'
              const idx = PROJECT_ORDER.indexOf(currentName as typeof PROJECT_ORDER[number])
              const prevIdx = idx <= 0 ? PROJECT_ORDER.length - 1 : idx - 1
              const prevName = PROJECT_ORDER[prevIdx]
              trackEvent('previous_project', 'navigation', prevName)
              setPreviousPage('accueil')
              setCurrentPage(`project-${prevName}`)
              setCurrentProjectImage(PROJECT_COVER_IMAGES[prevName] ?? null)
              setProjectSwipeY(0)
              setCoverLiftProgress(0)
              window.history.pushState({}, '', getPathFromPage(`project-${prevName}`))
            }}
            onNextProject={() => {
              window.scrollTo(0, 0)
              const currentName = currentPage.startsWith('project-') ? currentPage.replace('project-', '') : 'Go'
              const idx = PROJECT_ORDER.indexOf(currentName as typeof PROJECT_ORDER[number])
              const nextIdx = idx < 0 ? 0 : (idx + 1) % PROJECT_ORDER.length
              const nextName = PROJECT_ORDER[nextIdx]
              trackEvent('next_project', 'navigation', nextName)
              setPreviousPage('accueil')
              setCurrentPage(`project-${nextName}`)
              setCurrentProjectImage(PROJECT_COVER_IMAGES[nextName] ?? null)
              setProjectSwipeY(0)
              setCoverLiftProgress(0)
              window.history.pushState({}, '', getPathFromPage(`project-${nextName}`))
            }}
          />
        )}
        
        {/* Afficher le projet par-dessus le contenu */}
        {isProjectPage && (
          <Project 
            onBackClick={() => {
              trackEvent('close_project', 'navigation', currentPage.replace('project-', ''))
              setProjectSwipeY(0)
              setCoverLiftProgress(0)
              setCurrentPage(previousPage)
              window.history.pushState({}, '', getPathFromPage(previousPage))
            }} 
            projectName={currentPage.startsWith('project-') ? currentPage.replace('project-', '') : undefined}
            coverImage={currentProjectImage} 
            projectCategory={currentProjectCategory}
            onSwipeYChange={setProjectSwipeY}
            onLiftProgressChange={setCoverLiftProgress}
            onProjectScrollCombinedChange={setProjectScrollCombined}
            coverFullscreenActive={coverFullscreenActive}
            onOpenClientAccountAuth={handleOpenClientAccountAuth}
            onOpenClientAccount={handleOpenClientAccount}
            onNavigateHome={navigateToPaltoHomeRoot}
            onOpenClientLiveMeet={handleOpenClientMeetDriver}
          />
        )}
      </>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h1>Erreur de chargement</h1>
        <p>{error.message}</p>
        <button onClick={() => window.location.reload()}>Recharger la page</button>
      </div>
    )
  }

  // Afficher la page de login si on essaie d'accéder au dashboard sans être authentifié
  if (!isAuthChecked) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#fef7ff' }}>Chargement...</div>
  }

  return (
    <div className={`container ${currentPage === 'menu' ? 'menu-active' : ''}`}>
      <AnalyticsGuard />
      <GeolocationPromptBanner />
      <Toaster position="bottom-right" theme="light" />
      {currentPage !== 'dashboard' &&
        currentPage !== 'dashboard-navigation' &&
        currentPage !== 'client-compte' &&
        currentPage !== 'client-meet-driver' &&
        currentPage !== 'accueil' &&
        currentPage !== 'accueil-chauffeur' &&
        !currentPage.startsWith('destination-') && (
        <Header onContactClick={handleContactClick} onLogoClick={handleLogoClick} />
      )}
      {currentPage.startsWith('project-') || currentPage === 'project' ? (
        renderCurrentPage()
      ) : (
        <div
          className={`app-page-font-zoom${
            currentPage === 'dashboard' ||
            currentPage === 'dashboard-navigation' ||
            currentPage === 'client-compte' ||
            currentPage === 'client-meet-driver'
              ? ' app-page-font-zoom--prefer-font-size'
              : ''
          }`}
          style={
            currentPage === 'dashboard' ||
            currentPage === 'dashboard-navigation' ||
            currentPage === 'client-compte' ||
            currentPage === 'client-meet-driver'
              ? undefined
              : { zoom: appFontZoomFactor }
          }
        >
          {renderCurrentPage()}
        </div>
      )}
    </div>
  )
}

export default App
