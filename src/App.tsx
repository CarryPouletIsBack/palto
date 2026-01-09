import { useState, useEffect } from 'react'
// import { SpeedInsights } from '@vercel/speed-insights/react'
import Header from './components/Header'
import Hero from './components/Hero'
import About from './components/About'
import AboutNew from './components/AboutNew'
import Project from './components/Project'
import './App.css'

function App() {
  const [currentPage, setCurrentPage] = useState('accueil')
  const [previousPage, setPreviousPage] = useState('accueil')
  const [currentProjectImage, setCurrentProjectImage] = useState<string | null>(null)
  const [currentProjectCategory, setCurrentProjectCategory] = useState<string | null>(null)
  const [projectSwipeY, setProjectSwipeY] = useState(0)
  const [error, setError] = useState<Error | null>(null)

  // Gestion d'erreur globale
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setError(event.error)
    }
    
    window.addEventListener('error', handleError)
    return () => window.removeEventListener('error', handleError)
  }, [])

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
    
    // Page d'accueil
    if (currentPage === 'accueil') {
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

  return (
    <div className={`container ${currentPage === 'menu' ? 'menu-active' : ''}`}>
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
      {renderCurrentPage()}
      
      
      {/* Search bar mobile - maintenant dans le Header */}
      {/* <SpeedInsights /> */}
    </div>
  )
}

export default App
