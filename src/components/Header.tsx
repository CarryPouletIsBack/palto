import { useState, useEffect } from 'react'
import Button from './Button'
import MobileSearchBar from './MobileSearchBar'
import LanguageSwitcher from './LanguageSwitcher'
import Skeleton from './Skeleton'
import { useLanguage } from '../contexts/LanguageContext'
import './Header.css'
import { getStravaAthlete, type StravaAthlete } from '../services/stravaService'

interface HeaderProps {
  onMenuClick: () => void
  onContactClick: () => void
  onLogoClick: () => void
  currentPage: string
  onSearchChange?: (searchTerm: string) => void
  onPageChange?: (page: string, projectImage?: string, projectCategory?: string) => void
  onProjectClose?: () => void
  projectSwipeY?: number
}

const Header = ({ onMenuClick, onContactClick, onLogoClick, currentPage, onSearchChange, onPageChange, onProjectClose, projectSwipeY }: HeaderProps) => {
  const { t } = useLanguage()
  const [stravaAthlete, setStravaAthlete] = useState<StravaAthlete | null>(null)
  const [stravaLoading, setStravaLoading] = useState<boolean>(true)

  // Récupérer les informations de l'athlète Strava
  useEffect(() => {
    const fetchStravaAthlete = async () => {
      try {
        setStravaLoading(true)
        const athlete = await getStravaAthlete()
        setStravaAthlete(athlete)
      } catch {
        // En cas d'erreur, on garde null pour afficher le nom par défaut
      } finally {
        setStravaLoading(false)
      }
    }

    fetchStravaAthlete()
  }, [])

  return (
    <>
      <header className="header">
        <div className="header-content">
          <button className="logo-section" onClick={onLogoClick} aria-label="Retour à l'accueil">
            <div className="logo">
              {stravaLoading ? (
                <Skeleton height="56px" width="56px" borderRadius="50%" className="logo-skeleton" />
              ) : stravaAthlete && (stravaAthlete.profile || stravaAthlete.profile_medium) ? (
                <img
                  src={stravaAthlete.profile || stravaAthlete.profile_medium}
                  alt={`${stravaAthlete.firstname} ${stravaAthlete.lastname}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center center' }}
                />
              ) : (
                <img
                  src="/images/logo.svg"
                  alt="Logo"
                  style={{ width: '85%', height: '85%', objectFit: 'contain', objectPosition: 'center center' }}
                />
              )}
            </div>
            <div className="logo-text">
              {stravaLoading ? (
                <div style={{ display: 'inline-block', margin: 0 }}>
                  <Skeleton height="18px" width="180px" borderRadius="4px" className="header-name-skeleton" />
                </div>
              ) : stravaAthlete ? (
                <p className="logo-name">{stravaAthlete.firstname} {stravaAthlete.lastname}</p>
              ) : (
                <p className="logo-name">Anthony Merault</p>
              )}
              <p>{t('header.productDesigner')}</p>
            </div>
          </button>
          <div className="header-search-wrapper">
            <MobileSearchBar 
              onSearchChange={onSearchChange}
              onMenuClick={onMenuClick}
              onSearchClick={() => {}}
              onPageChange={onPageChange}
              currentPage={currentPage}
              onProjectClose={onProjectClose}
              onContactClick={onContactClick}
              projectSwipeY={projectSwipeY}
            />
            <LanguageSwitcher />
          </div>
          <div className="header-actions" style={{ display: 'none' }}>
            <Button variant="secondary" onClick={onContactClick} className="hidden-contact-btn">Contact</Button>
            <Button variant="secondary" icon={true} onClick={onMenuClick}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M8 2C8.55228 2 9 2.44772 9 3V6C9 6.79565 8.68393 7.55871 8.12132 8.12132C7.55871 8.68393 6.79565 9 6 9H3C2.44772 9 2 8.55228 2 8C2 7.44772 2.44772 7 3 7H6C6.26522 7 6.51957 6.89464 6.70711 6.70711C6.89464 6.51957 7 6.26522 7 6V3C7 2.44772 7.44772 2 8 2ZM16 2C16.5523 2 17 2.44772 17 3V6C17 6.26522 17.1054 6.51957 17.2929 6.70711C17.4804 6.89464 17.7348 7 18 7H21C21.5523 7 22 7.44772 22 8C22 8.55228 21.5523 9 21 9H18C17.2044 9 16.4413 8.68393 15.8787 8.12132C15.3161 7.55871 15 6.79565 15 6V3C15 2.44772 15.4477 2 16 2ZM2 16C2 15.4477 2.44772 15 3 15H6C6.79565 15 7.55871 15.3161 8.12132 15.8787C8.68393 16.4413 9 17.2044 9 18V21C9 21.5523 8.55228 22 8 22C7.44772 22 7 21.5523 7 21V18C7 17.7348 6.89464 17.4804 6.70711 17.2929C6.51957 17.1054 6.26522 17 6 17H3C2.44772 17 2 16.5523 2 16ZM18 17C17.7348 17 17.4804 17.1054 17.2929 17.2929C17.1054 17.4804 17 17.7348 17 18V21C17 21.5523 16.5523 22 16 22C15.4477 22 15 21.5523 15 21V18C15 17.2043 15.3161 16.4413 15.8787 15.8787C16.4413 15.3161 17.2043 15 18 15H21C21.5523 15 22 15.4477 22 16C22 16.5523 21.5523 17 21 17H18Z" fill="white"/>
              </svg>
            </Button>
          </div>
        </div>
      </header>
    </>
  )
}

export default Header
