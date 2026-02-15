import { useLanguage } from '../contexts/LanguageContext'
import './LanguageSwitcher.css'

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()

  return (
    <div className="language-switcher" role="group" aria-label="Changer de langue">
      <button
        type="button"
        className={`language-btn ${language === 'fr' ? 'active' : ''}`}
        onClick={() => setLanguage('fr')}
        aria-label="Français"
        aria-pressed={language === 'fr'}
      >
        FR
      </button>
      <span className="language-separator" aria-hidden>|</span>
      <button
        type="button"
        className={`language-btn ${language === 'en' ? 'active' : ''}`}
        onClick={() => setLanguage('en')}
        aria-label="English"
        aria-pressed={language === 'en'}
      >
        EN
      </button>
    </div>
  )
}
