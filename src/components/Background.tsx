import { useEffect, useState } from 'react'
import './Background.css'

const Background = () => {
  const [isMenuActive, setIsMenuActive] = useState(false)
  const [isAccueilActive, setIsAccueilActive] = useState(false)

  useEffect(() => {
    const checkPageActive = () => {
      const body = document.body
      const hasMenuActive = body.classList.contains('menu-active')
      
      const isOnAccueil = body.classList.contains('accueil-page')
      
      const projectPage = document.querySelector('.single-project-page.active')
      const isOnProject = projectPage !== null
      
      const aproposPage = document.querySelector('.apropos-page.active')
      const isOnApropos = aproposPage !== null
      
      // Vérification explicite pour AboutNew - ne jamais afficher l'image sur cette page
      const aproposNewPage = document.querySelector('.apropos-new-page')
      const isOnAproposNew = aproposNewPage !== null
      
      // Vérification supplémentaire via l'URL ou le chemin de la page
      const isOnAproposNewByPath = window.location.pathname.includes('aproposnew') || 
                                    window.location.hash.includes('aproposnew')
      
      setIsMenuActive(hasMenuActive)
      setIsAccueilActive(isOnAccueil || isOnProject || isOnApropos || isOnAproposNew || isOnAproposNewByPath)
    }

    checkPageActive()
    
    const observer = new MutationObserver(checkPageActive)
    observer.observe(document.body, { 
      attributes: true, 
      attributeFilter: ['class'],
      childList: true, 
      subtree: true 
    })

    const interval = setInterval(checkPageActive, 100)

    return () => {
      observer.disconnect()
      clearInterval(interval)
    }
  }, [])

  // Ne pas afficher l'image sur le menu, l'accueil, les projets et les pages À propos
  // Spécifiquement exclure AboutNew
  const aproposNewPage = document.querySelector('.apropos-new-page')
  if (isMenuActive || isAccueilActive || aproposNewPage) {
    return null
  }

  return null // Image supprimée
}

export default Background

