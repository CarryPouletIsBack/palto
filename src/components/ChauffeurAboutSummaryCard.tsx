import { Globe, Info, Linkedin, MapPin } from 'lucide-react'
import type { ChauffeurRideSettingsSnapshot } from '../constants/chauffeurRideSettingsStorage'
import type { ChauffeurServiceCatalogSnapshot } from '../constants/chauffeurServiceCatalog'
import {
  buildChauffeurServiceBadges,
  formatChauffeurCatalogPriceRange,
  normalizeExternalUrl,
  summarizeChauffeurCatalogPrices,
} from '../utils/chauffeurAboutSummary'
import './ChauffeurAboutSummaryCard.css'

const MAX_VISIBLE_BADGES = 5

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
  const priceSummary = summarizeChauffeurCatalogPrices(catalog)
  const priceLabel = formatChauffeurCatalogPriceRange(priceSummary, language)
  const badges = buildChauffeurServiceBadges(catalog, language, {
    petFriendly: rideSettings.petFriendly,
    luggageAssistance: rideSettings.luggageAssistance,
    insulatedBag: rideSettings.insulatedBag,
  })
  const visibleBadges = badges.slice(0, MAX_VISIBLE_BADGES)
  const overflowCount = badges.length - visibleBadges.length

  const instantHint =
    rideSettings.pricePerKmEur.trim() || rideSettings.baseFareEur.trim()
      ? isEn
        ? `Instant ride: ${rideSettings.baseFareEur.trim() || '—'} € base · ${rideSettings.pricePerKmEur.trim() || '—'} €/km`
        : `Course à l’instant : ${rideSettings.baseFareEur.trim() || '—'} € prise en charge · ${rideSettings.pricePerKmEur.trim() || '—'} €/km`
      : null

  const websiteHref = normalizeExternalUrl(websiteUrl)
  const linkedinHref = normalizeExternalUrl(linkedinUrl)

  return (
    <aside className="chauffeur-about-summary-card" aria-label={isEn ? 'Public profile summary' : 'Résumé public'}>
      <section className="chauffeur-about-summary-card__section">
        <h3 className="chauffeur-about-summary-card__label">{isEn ? 'Rate' : 'Tarif'}</h3>
        <p className="chauffeur-about-summary-card__rate">{priceLabel}</p>
        {instantHint ? <p className="chauffeur-about-summary-card__rate-hint">{instantHint}</p> : null}
      </section>

      <section className="chauffeur-about-summary-card__section">
        <div className="chauffeur-about-summary-card__label-row">
          <h3 className="chauffeur-about-summary-card__label">
            {isEn ? 'Services' : 'Services'}
          </h3>
          <Info size={14} strokeWidth={2} aria-hidden />
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
          <p className="chauffeur-about-summary-card__empty">
            {isEn ? 'Enable offers in the Service tab.' : 'Activez vos offres dans l’onglet Service.'}
          </p>
        )}
      </section>

      <section className="chauffeur-about-summary-card__section">
        <h3 className="chauffeur-about-summary-card__label">{isEn ? 'Details' : 'Détails'}</h3>
        <div className="chauffeur-about-summary-card__details">
          <div className="chauffeur-about-summary-card__detail-row">
            <MapPin size={20} strokeWidth={2} className="chauffeur-about-summary-card__detail-icon" aria-hidden />
            <div className="chauffeur-about-summary-card__detail-body">
              <p className="chauffeur-about-summary-card__detail-text">
                {commune.trim() || (isEn ? 'Add your commune' : 'Ajoutez votre commune')}
              </p>
              <p className="chauffeur-about-summary-card__detail-muted">La Réunion</p>
            </div>
          </div>

          <div className="chauffeur-about-summary-card__detail-row">
            <Globe size={20} strokeWidth={2} className="chauffeur-about-summary-card__detail-icon" aria-hidden />
            <div className="chauffeur-about-summary-card__detail-body">
              {onWebsiteUrlChange ? (
                <input
                  type="url"
                  className="chauffeur-about-summary-card__link-input"
                  value={websiteUrl}
                  onChange={(e) => onWebsiteUrlChange(e.target.value)}
                  placeholder={isEn ? 'Add website' : 'Ajouter un site web'}
                  aria-label={isEn ? 'Website URL' : 'URL du site web'}
                />
              ) : websiteHref ? (
                <a
                  href={websiteHref}
                  className="chauffeur-about-summary-card__detail-text"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {websiteUrl.trim()}
                </a>
              ) : (
                <p className="chauffeur-about-summary-card__detail-muted">
                  {isEn ? 'No website' : 'Aucun site web'}
                </p>
              )}
            </div>
          </div>

          <div className="chauffeur-about-summary-card__detail-row">
            <Linkedin size={20} strokeWidth={2} className="chauffeur-about-summary-card__detail-icon" aria-hidden />
            <div className="chauffeur-about-summary-card__detail-body">
              {onLinkedinUrlChange ? (
                <input
                  type="url"
                  className="chauffeur-about-summary-card__link-input"
                  value={linkedinUrl}
                  onChange={(e) => onLinkedinUrlChange(e.target.value)}
                  placeholder={isEn ? 'Add LinkedIn profile' : 'Ajouter un profil LinkedIn'}
                  aria-label={isEn ? 'LinkedIn URL' : 'URL LinkedIn'}
                />
              ) : linkedinHref ? (
                <a
                  href={linkedinHref}
                  className="chauffeur-about-summary-card__detail-text"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  LinkedIn
                </a>
              ) : (
                <p className="chauffeur-about-summary-card__detail-muted">
                  {isEn ? 'No LinkedIn profile' : 'Aucun profil LinkedIn'}
                </p>
              )}
            </div>
          </div>

          {(websiteHref || linkedinHref) && !onWebsiteUrlChange ? (
            <div className="chauffeur-about-summary-card__external-links">
              {websiteHref ? (
                <a
                  href={websiteHref}
                  className="chauffeur-about-summary-card__external-link"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={isEn ? 'Open website' : 'Ouvrir le site web'}
                >
                  <Globe size={16} strokeWidth={2} aria-hidden />
                </a>
              ) : null}
              {linkedinHref ? (
                <a
                  href={linkedinHref}
                  className="chauffeur-about-summary-card__external-link"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={isEn ? 'Open LinkedIn profile' : 'Ouvrir le profil LinkedIn'}
                >
                  <Linkedin size={16} strokeWidth={2} aria-hidden />
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    </aside>
  )
}
