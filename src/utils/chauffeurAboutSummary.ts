import {
  CHAUFFEUR_SERVICE_CATALOG_CATEGORIES,
  type ChauffeurServiceCatalogCategoryKey,
  type ChauffeurServiceCatalogSnapshot,
  type ChauffeurServicePriceLine,
} from '../constants/chauffeurServiceCatalog'

export type ChauffeurCatalogPriceSummary = {
  minEur: number | null
  maxEur: number | null
  hasQuoteOffers: boolean
}

export type ChauffeurCategoryRateLine = {
  id: ChauffeurServiceCatalogCategoryKey
  categoryLabel: string
  /** Libellé complet (accessibilité). */
  priceLabel: string
  /** Prix affiché sans le suffixe « sur devis ». */
  priceText: string
  /** Certaines offres de la catégorie sont sur devis. */
  hasQuoteAddon: boolean
}

function formatEur(value: number, language: 'fr' | 'en'): string {
  return new Intl.NumberFormat(language === 'en' ? 'en-GB' : 'fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatCategoryRateDisplay(
  summary: ChauffeurCatalogPriceSummary,
  language: 'fr' | 'en'
): Pick<ChauffeurCategoryRateLine, 'priceLabel' | 'priceText' | 'hasQuoteAddon'> {
  const isEn = language === 'en'
  const { minEur, maxEur, hasQuoteOffers } = summary

  if (minEur == null && maxEur == null) {
    if (hasQuoteOffers) {
      const quote = isEn ? 'On quote' : 'Sur devis'
      return { priceText: quote, hasQuoteAddon: false, priceLabel: quote }
    }
    return { priceText: '—', hasQuoteAddon: false, priceLabel: '—' }
  }

  let priceText = ''
  if (minEur != null && maxEur != null && minEur !== maxEur) {
    priceText = `${formatEur(minEur, language)} – ${formatEur(maxEur, language)}`
  } else {
    priceText = formatEur(minEur ?? maxEur ?? 0, language)
  }

  const quoteSuffix = isEn ? ' · on quote' : ' · sur devis'
  const priceLabel = hasQuoteOffers ? `${priceText}${quoteSuffix}` : priceText

  return { priceText, hasQuoteAddon: hasQuoteOffers, priceLabel }
}

function parseEurAmount(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.')
  if (!normalized) return null
  const value = Number.parseFloat(normalized)
  return Number.isFinite(value) ? value : null
}

function summarizeLinesPriceRange(lines: ChauffeurServicePriceLine[]): ChauffeurCatalogPriceSummary {
  let minEur: number | null = null
  let maxEur: number | null = null
  let hasQuoteOffers = false

  for (const line of lines) {
    if (!line.enabled) continue
    if (line.pricingMode === 'quote') {
      hasQuoteOffers = true
      continue
    }
    const min = parseEurAmount(line.minEur)
    const max = parseEurAmount(line.maxEur)
    if (min != null) minEur = minEur == null ? min : Math.min(minEur, min)
    if (max != null) maxEur = maxEur == null ? max : Math.max(maxEur, max)
    if (min != null && max == null) maxEur = maxEur == null ? min : Math.max(maxEur, min)
    if (max != null && min == null) minEur = minEur == null ? max : Math.min(minEur, max)
  }

  return { minEur, maxEur, hasQuoteOffers }
}

export function summarizeChauffeurCatalogPrices(
  catalog: ChauffeurServiceCatalogSnapshot
): ChauffeurCatalogPriceSummary {
  const enabled = CHAUFFEUR_SERVICE_CATALOG_CATEGORIES.flatMap(({ key }) => catalog[key])
  return summarizeLinesPriceRange(enabled)
}

export function formatChauffeurCatalogPriceRange(
  summary: ChauffeurCatalogPriceSummary,
  language: 'fr' | 'en'
): string {
  return formatCategoryRateDisplay(summary, language).priceLabel
}

/** Tarifs affichés par catégorie — alignés sur la grille Service (tarifs). */
export function buildChauffeurCatalogCategoryRates(
  catalog: ChauffeurServiceCatalogSnapshot,
  language: 'fr' | 'en'
): ChauffeurCategoryRateLine[] {
  const isEn = language === 'en'

  return CHAUFFEUR_SERVICE_CATALOG_CATEGORIES.flatMap((category) => {
    const lines = catalog[category.key]
    const hasEnabled = lines.some((line) => line.enabled)
    if (!hasEnabled) return []

    const summary = summarizeLinesPriceRange(lines)
    const display = formatCategoryRateDisplay(summary, language)
    if (display.priceLabel === '—') return []

    return [
      {
        id: category.key,
        categoryLabel: isEn ? category.titleEn : category.titleFr,
        ...display,
      },
    ]
  })
}

export type ChauffeurServiceBadge = {
  id: string
  label: string
}

export function buildChauffeurServiceBadges(
  catalog: ChauffeurServiceCatalogSnapshot,
  language: 'fr' | 'en',
  extras?: {
    petFriendly?: boolean
    luggageAssistance?: boolean
    insulatedBag?: boolean
  }
): ChauffeurServiceBadge[] {
  const isEn = language === 'en'
  const badges: ChauffeurServiceBadge[] = []

  for (const category of CHAUFFEUR_SERVICE_CATALOG_CATEGORIES) {
    const hasEnabled = catalog[category.key].some((line) => line.enabled)
    if (hasEnabled) {
      badges.push({
        id: category.key,
        label: isEn ? category.titleEn : category.titleFr,
      })
    }
  }

  if (catalog.supplements.babySeatIncluded) {
    badges.push({
      id: 'baby-seat',
      label: isEn ? 'Baby seat' : 'Siège bébé',
    })
  }
  if (extras?.petFriendly) {
    badges.push({ id: 'pet', label: isEn ? 'Pet friendly' : 'Animaux acceptés' })
  }
  if (extras?.luggageAssistance) {
    badges.push({ id: 'luggage', label: isEn ? 'Luggage help' : 'Aide bagages' })
  }
  if (extras?.insulatedBag) {
    badges.push({ id: 'insulated', label: isEn ? 'Insulated bag' : 'Sac isotherme' })
  }

  return badges
}

export function normalizeExternalUrl(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}
