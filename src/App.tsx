import { useState, useEffect } from 'react'
// import { SpeedInsights } from '@vercel/speed-insights/react'
import Header from './components/Header'
import Hero from './components/Hero'
import About from './components/About'
import AboutNew from './components/AboutNew'
import Project from './components/Project'
import ProjectCoverCarousel from './components/ProjectCoverCarousel'
import Dashboard from './components/Dashboard'
import Login from './components/Login'
import { isAuthenticated } from './services/authService'
import './App.css'

function App() {
  const [currentPage, setCurrentPage] = useState('accueil')
  const [previousPage, setPreviousPage] = useState('accueil')
  const [currentProjectImage, setCurrentProjectImage] = useState<string | null>(null)
  const [currentProjectCategory, setCurrentProjectCategory] = useState<string | null>(null)
  const [projectSwipeY, setProjectSwipeY] = useState(0)
  const [error, setError] = useState<Error | null>(null)
  const [isAuthChecked, setIsAuthChecked] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  // Gestion d'erreur globale
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setError(event.error)
    }
    
    window.addEventListener('error', handleError)
    return () => window.removeEventListener('error', handleError)
  }, [])

  // Vérifier l'authentification au chargement
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const pageParam = urlParams.get('page')
    
    if (pageParam === 'dashboard') {
      // Si on essaie d'accéder au dashboard, vérifier l'authentification
      const authenticated = isAuthenticated()
      setIsLoggedIn(authenticated)
      setCurrentPage('dashboard') // Toujours définir la page pour afficher le login si nécessaire
    } else {
      setIsLoggedIn(true) // Pas besoin d'auth pour les autres pages
      if (pageParam) {
        setCurrentPage(pageParam)
      }
    }
    
    setIsAuthChecked(true)
  }, [])

  // Gestion des paramètres d'URL pour la navigation (sauf dashboard)
  useEffect(() => {
    if (isAuthChecked && currentPage !== 'dashboard') {
      const urlParams = new URLSearchParams(window.location.search)
      const pageParam = urlParams.get('page')
      if (pageParam && pageParam !== 'dashboard') {
        setCurrentPage(pageParam)
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
    
    // Page d'accueil, Dashboard et Login
    if (currentPage === 'accueil' || currentPage === 'dashboard' || currentPage === 'login') {
      document.body.classList.add('accueil-page')
    } else {
      document.body.classList.remove('accueil-page')
    }
  }, [currentPage, previousPage])

  const handlePageChange = (page: string, projectImage?: string, projectCategory?: string) => {
    // Si on navigue vers un projet, toujours sauvegarder la page actuelle comme page précédente
    if (page.startsWith('project-') && !currentPage.startsWith('project-')) {
      setPreviousPage(currentPage)
      if (projectImage) setCurrentProjectImage(projectImage)
      if (projectCategory) setCurrentProjectCategory(projectCategory)
    }
    setCurrentPage(page)
  }

  const handleMenuClick = () => {
    // TEMPORAIRE : Menu masqué - retour à l'accueil
    setPreviousPage(currentPage)
    setCurrentPage('accueil')
    
    // Code original commenté :
    // if (currentPage === 'menu') {
    //   // Si on est dans le menu, retourner à la page précédente
    //   setCurrentPage(previousPage)
    // } else {
    //   // Si on est sur une autre page, sauvegarder la page actuelle et aller au menu
    //   setPreviousPage(currentPage)
    //   setCurrentPage('menu')
    // }
  }

  const handleContactClick = () => {
    setPreviousPage(currentPage)
    setCurrentPage('apropos')
  }

  const handleSearchChange = () => {
    // Search term géré par MobileSearchBar
  }

  const handleLogoClick = () => {
    setPreviousPage(currentPage)
    setCurrentPage('accueil')
  }

  const handleLoginSuccess = () => {
    setIsLoggedIn(true)
    setCurrentPage('dashboard')
    // Mettre à jour l'URL sans recharger la page
    window.history.pushState({}, '', '?page=dashboard')
  }

  const renderCurrentPage = () => {
    const isProjectPage = currentPage.startsWith('project-') || currentPage === 'project'
    
    return (
      <>
        {/* Afficher la page d'accueil */}
        {currentPage === 'accueil' && (
          <Hero onPageChange={handlePageChange} />
        )}
        
        {/* Afficher les autres pages normalement quand on n'est pas sur un projet */}
        {!isProjectPage && currentPage !== 'accueil' && (
          <>
            {currentPage === 'apropos' && <About />}
            {currentPage === 'aproposnew' && <AboutNew />}
            {currentPage === 'dashboard' && <Dashboard onBackClick={() => setCurrentPage('accueil')} />}
            {/* TEMPORAIRE : Menu masqué */}
            {/* {currentPage === 'menu' && <Menu onPageChange={handlePageChange} searchTerm={searchTerm} />} */}
          </>
        )}
        
        {/* Afficher la page précédente en arrière-plan quand on est sur un projet */}
        {isProjectPage && (
          <>
            {previousPage === 'accueil' && <Hero onPageChange={handlePageChange} />}
            {previousPage === 'apropos' && <About />}
            {previousPage === 'aproposnew' && <AboutNew />}
            {/* {previousPage === 'menu' && <Menu onPageChange={handlePageChange} searchTerm={searchTerm} />} */}
          </>
        )}
        
        {/* Image de couverture carousel au-dessus de la page SingleProject */}
        {isProjectPage && currentProjectImage && (
          <ProjectCoverCarousel 
            coverImage={currentProjectImage} 
            projectName={currentPage.startsWith('project-') ? currentPage.replace('project-', '') : 'Playdago'}
            swipeY={projectSwipeY}
          />
        )}
        
        {/* Afficher le projet par-dessus le contenu */}
        {isProjectPage && (
          <Project 
            onBackClick={() => {
              setProjectSwipeY(0) // Réinitialiser la valeur Y quand on ferme
              setCurrentPage(previousPage)
            }} 
            projectName={currentPage.startsWith('project-') ? currentPage.replace('project-', '') : undefined}
            coverImage={currentProjectImage} 
            projectCategory={currentProjectCategory}
            onSwipeYChange={setProjectSwipeY}
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

  // Si on est sur le dashboard et non authentifié, afficher le login
  if (currentPage === 'dashboard' && !isLoggedIn) {
    return <Login onLoginSuccess={handleLoginSuccess} />
  }

  return (
    <div className={`container ${currentPage === 'menu' ? 'menu-active' : ''}`}>
      {currentPage !== 'dashboard' && (
        <Header 
          onMenuClick={handleMenuClick} 
          onContactClick={handleContactClick} 
          onLogoClick={handleLogoClick}
          currentPage={currentPage}
          onSearchChange={handleSearchChange}
          onPageChange={handlePageChange}
          onProjectClose={() => setCurrentPage(previousPage)}
          projectSwipeY={projectSwipeY}
        />
      )}
      {renderCurrentPage()}
      
      
      {/* Search bar mobile - maintenant dans le Header */}
      {/* <SpeedInsights /> */}
    </div>
  )
}

export default App
