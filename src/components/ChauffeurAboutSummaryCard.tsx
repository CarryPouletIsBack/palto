import { Globe, Linkedin, MapPin, Sparkles, Zap } from 'lucide-react'
import type { ChauffeurRideSettingsSnapshot } from '../constants/chauffeurRideSettingsStorage'
import type { ChauffeurServiceCatalogSnapshot } from '../constants/chauffeurServiceCatalog'
import {
  buildChauffeurCatalogCategoryRates,
  buildChauffeurServiceBadges,
  normalizeExternalUrl,
} from '../utils/chauffeurAboutSummary'
import './ChauffeurAboutSummaryCard.css'

const MAX_VISIBLE_BADGES = 6

type Props = {
  language: 'fr' | 'en'
  commune: string
  catalog: ChauffeurServiceCatalogSnapshot
  rideSettings: Pick<
    ChauffeurRideSettingsSnapshot,
    'petFriendly' | 'luggageAssistance' | 'insulatedBag' | 'pricePerKmEur' | 'baseFareEur'
  >
  websiteUrl?: string
  linkedinUrl?: string
  onWebsiteUrlChange?: (value: string) => void
  onLinkedinUrlChange?: (value: string) => void
}

function displayWebsiteLabel(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return ''
  try {
    const parsed = new URL(normalizeExternalUrl(trimmed))
    return parsed.hostname.replace(/^www\./, '')
  } catch {
    return trimmed
  }
}

export default function ChauffeurAboutSummaryCard({
  language,
  commune,
  catalog,
  rideSettings,
  websiteUrl = '',
  linkedinUrl = '',
  onWebsiteUrlChange,
  onLinkedinUrlChange,
}: Props) {
  const isEn = language === 'en'
  const isEditMode = Boolean(onWebsiteUrlChange || onLinkedinUrlChange)
  const categoryRates = buildChauffeurCatalogCategoryRates(catalog, language)
  const badges = buildChauffeurServiceBadges(catalog, language, {
    petFriendly: rideSettings.petFriendly,
    luggageAssistance: rideSettings.luggageAssistance,
    insulatedBag: rideSettings.insulatedBag,
  })
  const visibleBadges = badges.slice(0, MAX_VISIBLE_BADGES)
  const overflowCount = badges.length - visibleBadges.length

  const hasInstantFare =
    rideSettings.pricePerKmEur.trim().length > 0 || rideSettings.baseFareEur.trim().length > 0

  const websiteHref = normalizeExternalUrl(websiteUrl)
  const linkedinHref = normalizeExternalUrl(linkedinUrl)
  const communeLabel = commune.trim()

  return (
    <aside className="chauffeur-about-summary-card" aria-label={isEn ? 'Public profile summary' : 'Résumé public'}>
      <header className="chauffeur-about-summary-card__header">
        <p className="chauffeur-about-summary-card__eyebrow">
          {isEn ? 'Client preview' : 'Aperçu client'}
        </p>
        <h3 className="chauffeur-about-summary-card__title">
          {isEn ? 'What passengers see' : 'Ce que voient les clients'}
        </h3>
      </header>

      <section className="chauffeur-about-summary-card__block">
        <h4 className="chauffeur-about-summary-card__block-title">
          {isEn ? 'Rates' : 'Tarifs'}
        </h4>
        {categoryRates.length > 0 ? (
          <ul className="chauffeur-about-summary-card__rate-list">
            {categoryRates.map((row) => (
              <li key={row.id} className="chauffeur-about-summary-card__rate-item">
                <span className="chauffeur-about-summary-card__rate-name">{row.categoryLabel}</span>
                <div className="chauffeur-about-summary-card__rate-prices">
                  <span className="chauffeur-about-summary-card__rate-amount" aria-label={row.priceLabel}>
                    {row.priceText}
                  </span>
                  {row.hasQuoteAddon ? (
                    <span className="chauffeur-about-summary-card__rate-quote">
                      {isEn ? '+ on quote' : '+ sur devis'}
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="chauffeur-about-summary-card__placeholder">
            {isEditMode
              ? isEn
                ? 'Enable offers in the Service tab.'
                : 'Activez vos offres dans l’onglet Service.'
              : isEn
                ? 'Rates not available.'
                : 'Tarifs non renseignés.'}
          </p>
        )}

        {hasInstantFare ? (
          <div className="chauffeur-about-summary-card__instant">
            <Zap size={16} strokeWidth={2.25} className="chauffeur-about-summary-card__instant-icon" aria-hidden />
            <div className="chauffeur-about-summary-card__instant-body">
              <p className="chauffeur-about-summary-card__instant-label">
                {isEn ? 'Instant ride on Palto Go' : 'Course à l’instant sur Palto Go'}
              </p>
              <p className="chauffeur-about-summary-card__instant-value">
                {rideSettings.baseFareEur.trim() || '—'} €
                <span className="chauffeur-about-summary-card__instant-sep" aria-hidden>
                  ·
                </span>
                {rideSettings.pricePerKmEur.trim() || '—'} €/km
              </p>
            </div>
          </div>
        ) : null}
      </section>

      <section className="chauffeur-about-summary-card__block">
        <div className="chauffeur-about-summary-card__block-title-row">
          <h4 className="chauffeur-about-summary-card__block-title">
            {isEn ? 'Services' : 'Services'}
          </h4>
          <Sparkles size={15} strokeWidth={2} className="chauffeur-about-summary-card__block-icon" aria-hidden />
        </div>
        {badges.length > 0 ? (
          <div className="chauffeur-about-summary-card__badges">
            {visibleBadges.map((badge) => (
              <span key={badge.id} className="chauffeur-about-summary-card__badge">
                {badge.label}
              </span>
            ))}
            {overflowCount > 0 ? (
              <span className="chauffeur-about-summary-card__badge chauffeur-about-summary-card__badge--overflow">
                +{overflowCount}
              </span>
            ) : null}
          </div>
        ) : (
          <p className="chauffeur-about-summary-card__placeholder">
            {isEditMode
              ? isEn
                ? 'Your service badges will appear here.'
                : 'Vos prestations apparaîtront ici.'
              : isEn
                ? 'No services listed.'
                : 'Aucune prestation listée.'}
          </p>
        )}
      </section>

      <section className="chauffeur-about-summary-card__block chauffeur-about-summary-card__block--details">
        <h4 className="chauffeur-about-summary-card__block-title">{isEn ? 'Details' : 'Détails'}</h4>
        <div className="chauffeur-about-summary-card__details">
          <div className="chauffeur-about-summary-card__detail">
            <span className="chauffeur-about-summary-card__detail-icon-wrap" aria-hidden>
              <MapPin size={18} strokeWidth={2} />
            </span>
            <div className="chauffeur-about-summary-card__detail-content">
              <p
                className={`chauffeur-about-summary-card__detail-primary${
                  communeLabel ? '' : ' chauffeur-about-summary-card__detail-primary--muted'
                }`}
              >
                {communeLabel || (isEn ? 'Commune not set' : 'Commune à préciser')}
              </p>
              <p className="chauffeur-about-summary-card__detail-secondary">La Réunion</p>
            </div>
          </div>

          <div className="chauffeur-about-summary-card__detail">
            <span className="chauffeur-about-summary-card__detail-icon-wrap" aria-hidden>
              <Globe size={18} strokeWidth={2} />
            </span>
            <div className="chauffeur-about-summary-card__detail-content">
              {onWebsiteUrlChange ? (
                <input
                  type="url"
                  className="chauffeur-about-summary-card__link-input"
                  value={websiteUrl}
                  onChange={(e) => onWebsiteUrlChange(e.target.value)}
                  placeholder={isEn ? 'Website (optional)' : 'Site web (facultatif)'}
                  aria-label={isEn ? 'Website URL' : 'URL du site web'}
                />
              ) : websiteHref ? (
                <a
                  href={websiteHref}
                  className="chauffeur-about-summary-card__detail-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {displayWebsiteLabel(websiteUrl)}
                </a>
              ) : (
                <p className="chauffeur-about-summary-card__detail-secondary">
                  {isEn ? 'No website' : 'Pas de site web'}
                </p>
              )}
            </div>
          </div>

          <div className="chauffeur-about-summary-card__detail">
            <span className="chauffeur-about-summary-card__detail-icon-wrap" aria-hidden>
              <Linkedin size={18} strokeWidth={2} />
            </span>
            <div className="chauffeur-about-summary-card__detail-content">
              {onLinkedinUrlChange ? (
                <input
                  type="url"
                  className="chauffeur-about-summary-card__link-input"
                  value={linkedinUrl}
                  onChange={(e) => onLinkedinUrlChange(e.target.value)}
                  placeholder={isEn ? 'LinkedIn (optional)' : 'LinkedIn (facultatif)'}
                  aria-label={isEn ? 'LinkedIn URL' : 'URL LinkedIn'}
                />
              ) : linkedinHref ? (
                <a
                  href={linkedinHref}
                  className="chauffeur-about-summary-card__detail-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  LinkedIn
                </a>
              ) : (
                <p className="chauffeur-about-summary-card__detail-secondary">
                  {isEn ? 'No LinkedIn profile' : 'Pas de profil LinkedIn'}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </aside>
  )
}
