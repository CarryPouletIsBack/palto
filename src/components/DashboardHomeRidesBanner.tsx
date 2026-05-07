import { MapPin } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import { trackEvent } from '../services/googleAnalyticsTracking'
import type { ClientTopbarUpcomingRide } from './DashboardHomeTopbar'
import './Dashboard.css'
import './Dashboard.app-theme.css'

export type DashboardHomeRidesBannerProps = {
  clientUpcomingRide?: ClientTopbarUpcomingRide | null
  clientLiveMeetActive?: boolean
  onOpenClientLiveMeet?: () => void
  /** Suffixe analytics pour distinguer accueil / page destination / Go. */
  analyticsSuffix?: 'home' | 'destination' | 'go'
}

/** Bandeau sous la topbar d’accueil (ou page Go) : prochaine course + CTA rejoindre le chauffeur. */
export function DashboardHomeRidesBanner({
  clientUpcomingRide,
  clientLiveMeetActive,
  onOpenClientLiveMeet,
  analyticsSuffix = 'home',
}: DashboardHomeRidesBannerProps) {
  const { t } = useLanguage()
  const showLive = Boolean(clientLiveMeetActive && onOpenClientLiveMeet)
  if (!clientUpcomingRide && !showLive) return null

  return (
    <section
      className="dashboard-home-rides-banner"
      role="region"
      aria-label={t('hero.clientTopbarRidesAria')}
    >
      <div className="dashboard-home-rides-banner__inner">
        {clientUpcomingRide ? (
          <div className="dashboard-home-rides-banner__upcoming">
            <div className="dashboard-home-topbar-upcoming" role="status">
              <MapPin size={14} className="dashboard-home-topbar-upcoming-ico" aria-hidden />
              <span className="dashboard-home-topbar-upcoming-label">{t('hero.clientNextRideLabel')}</span>
              <span className="dashboard-home-topbar-upcoming-route">
                {clientUpcomingRide.departShort} → {clientUpcomingRide.arriveShort}
              </span>
              <span className="dashboard-home-topbar-upcoming-sep" aria-hidden>
                ·
              </span>
              <time className="dashboard-home-topbar-upcoming-time" dateTime={clientUpcomingRide.startsAtIso}>
                {clientUpcomingRide.startsLabel}
              </time>
            </div>
          </div>
        ) : null}
        {showLive ? (
          <div className="dashboard-home-rides-banner__cta">
            <button
              type="button"
              className="dashboard-home-topbar-pill dashboard-home-topbar-pill--live"
              onClick={() => {
                trackEvent('click', 'hero_rides_banner', `client_live_meet_${analyticsSuffix}`)
                onOpenClientLiveMeet()
              }}
            >
              {t('hero.clientLiveMeetCta')}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  )
}
