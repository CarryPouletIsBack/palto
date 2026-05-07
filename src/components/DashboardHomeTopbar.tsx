import { useLanguage } from '../contexts/LanguageContext'
import { trackEvent } from '../services/googleAnalyticsTracking'
import LanguageSwitcher from './LanguageSwitcher'
import './Dashboard.css'
import './Dashboard.app-theme.css'

export type ClientTopbarUpcomingRide = {
  departShort: string
  arriveShort: string
  startsAtIso: string
  startsLabel: string
}

export interface DashboardHomeTopbarProps {
  onOpenClientAccountAuth?: (mode: 'login' | 'signup') => void
  /** Clic sur « Palto » : retour accueil (ferme /go si besoin). */
  onNavigateHome?: () => void
}

/** Barre d’accueil (Palto + langue + connexion) — réutilisée sur l’accueil et la page Go. */
export function DashboardHomeTopbar({
  onOpenClientAccountAuth,
  onNavigateHome,
}: DashboardHomeTopbarProps) {
  const { t } = useLanguage()
  const titleEl =
    onNavigateHome != null ? (
      <button
        type="button"
        className="dashboard-client-main-title"
        onClick={() => {
          trackEvent('click', 'hero_topbar_title', 'home')
          onNavigateHome()
        }}
        aria-label={t('hero.homeTopbarTitleNavAria')}
      >
        {t('hero.homeTopbarTitle')}
      </button>
    ) : (
      <h2 className="dashboard-client-main-title">{t('hero.homeTopbarTitle')}</h2>
    )

  return (
    <header className="dashboard-topbar dashboard-topbar--home-client">
      <div className="dashboard-home-topbar-row">
        <div className="dashboard-home-topbar-start">{titleEl}</div>
        <div className="dashboard-topbar-right">
          <div className="dashboard-home-topbar-right-cluster">
            <LanguageSwitcher />
            {onOpenClientAccountAuth ? (
              <div className="hero-topbar-auth" role="group" aria-label={t('hero.topbarAuthAria')}>
                <button
                  type="button"
                  className="hero-topbar-auth-link"
                  onClick={() => onOpenClientAccountAuth('login')}
                >
                  {t('hero.topbarSignIn')}
                </button>
                <span className="hero-topbar-auth-sep" aria-hidden>
                  |
                </span>
                <button
                  type="button"
                  className="hero-topbar-auth-link"
                  onClick={() => onOpenClientAccountAuth('signup')}
                >
                  {t('hero.topbarSignUp')}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  )
}
