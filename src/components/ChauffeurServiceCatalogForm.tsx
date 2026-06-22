import type { ChangeEvent } from 'react'
import type { Language } from '../contexts/LanguageContext'
import {
  CHAUFFEUR_SERVICE_CATALOG_CATEGORIES,
  type ChauffeurServiceCatalogCategoryKey,
  type ChauffeurServiceCatalogSnapshot,
  type ChauffeurServicePriceLine,
} from '../constants/chauffeurServiceCatalog'
import { readFormControlValue } from '../utils/readFormControlValue'
import './ChauffeurServiceCatalogForm.css'

type Props = {
  language: Language
  catalog: ChauffeurServiceCatalogSnapshot
  onChange: (next: ChauffeurServiceCatalogSnapshot) => void
}

function patchLine(
  lines: ChauffeurServicePriceLine[],
  lineId: string,
  patch: Partial<ChauffeurServicePriceLine>
): ChauffeurServicePriceLine[] {
  return lines.map((line) => (line.id === lineId ? { ...line, ...patch } : line))
}

function patchCategory(
  catalog: ChauffeurServiceCatalogSnapshot,
  category: ChauffeurServiceCatalogCategoryKey,
  lines: ChauffeurServicePriceLine[]
): ChauffeurServiceCatalogSnapshot {
  return { ...catalog, [category]: lines }
}

function formatPriceDisplay(line: ChauffeurServicePriceLine, isEn: boolean): string {
  if (line.pricingMode === 'quote') {
    return isEn ? 'On quote' : 'Sur devis'
  }
  if (line.minEur === line.maxEur && line.minEur.trim()) {
    return `${line.minEur} €`
  }
  if (line.minEur.trim() && line.maxEur.trim()) {
    return `${line.minEur} – ${line.maxEur} €`
  }
  return '—'
}

export default function ChauffeurServiceCatalogForm({ language, catalog, onChange }: Props) {
  const isEn = language === 'en'

  const updateLine = (
    category: ChauffeurServiceCatalogCategoryKey,
    lineId: string,
    patch: Partial<ChauffeurServicePriceLine>
  ) => {
    const lines = catalog[category]
    onChange(patchCategory(catalog, category, patchLine(lines, lineId, patch)))
  }

  return (
    <article className="dashboard-panel chauffeur-service-catalog">
      <div className="dashboard-section-title dashboard-section-title-inline">
        <h3>{isEn ? 'Service price list' : 'Grille de services'}</h3>
        <span>{isEn ? 'Your offers' : 'Vos offres'}</span>
      </div>
      <p className="dashboard-field-hint chauffeur-service-catalog__lead">
        {isEn
          ? 'Inspired by typical Réunion VTC grids (day trips, hourly hire, evenings, airport, weddings). Adjust to match your offer — passengers see this on your profile.'
          : 'Inspirée des grilles VTC courantes à La Réunion (courses, mise à disposition, SAM, aéroport, mariages). Ajustez selon votre offre — visible sur votre profil.'}
      </p>

      {CHAUFFEUR_SERVICE_CATALOG_CATEGORIES.map((category) => {
        const lines = catalog[category.key]
        return (
          <section key={category.key} className="chauffeur-service-catalog__category">
            <div className="chauffeur-service-catalog__category-head">
              <h4>{isEn ? category.titleEn : category.titleFr}</h4>
              {category.hintFr ? (
                <p className="dashboard-field-hint">
                  {isEn ? category.hintEn : category.hintFr}
                </p>
              ) : null}
            </div>
            <div className="chauffeur-service-catalog__table" role="table">
              <div className="chauffeur-service-catalog__row chauffeur-service-catalog__row--head" role="row">
                <span role="columnheader">{isEn ? 'Offer' : 'Offre'}</span>
                <span role="columnheader">{isEn ? 'Min (€)' : 'Min (€)'}</span>
                <span role="columnheader">{isEn ? 'Max (€)' : 'Max (€)'}</span>
                <span role="columnheader">{isEn ? 'Active' : 'Actif'}</span>
              </div>
              {lines.map((line) => (
                <div
                  key={line.id}
                  className={`chauffeur-service-catalog__row${line.enabled ? '' : ' is-disabled'}`}
                  role="row"
                >
                  <span className="chauffeur-service-catalog__label" role="cell">
                    {isEn ? line.labelEn : line.labelFr}
                    <small>{formatPriceDisplay(line, isEn)}</small>
                  </span>
                  <label className="chauffeur-service-catalog__price-cell" role="cell">
                    <span className="chauffeur-service-catalog__sr-only">
                      {isEn ? 'Minimum price' : 'Prix minimum'}
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      disabled={line.pricingMode === 'quote' || !line.enabled}
                      value={line.minEur}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        updateLine(category.key, line.id, { minEur: readFormControlValue(e) })
                      }
                      placeholder={line.pricingMode === 'quote' ? '—' : '0'}
                    />
                  </label>
                  <label className="chauffeur-service-catalog__price-cell" role="cell">
                    <span className="chauffeur-service-catalog__sr-only">
                      {isEn ? 'Maximum price' : 'Prix maximum'}
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      disabled={line.pricingMode === 'quote' || !line.enabled}
                      value={line.maxEur}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        updateLine(category.key, line.id, { maxEur: readFormControlValue(e) })
                      }
                      placeholder={line.pricingMode === 'quote' ? '—' : '0'}
                    />
                  </label>
                  <label className="chauffeur-service-catalog__toggle-cell" role="cell">
                    <input
                      className="dashboard-ride-setting-switch"
                      type="checkbox"
                      checked={line.enabled}
                      onChange={(e) =>
                        updateLine(category.key, line.id, { enabled: e.target.checked })
                      }
                      aria-label={
                        isEn
                          ? `Enable ${line.labelEn}`
                          : `Activer ${line.labelFr}`
                      }
                    />
                  </label>
                </div>
              ))}
            </div>
          </section>
        )
      })}

      <section className="chauffeur-service-catalog__category chauffeur-service-catalog__supplements">
        <div className="chauffeur-service-catalog__category-head">
          <h4>{isEn ? 'Surcharges' : 'Suppléments'}</h4>
        </div>
        <div className="dashboard-payment-edit-grid chauffeur-service-catalog__supplements-grid">
          <label>
            {isEn ? 'Night / weekend / public holiday (%)' : 'Nuit / week-end / jour férié (%)'}
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={catalog.supplements.nightWeekendHolidayPercent}
              onChange={(e) =>
                onChange({
                  ...catalog,
                  supplements: {
                    ...catalog.supplements,
                    nightWeekendHolidayPercent: readFormControlValue(e),
                  },
                })
              }
              placeholder="20"
            />
          </label>
          <label>
            {isEn ? 'Bulky luggage (EUR)' : 'Bagage encombrant (EUR)'}
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={catalog.supplements.bulkyLuggageEur}
              onChange={(e) =>
                onChange({
                  ...catalog,
                  supplements: {
                    ...catalog.supplements,
                    bulkyLuggageEur: readFormControlValue(e),
                  },
                })
              }
              placeholder="10"
            />
          </label>
        </div>
        <label className="dashboard-ride-setting-toggle-row chauffeur-service-catalog__baby-seat">
          <span>{isEn ? 'Baby seat included' : 'Siège bébé offert'}</span>
          <input
            className="dashboard-ride-setting-switch"
            type="checkbox"
            checked={catalog.supplements.babySeatIncluded}
            onChange={(e) =>
              onChange({
                ...catalog,
                supplements: {
                  ...catalog.supplements,
                  babySeatIncluded: e.target.checked,
                },
              })
            }
          />
        </label>
      </section>
    </article>
  )
}
