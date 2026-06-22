import { PLACEHOLDER_VEHICLE } from '../constants/imagePlaceholders'
import { useLanguage } from '../contexts/LanguageContext'
import { trackEvent } from '../services/googleAnalyticsTracking'
import './Dashboard.css'
import './Dashboard.app-theme.css'

export type DashboardHomeChauffeurBannerProps = {
  onNavigateChauffeurHome?: () => void
  /** Suffixe analytics pour distinguer accueil / page Go. */
  analyticsSuffix?: 'home' | 'go'
}

/** Bandeau sous la topbar : recrutement / orientation vers l’espace chauffeur. */
export function DashboardHomeChauffeurBanner({
  onNavigateChauffeurHome,
  analyticsSuffix = 'home',
}: DashboardHomeChauffeurBannerProps) {
  const { t } = useLanguage()
  if (!onNavigateChauffeurHome) return null

  return (
    <section
      className="dashboard-home-chauffeur-banner"
      role="region"
      aria-label={t('hero.driverRecruitBannerAria')}
    >
      <div className="dashboard-home-chauffeur-banner__inner">
        <div className="dashboard-home-chauffeur-banner__icon-wrap" aria-hidden>
          <img
            className="dashboard-home-chauffeur-banner__icon-img"
            src={PLACEHOLDER_VEHICLE}
            alt=""
            loading="lazy"
            decoding="async"
          />
        </div>
        <div className="dashboard-home-chauffeur-banner__copy">
          <p className="dashboard-home-chauffeur-banner__title">{t('hero.driverRecruitBannerTitle')}</p>
          {t('hero.driverRecruitBannerLead') ? (
            <p className="dashboard-home-chauffeur-banner__lead">{t('hero.driverRecruitBannerLead')}</p>
          ) : null}
        </div>
        <button
          type="button"
          className="dashboard-home-chauffeur-banner__cta"
          onClick={() => {
            trackEvent('click', 'hero_chauffeur_banner', analyticsSuffix)
            onNavigateChauffeurHome()
          }}
        >
          {t('hero.driverRecruitBannerCta')}
        </button>
      </div>
    </section>
  )
}
