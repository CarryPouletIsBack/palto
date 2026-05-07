import { useState, useRef, useEffect, useMemo, useCallback, type MouseEvent, type TouchEvent } from 'react'
import { motion, useMotionValue, animate } from 'framer-motion'
import { useLanguage } from '../contexts/LanguageContext'
import { trackEvent } from '../services/googleAnalyticsTracking'
import { DashboardHomeTopbar } from './DashboardHomeTopbar'
import { DashboardHomeRidesBanner } from './DashboardHomeRidesBanner'
import { useClientHomeTopbarRides } from '../hooks/useClientHomeTopbarRides'
import { getDestinationById, type FlightRouteBannerData, type PopularDestination } from '../data/popularDestinations'
import { DEFAULT_USER_ORIGIN_LABEL } from '../constants/defaultUserOrigin'
import { saveGoPrefill } from '../constants/goPrefillStorage'
import { PLACEHOLDER_COVER } from '../constants/imagePlaceholders'
import BlurText from './BlurText'
import './SingleProject.css'
import './SingleProject.app-theme.css'
import './DestinationSpotlight.css'

function FlightRouteStack({ data, language }: { data: FlightRouteBannerData; language: 'fr' | 'en' }) {
  const footer = language === 'en' ? data.footerEn : data.footerFr
  return (
    <div className="destination-spotlight-flight-route-scroll" aria-hidden>
      <div className="destination-spotlight-flight-route destination-spotlight-flight-route--single-line">
        <span className="destination-spotlight-flight-route__index">{data.legIndex}</span>
        <span className="destination-spotlight-flight-route__airline">{data.airlineCode}</span>
        <span className="destination-spotlight-flight-route__flight">{data.primaryFlight}</span>
        {data.secondaryFlight ? (
          <span className="destination-spotlight-flight-route__flight">{data.secondaryFlight}</span>
        ) : null}
        <span className="destination-spotlight-flight-route__aircraft">{data.aircraft}</span>
        <span className="destination-spotlight-flight-route__city">{data.originCity}</span>
        <span className="destination-spotlight-flight-route__iata">{data.originIata}</span>
        <span className="destination-spotlight-flight-route__dash">–</span>
        <span className="destination-spotlight-flight-route__city">{data.destCity}</span>
        <span className="destination-spotlight-flight-route__iata">{data.destIata}</span>
        {footer ? (
          <>
            <span className="destination-spotlight-flight-route__dot" aria-hidden>
              {' · '}
            </span>
            <span className="destination-spotlight-flight-route__footer">{footer}</span>
          </>
        ) : null}
      </div>
    </div>
  )
}

const CLOSE_THRESHOLD = 100
const LIFT_SCROLL_MAX = 200

const scrollSectionProps = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '0px 0px -60px 0px' as const },
  transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const },
}

export type DestinationSpotlightProps = {
  destinationId: string
  onBack: () => void
  onNavigateHome: () => void
  onOpenClientAccountAuth?: (mode: 'login' | 'signup') => void
  onBookToGo: (destination: PopularDestination) => void
  onOpenClientAccount?: () => void
  onOpenClientLiveMeet?: () => void
}

export function DestinationSpotlight({
  destinationId,
  onBack,
  onNavigateHome,
  onOpenClientAccountAuth,
  onBookToGo,
  onOpenClientAccount,
  onOpenClientLiveMeet,
}: DestinationSpotlightProps) {
  const { t, language } = useLanguage()
  const { clientUpcomingRide, clientLiveMeetActive } = useClientHomeTopbarRides(language)
  const destination = getDestinationById(destinationId)

  const pageRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startY, setStartY] = useState<number | null>(null)
  const [startYValue, setStartYValue] = useState(0)
  const [initialScrollTop, setInitialScrollTop] = useState(0)

  const y = useMotionValue(0)
  const screenHeight = useMemo(() => (typeof window !== 'undefined' ? window.innerHeight : 800), [])
  const [liftScroll] = useState(LIFT_SCROLL_MAX)

  const initialTop = useMemo(() => screenHeight * 0.48 + 100, [screenHeight])
  const topPosition = useMemo(() => {
    const progress = Math.min(liftScroll / LIFT_SCROLL_MAX, 1)
    return initialTop * (1 - progress)
  }, [liftScroll, initialTop])

  const maxSwipeDown = useMemo(() => Math.min(screenHeight * 0.95, screenHeight - 40), [screenHeight])

  useEffect(() => {
    y.set(0)
    const el = pageRef.current
    if (el) el.scrollTo(0, 0)
  }, [destinationId, y])

  const canSwipe = useCallback(() => {
    return Boolean(pageRef.current)
  }, [])

  const handleBarMouseDown = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (canSwipe()) {
      const target = pageRef.current
      setInitialScrollTop(target ? target.scrollTop : 0)
      setIsDragging(true)
      setStartY(e.clientY)
      setStartYValue(y.get())
    }
  }

  const handleBarTouchStart = (e: TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (canSwipe()) {
      const target = pageRef.current
      setInitialScrollTop(target ? target.scrollTop : 0)
      setIsDragging(true)
      setStartY(e.touches[0].clientY)
      setStartYValue(y.get())
    }
  }

  const endDrag = useCallback(() => {
    const currentY = y.get()
    setIsDragging(false)
    setStartY(null)
    setStartYValue(0)
    if (currentY > CLOSE_THRESHOLD) {
      void animate(y, screenHeight, { duration: 0.35, ease: 'easeIn' }).then(() => onBack())
    } else {
      void animate(y, 0, { duration: 0.28, ease: 'easeOut' })
    }
  }, [y, screenHeight, onBack])

  useEffect(() => {
    if (!isDragging || startY === null) return

    const handleMouseMove = (e: MouseEvent) => {
      const target = pageRef.current
      const translationY = e.clientY - startY

      if (translationY < 0) {
        if (target && target.scrollTop > initialScrollTop + 5) {
          setIsDragging(false)
          setStartY(null)
          setStartYValue(0)
          y.set(0)
          return
        }
        return
      }

      e.preventDefault()
      e.stopPropagation()
      const nextY = startYValue + translationY
      y.set(Math.min(maxSwipeDown, Math.max(0, nextY)))
    }

    const handleTouchMove = (e: TouchEvent) => {
      const target = pageRef.current
      const translationY = e.touches[0].clientY - startY

      if (translationY < 0) {
        if (target && target.scrollTop > initialScrollTop + 5) {
          setIsDragging(false)
          setStartY(null)
          setStartYValue(0)
          y.set(0)
          return
        }
        return
      }

      e.preventDefault()
      e.stopPropagation()
      const nextY = startYValue + translationY
      y.set(Math.min(maxSwipeDown, Math.max(0, nextY)))
    }

    const handleEnd = (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      endDrag()
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: false })
    window.addEventListener('mouseup', handleEnd, { passive: false })
    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('touchend', handleEnd, { passive: false })

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleEnd)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleEnd)
    }
  }, [isDragging, startY, startYValue, initialScrollTop, y, maxSwipeDown, endDrag])

  if (!destination) {
    return null
  }

  const title = language === 'en' ? destination.titleEn : destination.titleFr

  const handleBook = () => {
    trackEvent('click', 'destination_spotlight_cta', destination.id)
    saveGoPrefill({
      pickup: DEFAULT_USER_ORIGIN_LABEL,
      destination: destination.geocodeQuery,
      timing: 'now',
      datetime: '',
    })
    onBookToGo(destination)
  }

  return (
    <motion.div
      ref={pageRef}
      className={`destination-spotlight page active single-project-page ${isDragging ? 'dragging' : ''}`}
      style={
        isDragging
          ? { y, top: `${topPosition}px`, borderRadius: topPosition <= 0 ? 0 : '24px 24px 0 0' }
          : { y, top: `${topPosition}px`, borderRadius: topPosition <= 0 ? 0 : '24px 24px 0 0' }
      }
      initial={false}
    >
      <div
        className="swipe-indicator-bar"
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        onMouseDown={handleBarMouseDown}
        onTouchStart={handleBarTouchStart}
      >
        <div className="swipe-indicator-handle" />
      </div>

      <div className="main-single-project">
        <div className="dashboard-container dashboard-container--home-accueil single-project-go-topbar-wrap">
          <div className="dashboard-main single-project-go-topbar-wrap__main">
            <DashboardHomeTopbar
              onOpenClientAccountAuth={onOpenClientAccountAuth}
              onNavigateHome={onNavigateHome}
            />
            <DashboardHomeRidesBanner
              clientUpcomingRide={clientUpcomingRide}
              clientLiveMeetActive={clientLiveMeetActive}
              onOpenClientLiveMeet={onOpenClientLiveMeet}
              analyticsSuffix="destination"
            />
          </div>
        </div>

        <div className="project-top-block">
          <div className="destination-spotlight-cover-bleed">
            <figure className="destination-spotlight-cover" aria-label={title}>
              <img
                src={destination.imageSrc?.trim() ? destination.imageSrc : PLACEHOLDER_COVER}
                alt=""
                loading="eager"
                decoding="async"
              />
            </figure>
            <div
              className="destination-spotlight-flight-banner"
              role="region"
              aria-label={t('hero.destinationSpotlightFlightTitle')}
            >
              <p className="destination-spotlight-flight-banner__title">{t('hero.destinationSpotlightFlightTitle')}</p>
              {destination.flightRouteBanner ? (
                <>
                  <span className="sr-only">
                    {language === 'en' ? destination.flightHoursEn : destination.flightHoursFr}
                  </span>
                  <FlightRouteStack data={destination.flightRouteBanner} language={language} />
                </>
              ) : (
                <p className="destination-spotlight-flight-banner__hours">
                  {language === 'en' ? destination.flightHoursEn : destination.flightHoursFr}
                </p>
              )}
            </div>
          </div>
          <div className="project-header-section">
            <h1 className="project-main-title">
              <BlurText text={title} className="project-main-title" />
            </h1>
            <div className="project-badges">
              <span className="project-badge">{t('hero.destinationSpotlightBadge')}</span>
            </div>
            <p className="project-subtitle">{destination.geocodeQuery}</p>
            <button type="button" className="project-external-link destination-spotlight-cta" onClick={handleBook}>
              {t('hero.destinationSpotlightCta')}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </button>
          </div>

          <motion.section id="destination-context" className="project-section context-project-section" {...scrollSectionProps}>
            <div className="context-project-wrapper">
              <h2 className="section-title">{t('hero.destinationSpotlightContextTitle')}</h2>
              <div className="context-project-grid destination-spotlight-context-grid">
                <div className="context-project-left">
                  <div className="context-intro">
                    <p>{t('hero.destinationSpotlightLead')}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        </div>
      </div>
    </motion.div>
  )
}
