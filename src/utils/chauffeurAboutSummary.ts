import {
  CHAUFFEUR_SERVICE_CATALOG_CATEGORIES,
  type ChauffeurServiceCatalogSnapshot,
  type ChauffeurServicePriceLine,
} from '../constants/chauffeurServiceCatalog'

export type ChauffeurCatalogPriceSummary = {
  minEur: number | null
  maxEur: number | null
  hasQuoteOffers: boolean
}

function parseEurAmount(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.')
  if (!normalized) return null
  const value = Number.parseFloat(normalized)
  return Number.isFinite(value) ? value : null
}

function collectEnabledLines(catalog: ChauffeurServiceCatalogSnapshot): ChauffeurServicePriceLine[] {
  return CHAUFFEUR_SERVICE_CATALOG_CATEGORIES.flatMap(({ key }) => catalog[key]).filter((line) => line.enabled)
}

export function summarizeChauffeurCatalogPrices(
  catalog: ChauffeurServiceCatalogSnapshot
): ChauffeurCatalogPriceSummary {
  const enabled = collectEnabledLines(catalog)
  let minEur: number | null = null
  let maxEur: number | null = null
  let hasQuoteOffers = false

  for (const line of enabled) {
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

export function formatChauffeurCatalogPriceRange(
  summary: ChauffeurCatalogPriceSummary,
  language: 'fr' | 'en'
): string {
  const isEn = language === 'en'
  const { minEur, maxEur, hasQuoteOffers } = summary

  if (minEur == null && maxEur == null) {
    if (hasQuoteOffers) return isEn ? 'On quote' : 'Sur devis'
    return '—'
  }

  const fmt = (value: number) =>
    new Intl.NumberFormat(isEn ? 'en-GB' : 'fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value)

  let range = ''
  if (minEur != null && maxEur != null && minEur !== maxEur) {
    range = `${fmt(minEur)} – ${fmt(maxEur)}`
  } else {
    range = fmt(minEur ?? maxEur ?? 0)
  }

  if (hasQuoteOffers) {
    range += isEn ? ' · on quote' : ' · sur devis'
  }

  return range
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
