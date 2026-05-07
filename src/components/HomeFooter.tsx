import type { MouseEvent } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { trackEvent } from '../services/googleAnalyticsTracking'
import { SocialFooterLinks } from './SocialFooterLinks'
import { PLACEHOLDER_COVER } from '../constants/imagePlaceholders'
import { POPULAR_DESTINATIONS, type PopularDestination } from '../data/popularDestinations'
import './HomeFooter.css'

interface HomeFooterProps {
  onPageChange: (page: string, projectImage?: string, projectCategory?: string) => void
}

function destinationLabel(d: PopularDestination, language: 'fr' | 'en') {
  return language === 'en' ? d.titleEn : d.titleFr
}

export function HomeFooter({ onPageChange }: HomeFooterProps) {
  const { t, language } = useLanguage()
  const prefix = language === 'en' ? '/en' : '/fr'
  const year = new Date().getFullYear()

  const nav = (label: string) => {
    trackEvent('click', 'home_footer', label)
  }

  const prevent =
    (fn: () => void) =>
    (e: MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault()
      fn()
    }

  return (
    <footer className="home-footer" aria-label={t('hero.homeFooterAria')}>
      <div className="home-footer__inner">
        <nav className="home-footer__nav" aria-label={t('hero.homeFooterNavAria')}>
          <a
            href={`${prefix}/go`}
            className="home-footer__link"
            onClick={prevent(() => {
              nav('go')
              onPageChange('project-Go', PLACEHOLDER_COVER, 'Application')
            })}
          >
            Go
          </a>
          <a
            href={`${prefix}/contact`}
            className="home-footer__link"
            onClick={prevent(() => {
              nav('contact')
              onPageChange('contact')
            })}
          >
            {t('nav.contact')}
          </a>
          <a
            href={`${prefix}/compte`}
            className="home-footer__link"
            onClick={prevent(() => {
              nav('client_compte')
              onPageChange('client-compte')
            })}
          >
            {t('clientAccount.title')}
          </a>
          <a
            href={`${prefix}/dashboard`}
            className="home-footer__link"
            onClick={prevent(() => {
              nav('dashboard')
              onPageChange('dashboard')
            })}
          >
            {t('hero.seoDriverLink')}
          </a>
        </nav>

        <section
          className="home-footer__suggested"
          aria-labelledby="home-footer-suggested-heading"
        >
          <h2 id="home-footer-suggested-heading" className="home-footer__suggested-heading">
            {t('search.popularPlacesTitle')}
          </h2>
          <ul className="home-footer__suggested-list">
            {POPULAR_DESTINATIONS.map((d) => (
              <li key={d.id} className="home-footer__suggested-item">
                <a
                  href={`${prefix}/lieu/${encodeURIComponent(d.id)}`}
                  className="home-footer__link home-footer__link--suggested"
                  onClick={prevent(() => {
                    nav(`lieu_${d.id}`)
                    onPageChange(`destination-${d.id}`)
                  })}
                >
                  {destinationLabel(d, language)}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <SocialFooterLinks className="home-footer__social" />
        <p className="home-footer__copy">{t('hero.footer', { year })}</p>
      </div>
    </footer>
  )
}
