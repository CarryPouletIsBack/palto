import { useState, useCallback, useEffect, useRef } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { trackEvent } from '../services/googleAnalyticsTracking'
import { DashboardHomeTopbar } from './DashboardHomeTopbar'
import { DashboardHomeRidesBanner } from './DashboardHomeRidesBanner'
import { HomeFooter } from './HomeFooter'
import BetaTestBanner from './BetaTestBanner'
import './Dashboard.css'
import './Dashboard.app-theme.css'
import './Hero.css'
import { PLACEHOLDER_COVER } from '../constants/imagePlaceholders'
import { POPULAR_DESTINATIONS, type PopularDestination } from '../data/popularDestinations'
import { saveGoPrefill } from '../constants/goPrefillStorage'
import { resolveHeroPickupPrefill } from '../services/heroPickupPrefill'
import { geocodeForwardSuggestions, type GeocodeSuggestion } from '../services/addressGeocoding'
import { REUNION_ISLAND_BBOX_GEOCODE } from '../constants/reunionIsland'
import { CalendarRange, Car, Wallet } from 'lucide-react'
import { useClientHomeTopbarRides } from '../hooks/useClientHomeTopbarRides'
import {
  DEFAULT_HERO_DEPARTMENT_ID,
  getHeroDepartmentLabel,
  HERO_DEPARTMENTS,
  type HeroDepartmentId,
} from '../data/heroDepartments'
import PaltoScheduledDateTimeFields from './PaltoScheduledDateTimeFields'

interface HeroProps {
  onPageChange: (page: string, projectImage?: string, projectCategory?: string) => void
  onOpenClientAccountAuth?: (mode: 'login' | 'signup') => void
  /** Passager déjà connecté : ouvrir l’espace compte (ex. depuis la topbar). */
  onOpenClientAccount?: () => void
  /** Page « chauffeur sur place » (`/compte/course`). */
  onOpenClientLiveMeet?: () => void
  onNavigateHome?: () => void
  onOpenChauffeurAuth?: (mode: 'login' | 'signup') => void
}

const CHAUFFEUR_BENEFITS = [
  { key: 'chauffeurBenefit1' as const, Icon: CalendarRange },
  { key: 'chauffeurBenefit2' as const, Icon: Car },
  { key: 'chauffeurBenefit3' as const, Icon: Wallet },
]

const Hero = ({
  onPageChange,
  onOpenClientAccountAuth,
  onOpenClientAccount,
  onOpenClientLiveMeet,
  onNavigateHome,
  onOpenChauffeurAuth,
}: HeroProps) => {
  const { t, language } = useLanguage()
  const [pickupDraft, setPickupDraft] = useState('')
  const [destinationDraft, setDestinationDraft] = useState('')
  const [pickupTiming, setPickupTiming] = useState<'now' | 'later'>('now')
  const [pickupDateTime, setPickupDateTime] = useState('')
  const [pickupSuggestions, setPickupSuggestions] = useState<GeocodeSuggestion[]>([])
  const [destinationSuggestions, setDestinationSuggestions] = useState<GeocodeSuggestion[]>([])
  const [pickupOpen, setPickupOpen] = useState(false)
  const [destinationOpen, setDestinationOpen] = useState(false)
  const pickupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const destinationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { clientUpcomingRide, clientLiveMeetActive } = useClientHomeTopbarRides(language)
  const [homeDepartmentId, setHomeDepartmentId] = useState<HeroDepartmentId>(DEFAULT_HERO_DEPARTMENT_ID)
  const homeDepartmentLabel = getHeroDepartmentLabel(homeDepartmentId, language)

  const minPickupDateTimeLocal = useCallback(() => {
    const now = new Date()
    const tzOffsetMs = now.getTimezoneOffset() * 60000
    return new Date(now.getTime() - tzOffsetMs).toISOString().slice(0, 16)
  }, [])

  const handleVoirLesPrix = useCallback(async () => {
    const pickupPart = await resolveHeroPickupPrefill(pickupDraft)
    saveGoPrefill({
      ...pickupPart,
      destination: destinationDraft.trim(),
      timing: pickupTiming,
      datetime: pickupTiming === 'later' ? pickupDateTime.trim() : '',
    })
    trackEvent(
      'click',
      'hero_go_prices',
      `${destinationDraft.trim() ? 'with_dest' : 'empty_dest'}_${pickupTiming}`
    )
    onPageChange('project-Go', PLACEHOLDER_COVER, 'Application')
  }, [destinationDraft, onPageChange, pickupDateTime, pickupDraft, pickupTiming])

  const destTitle = (d: PopularDestination) => (language === 'en' ? d.titleEn : d.titleFr)

  const handlePopularSuggestionGo = useCallback(
    async (d: PopularDestination) => {
      const pickupPart = await resolveHeroPickupPrefill(pickupDraft)
      saveGoPrefill({
        ...pickupPart,
        destination: d.geocodeQuery,
        timing: pickupTiming,
        datetime: pickupTiming === 'later' ? pickupDateTime.trim() : '',
      })
      trackEvent('click', 'hero_home_suggestion_go', d.id)
      onPageChange('project-Go', PLACEHOLDER_COVER, 'Application')
    },
    [onPageChange, pickupDateTime, pickupDraft, pickupTiming]
  )

  useEffect(() => {
    if (!pickupOpen) return
    if (pickupTimerRef.current) clearTimeout(pickupTimerRef.current)
    const q = pickupDraft.trim()
    if (q.length < 3) {
      setPickupSuggestions([])
      return
    }
    pickupTimerRef.current = setTimeout(async () => {
      pickupTimerRef.current = null
      const list = await geocodeForwardSuggestions(q, undefined, {
        language,
        bbox: REUNION_ISLAND_BBOX_GEOCODE,
        limit: 5,
      })
      setPickupSuggestions(list)
    }, 180)
    return () => {
      if (pickupTimerRef.current) clearTimeout(pickupTimerRef.current)
    }
  }, [pickupOpen, pickupDraft, language])

  useEffect(() => {
    if (!destinationOpen) return
    if (destinationTimerRef.current) clearTimeout(destinationTimerRef.current)
    const q = destinationDraft.trim()
    if (q.length < 3) {
      setDestinationSuggestions([])
      return
    }
    destinationTimerRef.current = setTimeout(async () => {
      destinationTimerRef.current = null
      const list = await geocodeForwardSuggestions(q, undefined, {
        language,
        bbox: REUNION_ISLAND_BBOX_GEOCODE,
        limit: 5,
      })
      setDestinationSuggestions(list)
    }, 180)
    return () => {
      if (destinationTimerRef.current) clearTimeout(destinationTimerRef.current)
    }
  }, [destinationOpen, destinationDraft, language])

  return (
    <div className="hero-accueil-root">
      <div className="main-accueil">
        <div className="dashboard-container dashboard-container--home-accueil">
          <div className="dashboard-main">
            <DashboardHomeTopbar
              onOpenClientAccountAuth={onOpenClientAccountAuth}
              onOpenClientAccount={onOpenClientAccount}
              onNavigateHome={onNavigateHome}
            />
            <DashboardHomeRidesBanner
              clientUpcomingRide={clientUpcomingRide}
              clientLiveMeetActive={clientLiveMeetActive}
              onOpenClientLiveMeet={onOpenClientLiveMeet}
              analyticsSuffix="home"
            />

            <div className="hero-main hero-main--home-booking">
              <section className="hero-home-booking" aria-labelledby="hero-home-booking-title">
                <div className="hero-home-booking__grid">
                  <div className="hero-home-booking__col hero-home-booking__col--left">
                    <p className="hero-home-booking__cityline">
                      <span className="hero-home-booking__city">{homeDepartmentLabel}</span>
                      <span className="hero-home-booking__fr">{t('hero.homeCountrySuffix')}</span>
                      <label className="hero-home-booking__department-select-wrap">
                        <span className="hero-home-booking__department-select-sr">
                          {t('hero.homeDepartmentSelectAria')}
                        </span>
                        <select
                          className="hero-home-booking__department-select"
                          value={homeDepartmentId}
                          onChange={(e) => {
                            const next = e.target.value as HeroDepartmentId
                            setHomeDepartmentId(next)
                            trackEvent('click', 'hero_select_department', next)
                          }}
                          tabIndex={-1}
                          aria-hidden
                        >
                          {HERO_DEPARTMENTS.map((d) => (
                            <option key={d.id} value={d.id}>
                              {language === 'en' ? d.labelEn : d.labelFr}
                            </option>
                          ))}
                        </select>
                      </label>
                    </p>
                    <h2 id="hero-home-booking-title" className="hero-home-booking__title">
                      {t('hero.orderRideTitle')}
                    </h2>

                    <div className="dashboard-user-edit-grid hero-home-booking__field-grid">
                      <label>
                        {t('hero.homePickupTimingLabel')}
                        <select
                          id="hero-home-pickup-timing"
                          value={pickupTiming}
                          onChange={(e) => {
                            const next = e.target.value === 'later' ? 'later' : 'now'
                            setPickupTiming(next)
                            if (next === 'now') setPickupDateTime('')
                          }}
                        >
                          <option value="now">{t('hero.homeTimingNow')}</option>
                          <option value="later">{t('hero.homeTimingLater')}</option>
                        </select>
                      </label>
                      {pickupTiming === 'later' ? (
                        <label className="hero-home-booking__datetime-label">
                          {t('hero.homePickupDateTimeLabel')}
                          <PaltoScheduledDateTimeFields
                            id="hero-home-pickup-datetime"
                            value={pickupDateTime}
                            onChange={setPickupDateTime}
                            minDateTimeLocal={minPickupDateTimeLocal()}
                            ariaLabel={t('hero.homePickupDateTimeLabel')}
                            splitClassName="hero-home-datetime-split"
                          />
                        </label>
                      ) : null}
                      <label>
                        {t('hero.homePickupLabel')}
                        <input
                          id="hero-home-pickup"
                          type="text"
                          value={pickupDraft}
                          onChange={(e) => setPickupDraft(e.target.value)}
                          onFocus={() => setPickupOpen(true)}
                          onBlur={(e) => {
                            const next = e.relatedTarget as HTMLElement | null
                            if (next?.dataset?.heroPickupSuggest === 'true') return
                            setPickupOpen(false)
                          }}
                          placeholder={t('hero.homePickupPlaceholder')}
                          autoComplete="street-address"
                        />
                        {pickupOpen && pickupSuggestions.length > 0 ? (
                          <div className="hero-home-input-suggestions">
                            {pickupSuggestions.map((s) => (
                              <button
                                key={`pickup-${s.longitude}-${s.latitude}-${s.label}`}
                                type="button"
                                data-hero-pickup-suggest="true"
                                className="hero-home-input-suggestion-item"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  setPickupDraft(s.label)
                                  setPickupOpen(false)
                                }}
                              >
                                {s.label}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </label>
                      <label>
                        {t('hero.homeDestinationLabel')}
                        <input
                          id="hero-home-destination"
                          type="text"
                          value={destinationDraft}
                          onChange={(e) => setDestinationDraft(e.target.value)}
                          onFocus={() => setDestinationOpen(true)}
                          onBlur={(e) => {
                            const next = e.relatedTarget as HTMLElement | null
                            if (next?.dataset?.heroDestinationSuggest === 'true') return
                            setDestinationOpen(false)
                          }}
                          placeholder={t('hero.homeDestinationPlaceholder')}
                          autoComplete="street-address"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleVoirLesPrix()
                            }
                          }}
                        />
                        {destinationOpen && destinationSuggestions.length > 0 ? (
                          <div className="hero-home-input-suggestions">
                            {destinationSuggestions.map((s) => (
                              <button
                                key={`dest-${s.longitude}-${s.latitude}-${s.label}`}
                                type="button"
                                data-hero-destination-suggest="true"
                                className="hero-home-input-suggestion-item"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  setDestinationDraft(s.label)
                                  setDestinationOpen(false)
                                }}
                              >
                                {s.label}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </label>
                    </div>

                    <button type="button" className="add-course-submit hero-home-booking__submit" onClick={handleVoirLesPrix}>
                      {t('hero.homeSeePrices')}
                    </button>
                  </div>

                  <aside className="hero-home-booking__col hero-home-booking__col--right" aria-label={t('hero.homeSuggestionsTitle')}>
                    <h3 className="hero-home-suggestions__heading">{t('hero.homeSuggestionsTitle')}</h3>

                    <div className="hero-home-suggestions__group">
                      <h4 className="hero-home-suggestions__sub">{t('search.popularPlacesTitle')}</h4>
                      <div className="hero-home-suggestions__row hero-home-suggestions__row--popular">
                        {POPULAR_DESTINATIONS.map((d) => (
                          <button
                            key={d.id}
                            type="button"
                            className="hero-home-suggestion-card"
                            onClick={() => handlePopularSuggestionGo(d)}
                          >
                            <span className="hero-home-suggestion-card__img">
                              {d.imageSrc ? (
                                <img src={d.imageSrc} alt="" loading="lazy" decoding="async" />
                              ) : null}
                            </span>
                            <span className="hero-home-suggestion-card__title">{destTitle(d)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </aside>
                </div>
              </section>

              <section className="hero-home-chauffeur" aria-labelledby="hero-home-chauffeur-title">
                <div className="hero-home-chauffeur__grid">
                  <div className="hero-home-chauffeur__col hero-home-chauffeur__col--cta">
                    <h2 id="hero-home-chauffeur-title" className="hero-home-chauffeur__title">
                      {t('hero.chauffeurCtaTitle')}
                    </h2>
                    <div className="hero-home-chauffeur__actions" role="group" aria-label={t('hero.chauffeurCtaTitle')}>
                      <button
                        type="button"
                        className="hero-home-chauffeur__btn hero-home-chauffeur__btn--primary"
                        onClick={() => {
                          trackEvent('click', 'hero_chauffeur_cta', 'login')
                          if (onOpenChauffeurAuth) onOpenChauffeurAuth('login')
                          else onPageChange('dashboard')
                        }}
                      >
                        {t('hero.chauffeurCtaSignIn')}
                      </button>
                      <button
                        type="button"
                        className="hero-home-chauffeur__btn hero-home-chauffeur__btn--secondary"
                        onClick={() => {
                          trackEvent('click', 'hero_chauffeur_cta', 'signup')
                          if (onOpenChauffeurAuth) onOpenChauffeurAuth('signup')
                          else onPageChange('dashboard')
                        }}
                      >
                        {t('hero.chauffeurCtaSignUp')}
                      </button>
                    </div>
                  </div>
                  <div className="hero-home-chauffeur__col hero-home-chauffeur__col--benefits">
                    <div className="hero-home-chauffeur__benefits-inner">
                      <h3 className="hero-home-chauffeur__benefits-title">{t('hero.chauffeurBenefitsTitle')}</h3>
                      <div className="hero-home-chauffeur__benefits-rows" role="list">
                        {CHAUFFEUR_BENEFITS.map(({ key, Icon }) => (
                          <div key={key} className="hero-home-chauffeur__benefit-row" role="listitem">
                            <span className="hero-home-chauffeur__benefit-icon" aria-hidden>
                              <Icon size={22} strokeWidth={2} />
                            </span>
                            <p className="hero-home-chauffeur__benefit-text">{t(`hero.${key}`)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
        <HomeFooter onPageChange={onPageChange} />
        <BetaTestBanner placement="bottom" />
      </div>
    </div>
  )
}

export default Hero
