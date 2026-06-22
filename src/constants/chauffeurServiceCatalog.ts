/** Ligne tarifaire d’une offre de service (fourchette ou sur devis). */
export type ChauffeurServicePriceLine = {
  id: string
  labelFr: string
  labelEn: string
  minEur: string
  maxEur: string
  pricingMode: 'range' | 'quote'
  enabled: boolean
}

export type ChauffeurServiceCatalogSupplements = {
  nightWeekendHolidayPercent: string
  bulkyLuggageEur: string
  babySeatIncluded: boolean
}

/** Grille d’offres affichée aux clients (courses, MAD, SAM, aéroport, mariages). */
export type ChauffeurServiceCatalogSnapshot = {
  dayTrips: ChauffeurServicePriceLine[]
  hourlyDisposal: ChauffeurServicePriceLine[]
  eveningSam: ChauffeurServicePriceLine[]
  airportTransfers: ChauffeurServicePriceLine[]
  weddingPackages: ChauffeurServicePriceLine[]
  supplements: ChauffeurServiceCatalogSupplements
}

function line(
  id: string,
  labelFr: string,
  labelEn: string,
  minEur: string,
  maxEur: string,
  pricingMode: 'range' | 'quote' = 'range',
  enabled = true
): ChauffeurServicePriceLine {
  return { id, labelFr, labelEn, minEur, maxEur, pricingMode, enabled }
}

/** Référence marché VTC Réunion (fourchettes type Instagram / grilles locales). */
export const DEFAULT_CHAUFFEUR_SERVICE_CATALOG: ChauffeurServiceCatalogSnapshot = {
  dayTrips: [
    line('day-0-5', '0 – 5 km', '0 – 5 km', '15', '20'),
    line('day-5-10', '5 – 10 km', '5 – 10 km', '20', '25'),
    line('day-10-20', '10 – 20 km', '10 – 20 km', '25', '45'),
    line('day-20-40', '20 – 40 km', '20 – 40 km', '45', '90'),
    line('day-40-plus', '+ 40 km', '+ 40 km', '', '', 'quote'),
  ],
  hourlyDisposal: [
    line('mad-1h', '1 heure', '1 hour', '120', '120'),
    line('mad-2h', '2 heures', '2 hours', '210', '210'),
    line('mad-4h', '4 heures', '4 hours', '310', '400'),
    line('mad-6h', '6 heures', '6 hours', '510', '600'),
    line('mad-8h', '8 heures', '8 hours', '710', '800'),
    line('mad-10h', '10 heures', '10 hours', '910', '1000'),
  ],
  eveningSam: [
    line('sam-st-denis', 'Saint-Denis ↔ Saint-Gilles (A/R)', 'Saint-Denis ↔ Saint-Gilles (round trip)', '70', '70'),
    line('sam-st-marie', 'Sainte-Marie ↔ Saint-Gilles (A/R)', 'Sainte-Marie ↔ Saint-Gilles (round trip)', '80', '80'),
    line('sam-st-gilles', 'Saint-Gilles ↔ Saint-Gilles', 'Saint-Gilles ↔ Saint-Gilles', '30', '30'),
    line('sam-le-port', 'Le Port ↔ Saint-Gilles (A/R)', 'Le Port ↔ Saint-Gilles (round trip)', '60', '60'),
    line('sam-st-paul', 'Saint-Paul ↔ Saint-Gilles (A/R)', 'Saint-Paul ↔ Saint-Gilles (round trip)', '40', '40'),
    line('sam-st-leu', 'Saint-Leu ↔ Saint-Gilles (A/R)', 'Saint-Leu ↔ Saint-Gilles (round trip)', '50', '50'),
  ],
  airportTransfers: [
    line('arg-st-denis', 'Aéroport → Saint-Denis / Sainte-Marie', 'Airport → Saint-Denis / Sainte-Marie', '30', '40'),
    line('arg-st-paul', 'Aéroport → Saint-Paul / Saint-Gilles', 'Airport → Saint-Paul / Saint-Gilles', '70', '90'),
    line('arg-st-leu', 'Aéroport → Saint-Leu', 'Airport → Saint-Leu', '90', '110'),
    line('arg-st-pierre', 'Aéroport → Saint-Pierre / Tampon / Plaine', 'Airport → Saint-Pierre / Tampon / Plaine', '110', '150'),
    line('arg-st-andre', 'Aéroport → Saint-André', 'Airport → Saint-André', '60', '80'),
    line('arg-st-benoit', 'Aéroport → Saint-Benoît', 'Airport → Saint-Benoît', '80', '100'),
    line('arg-ste-anne', 'Aéroport → Sainte-Anne', 'Airport → Sainte-Anne', '100', '120'),
  ],
  weddingPackages: [
    line('wed-essential', 'Formule Essentiel (2–3 h)', 'Essential package (2–3 h)', '250', '350'),
    line('wed-prestige', 'Formule Prestige (4–6 h)', 'Prestige package (4–6 h)', '400', '600'),
    line('wed-luxe', 'Formule Luxe (journée)', 'Luxury package (full day)', '', '', 'quote'),
  ],
  supplements: {
    nightWeekendHolidayPercent: '20',
    bulkyLuggageEur: '10',
    babySeatIncluded: true,
  },
}

export type ChauffeurServiceCatalogCategoryKey =
  | 'dayTrips'
  | 'hourlyDisposal'
  | 'eveningSam'
  | 'airportTransfers'
  | 'weddingPackages'

export const CHAUFFEUR_SERVICE_CATALOG_CATEGORIES: {
  key: ChauffeurServiceCatalogCategoryKey
  titleFr: string
  titleEn: string
  hintFr?: string
  hintEn?: string
}[] = [
  {
    key: 'dayTrips',
    titleFr: 'Courses de jour',
    titleEn: 'Day trips',
    hintFr: 'Fourchettes selon la distance parcourue.',
    hintEn: 'Price bands by trip distance.',
  },
  {
    key: 'hourlyDisposal',
    titleFr: 'Mise à disposition',
    titleEn: 'Chauffeur at disposal',
    hintFr: 'Forfaits horaires (MAD).',
    hintEn: 'Hourly packages.',
  },
  {
    key: 'eveningSam',
    titleFr: 'SAM de vos soirées',
    titleEn: 'Designated driver (evenings)',
    hintFr: 'Retours A/R vers les zones balnéaires.',
    hintEn: 'Round trips to coastal areas.',
  },
  {
    key: 'airportTransfers',
    titleFr: 'Transferts aéroport',
    titleEn: 'Airport transfers',
    hintFr: 'Depuis Roland-Garros (Sainte-Marie).',
    hintEn: 'From Roland-Garros airport.',
  },
  {
    key: 'weddingPackages',
    titleFr: 'Forfaits mariages',
    titleEn: 'Wedding packages',
    hintFr: 'Décoration souvent incluse dans l’offre premium.',
    hintEn: 'Decoration often included in premium offers.',
  },
]

function normalizeLine(raw: unknown, fallback: ChauffeurServicePriceLine): ChauffeurServicePriceLine {
  if (!raw || typeof raw !== 'object') return fallback
  const r = raw as Partial<ChauffeurServicePriceLine>
  return {
    id: typeof r.id === 'string' ? r.id : fallback.id,
    labelFr: typeof r.labelFr === 'string' ? r.labelFr : fallback.labelFr,
    labelEn: typeof r.labelEn === 'string' ? r.labelEn : fallback.labelEn,
    minEur: typeof r.minEur === 'string' ? r.minEur : fallback.minEur,
    maxEur: typeof r.maxEur === 'string' ? r.maxEur : fallback.maxEur,
    pricingMode: r.pricingMode === 'quote' ? 'quote' : 'range',
    enabled: typeof r.enabled === 'boolean' ? r.enabled : fallback.enabled,
  }
}

function normalizeLines(
  raw: unknown,
  defaults: ChauffeurServicePriceLine[]
): ChauffeurServicePriceLine[] {
  if (!Array.isArray(raw)) return defaults
  return defaults.map((fallback, index) => normalizeLine(raw[index], fallback))
}

export function normalizeChauffeurServiceCatalog(
  raw: unknown
): ChauffeurServiceCatalogSnapshot {
  const defaults = DEFAULT_CHAUFFEUR_SERVICE_CATALOG
  if (!raw || typeof raw !== 'object') return defaults
  const r = raw as Partial<ChauffeurServiceCatalogSnapshot>
  const supplementsRaw = r.supplements
  return {
    dayTrips: normalizeLines(r.dayTrips, defaults.dayTrips),
    hourlyDisposal: normalizeLines(r.hourlyDisposal, defaults.hourlyDisposal),
    eveningSam: normalizeLines(r.eveningSam, defaults.eveningSam),
    airportTransfers: normalizeLines(r.airportTransfers, defaults.airportTransfers),
    weddingPackages: normalizeLines(r.weddingPackages, defaults.weddingPackages),
    supplements: {
      nightWeekendHolidayPercent:
        typeof supplementsRaw?.nightWeekendHolidayPercent === 'string'
          ? supplementsRaw.nightWeekendHolidayPercent
          : defaults.supplements.nightWeekendHolidayPercent,
      bulkyLuggageEur:
        typeof supplementsRaw?.bulkyLuggageEur === 'string'
          ? supplementsRaw.bulkyLuggageEur
          : defaults.supplements.bulkyLuggageEur,
      babySeatIncluded:
        typeof supplementsRaw?.babySeatIncluded === 'boolean'
          ? supplementsRaw.babySeatIncluded
          : defaults.supplements.babySeatIncluded,
    },
  }
}

export function areChauffeurServiceCatalogsEqual(
  a: ChauffeurServiceCatalogSnapshot,
  b: ChauffeurServiceCatalogSnapshot
): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}
