import { useEffect, useState } from 'react'
import './Background.css'

const Background = () => {
  const [isMenuActive, setIsMenuActive] = useState(false)
  const [isAccueilActive, setIsAccueilActive] = useState(false)

  useEffect(() => {
    const checkPageActive = () => {
      const body = document.body
      const hasMenuActive = body.classList.contains('menu-active')
      
      const accueilPage = document.querySelector('.accueil-page.active')
      const isOnAccueil = accueilPage !== null
      
      const projectPage = document.querySelector('.single-project-page.active')
      const isOnProject = projectPage !== null
      
      const aproposPage = document.querySelector('.apropos-page.active')
      const isOnApropos = aproposPage !== null
      
      const aproposNewPage = document.querySelector('.apropos-new-page.active')
      const isOnAproposNew = aproposNewPage !== null
      
      setIsMenuActive(hasMenuActive)
      setIsAccueilActive(isOnAccueil || isOnProject || isOnApropos || isOnAproposNew)
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
  if (isMenuActive || isAccueilActive) {
    return null
  }

  return (
    <div className="background-wrapper">
      <img 
        src="/images/261061ca92433cd63b52fe7f2093041e9d831bbc.png" 
        alt="Image de fond décorative" 
        className="background-img"
      />
    </div>
  )
}

export default Background

