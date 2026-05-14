import Button from './Button'
import { PLACEHOLDER_LOGO } from '../constants/imagePlaceholders'
import './Header.css'

interface HeaderProps {
  onContactClick: () => void
  onLogoClick: () => void
}

const Header = ({ onContactClick, onLogoClick }: HeaderProps) => {
  return (
    <header className="header">
      <div className="header-content header-content--compact">
        <button type="button" className="logo-section" onClick={onLogoClick} aria-label="Retour à l'accueil">
          <div className="logo">
            <img
              src={PLACEHOLDER_LOGO}
              alt=""
              style={{ width: '85%', height: '85%', objectFit: 'contain', objectPosition: 'center center' }}
            />
          </div>
          <span className="logo-section__brand">Palto</span>
          <span className="logo-section__chevron" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M6 9l6 6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </button>
        <div className="header-actions" style={{ display: 'none' }}>
          <Button variant="secondary" onClick={onContactClick} className="hidden-contact-btn">
            Contact
          </Button>
        </div>
      </div>
    </header>
  )
}

export default Header
