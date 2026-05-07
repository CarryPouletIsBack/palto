import { useCallback } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { trackEvent } from '../services/googleAnalyticsTracking'
import { DashboardHomeTopbar } from './DashboardHomeTopbar'
import { HomeFooter } from './HomeFooter'
import './Dashboard.css'
import './Dashboard.app-theme.css'
import './Hero.css'
import './HeroChauffeur.css'
import { PLACEHOLDER_COVER } from '../constants/imagePlaceholders'
import { CalendarRange, Car, MessagesSquare, Wallet } from 'lucide-react'

/** Page d’accueil chauffeur — landing type cursor.com/home, CTA principal inscription. */
export interface HeroChauffeurProps {
  onPageChange: (page: string, projectImage?: string, projectCategory?: string) => void
  onOpenClientAccountAuth?: (mode: 'login' | 'signup') => void
  onOpenClientAccount?: () => void
  onOpenClientLiveMeet?: () => void
  onNavigateHome?: () => void
  onOpenChauffeurAuth?: (mode: 'login' | 'signup') => void
}

const LANDING_FEATURES = [
  { key: 'Planning' as const, Icon: CalendarRange },
  { key: 'Fleet' as const, Icon: Car },
  { key: 'Money' as const, Icon: Wallet },
] as const

export function HeroChauffeur({
  onPageChange,
  onOpenClientAccountAuth,
  onOpenClientAccount,
  onNavigateHome,
  onOpenChauffeurAuth,
}: HeroChauffeurProps) {
  const { t } = useLanguage()

  const openSignup = useCallback(() => {
    trackEvent('click', 'hero_chauffeur_landing', 'signup_primary')
    if (onOpenChauffeurAuth) onOpenChauffeurAuth('signup')
    else onPageChange('dashboard')
  }, [onOpenChauffeurAuth, onPageChange])

  const openSignin = useCallback(() => {
    trackEvent('click', 'hero_chauffeur_landing', 'signin_secondary')
    if (onOpenChauffeurAuth) onOpenChauffeurAuth('login')
    else onPageChange('dashboard')
  }, [onOpenChauffeurAuth, onPageChange])

  const goPassengerHome = useCallback(() => {
    trackEvent('click', 'hero_chauffeur_landing', 'passenger_home')
    onPageChange('accueil')
  }, [onPageChange])

  const goBookRide = useCallback(() => {
    trackEvent('click', 'hero_chauffeur_landing', 'book_ride')
    onPageChange('project-Go', PLACEHOLDER_COVER, 'Application')
  }, [onPageChange])

  return (
    <div className="hero-accueil-root hero-accueil-root--chauffeur">
      <div className="main-accueil">
        <div className="dashboard-container dashboard-container--home-accueil dashboard-container--home-chauffeur">
          <div className="dashboard-main">
            <DashboardHomeTopbar
              onOpenClientAccountAuth={onOpenChauffeurAuth ?? onOpenClientAccountAuth}
              onOpenClientAccount={onOpenClientAccount}
              onNavigateHome={onNavigateHome}
            />

            <div className="hero-chauffeur-landing">
              <div className="hero-chauffeur-landing__inner">
                <header className="hero-chauffeur-landing__hero">
                  <h1 className="hero-chauffeur-landing__title">
                    <span className="hero-chauffeur-landing__title-lead">{t('hero.chauffeurLandingHeadlineLead')}</span>
                    <span className="hero-chauffeur-landing__title-accent">{t('hero.chauffeurLandingHeadlineAccent')}</span>
                  </h1>
                  <p className="hero-chauffeur-landing__sub">{t('hero.chauffeurLandingSub')}</p>

                  <div className="hero-chauffeur-landing__ctas">
                    <button type="button" className="hero-chauffeur-landing__btn-primary" onClick={openSignup}>
                      {t('hero.chauffeurLandingCtaSignup')}
                    </button>
                    <button type="button" className="hero-chauffeur-landing__link" onClick={openSignin}>
                      {t('hero.chauffeurLandingCtaSignin')}
                      <span className="hero-chauffeur-landing__link-arrow" aria-hidden>
                        →
                      </span>
                    </button>
                    <button type="button" className="hero-chauffeur-landing__link" onClick={goPassengerHome}>
                      {t('hero.chauffeurLandingLinkPassengers')}
                      <span className="hero-chauffeur-landing__link-arrow" aria-hidden>
                        →
                      </span>
                    </button>
                    <button type="button" className="hero-chauffeur-landing__link" onClick={goBookRide}>
                      {t('hero.chauffeurLandingLinkBook')}
                      <span className="hero-chauffeur-landing__link-arrow" aria-hidden>
                        →
                      </span>
                    </button>
                  </div>
                </header>

                <div className="hero-chauffeur-landing__mock-wrap" aria-hidden>
                  <div className="hero-chauffeur-landing__mock">
                    <div className="hero-chauffeur-landing__mock-chrome">
                      <div className="hero-chauffeur-landing__mock-dots">
                        <span />
                        <span />
                        <span />
                      </div>
                      <div className="hero-chauffeur-landing__mock-title">{t('hero.chauffeurLandingMockCaption')}</div>
                    </div>
                    <div className="hero-chauffeur-landing__mock-body">
                      <div className="hero-chauffeur-landing__mock-sidebar">
                        <div className="hero-chauffeur-landing__mock-nav-item hero-chauffeur-landing__mock-nav-item--active" />
                        <div className="hero-chauffeur-landing__mock-nav-item" />
                        <div className="hero-chauffeur-landing__mock-nav-item" />
                        <div className="hero-chauffeur-landing__mock-nav-item" />
                      </div>
                      <div className="hero-chauffeur-landing__mock-main">
                        <div className="hero-chauffeur-landing__mock-row">
                          <span className="hero-chauffeur-landing__mock-row-text">
                            {t('hero.chauffeurLandingMockTask1')}
                          </span>
                          <span className="hero-chauffeur-landing__mock-pill">{t('hero.chauffeurLandingMockPillLive')}</span>
                        </div>
                        <div className="hero-chauffeur-landing__mock-row">
                          <span className="hero-chauffeur-landing__mock-row-text">
                            {t('hero.chauffeurLandingMockTask2')}
                          </span>
                          <span className="hero-chauffeur-landing__mock-pill hero-chauffeur-landing__mock-pill--warn">
                            {t('hero.chauffeurLandingMockPillAction')}
                          </span>
                        </div>
                        <div className="hero-chauffeur-landing__mock-row">
                          <span className="hero-chauffeur-landing__mock-row-text">
                            {t('hero.chauffeurLandingMockTask3')}
                          </span>
                          <span className="hero-chauffeur-landing__mock-pill hero-chauffeur-landing__mock-pill--muted">
                            {t('hero.chauffeurLandingMockPillStats')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <section className="hero-chauffeur-landing__match" aria-labelledby="hero-chauffeur-match-title">
                  <div className="hero-chauffeur-landing__match-grid">
                    <div className="hero-chauffeur-landing__match-copy">
                      <p className="hero-chauffeur-landing__match-eyebrow">{t('hero.chauffeurLandingMatchEyebrow')}</p>
                      <h2 id="hero-chauffeur-match-title" className="hero-chauffeur-landing__match-title">
                        {t('hero.chauffeurLandingMatchTitle')}
                      </h2>
                      <p className="hero-chauffeur-landing__match-lead">{t('hero.chauffeurLandingMatchLead')}</p>
                      <ul className="hero-chauffeur-landing__match-list">
                        <li>{t('hero.chauffeurLandingMatchPoint1')}</li>
                        <li>{t('hero.chauffeurLandingMatchPoint2')}</li>
                        <li>{t('hero.chauffeurLandingMatchPoint3')}</li>
                      </ul>
                      <div className="hero-chauffeur-landing__planning-callout">
                        <div className="hero-chauffeur-landing__planning-callout-icon" aria-hidden>
                          <CalendarRange size={24} strokeWidth={2} />
                        </div>
                        <div className="hero-chauffeur-landing__planning-callout-text">
                          <span className="hero-chauffeur-landing__planning-badge">
                            {t('hero.chauffeurLandingPlanningBadge')}
                          </span>
                          <h3 className="hero-chauffeur-landing__planning-title">
                            {t('hero.chauffeurLandingPlanningTitle')}
                          </h3>
                          <p className="hero-chauffeur-landing__planning-body">
                            {t('hero.chauffeurLandingPlanningBody')}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="hero-chauffeur-landing__match-visual" aria-hidden>
                      <div className="hero-chauffeur-landing__match-visual-card">
                        <div className="hero-chauffeur-landing__messengers-stack">
                          <span className="hero-chauffeur-landing__messenger-chip hero-chauffeur-landing__messenger-chip--dead">
                            WhatsApp
                          </span>
                          <span className="hero-chauffeur-landing__messenger-chip hero-chauffeur-landing__messenger-chip--dead">
                            Messenger
                          </span>
                          <span className="hero-chauffeur-landing__messenger-chip hero-chauffeur-landing__messenger-chip--dead">
                            SMS
                          </span>
                        </div>
                        <div className="hero-chauffeur-landing__match-visual-arrow">→</div>
                        <div className="hero-chauffeur-landing__palto-thread">
                          <span className="hero-chauffeur-landing__palto-thread-label">Palto</span>
                          <div className="hero-chauffeur-landing__palto-thread-lines">
                            <span />
                            <span />
                            <span />
                          </div>
                          <p className="hero-chauffeur-landing__palto-thread-caption">
                            {t('hero.chauffeurLandingMatchVisualCaption')}
                          </p>
                        </div>
                        <div className="hero-chauffeur-landing__match-visual-icon-wrap">
                          <MessagesSquare size={20} strokeWidth={1.75} />
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="hero-chauffeur-landing__trusted" aria-labelledby="hero-chauffeur-trusted">
                  <h2 id="hero-chauffeur-trusted" className="hero-chauffeur-landing__trusted-label">
                    {t('hero.chauffeurLandingTrusted')}
                  </h2>
                  <div className="hero-chauffeur-landing__trusted-strip">
                    <span>{t('hero.chauffeurLandingTrustedTag1')}</span>
                    <span>{t('hero.chauffeurLandingTrustedTag2')}</span>
                    <span>{t('hero.chauffeurLandingTrustedTag3')}</span>
                    <span>{t('hero.chauffeurLandingTrustedTag4')}</span>
                  </div>
                </section>

                <section className="hero-chauffeur-landing__features" aria-label={t('hero.chauffeurBenefitsTitle')}>
                  {LANDING_FEATURES.map(({ key, Icon }) => (
                    <article key={key} className="hero-chauffeur-landing__feature">
                      <div className="hero-chauffeur-landing__feature-icon">
                        <Icon size={22} strokeWidth={2} aria-hidden />
                      </div>
                      <h3>{t(`hero.chauffeurLandingFeature${key}Title`)}</h3>
                      <p>{t(`hero.chauffeurLandingFeature${key}Body`)}</p>
                    </article>
                  ))}
                </section>

                <section className="hero-chauffeur-landing__closing" aria-labelledby="hero-chauffeur-closing">
                  <h2 id="hero-chauffeur-closing">{t('hero.chauffeurLandingClosingTitle')}</h2>
                  <p>{t('hero.chauffeurLandingClosingSub')}</p>
                  <button type="button" className="hero-chauffeur-landing__btn-primary" onClick={openSignup}>
                    {t('hero.chauffeurLandingCtaSignup')}
                  </button>
                </section>
              </div>
            </div>
          </div>
        </div>
        <HomeFooter onPageChange={onPageChange} />
      </div>
    </div>
  )
}

export default HeroChauffeur
