/**
 * Photos des cartes « lieux les plus demandés » : **Wikimedia Commons** (licences CC / domaine public),
 * pas Google Images (interdit / instable sans API Places dédiée).
 * Crédits : voir chaque page fichier sur commons.wikimedia.org ; respecter CC-BY-SA (mention auteur si redistribution commerciale).
 *
 * On utilise l’URL **fichier direct** (`/commons/x/xx/Fichier.jpg`), pas `/thumb/.../640px-...` :
 * le service miniatures renvoie souvent **429** (rate limit / IP), ce qui laisse les cartes vides en prod.
 */
const WM = 'https://upload.wikimedia.org/wikipedia/commons'

/**
 * Bandeau « style tableau » (ex. hub → RUN) : une ligne par élément, indicatif uniquement.
 */
export type FlightRouteBannerData = {
  /** Ex. "1." — repère visuel type fiche. */
  legIndex: string
  /** Compagnie (code IATA). */
  airlineCode: string
  /** Vol principal (ex. AF652). */
  primaryFlight: string
  /** Vol partenaire / codeshare (optionnel). */
  secondaryFlight?: string
  /** Appareil indicatif (ex. A350). */
  aircraft: string
  originCity: string
  originIata: string
  destCity: string
  destIata: string
  /** Texte complémentaire sous le bloc (durées, autres hubs). */
  footerFr?: string
  footerEn?: string
}

export type PopularDestination = {
  id: string
  titleFr: string
  titleEn: string
  /** Texte envoyé au géocodeur et dans la barre après clic */
  geocodeQuery: string
  imageSrc: string
  /** Bandeau sous la cover : heures de vol indicatives (non temps réel). */
  flightHoursFr: string
  flightHoursEn: string
  /**
   * Si défini : affichage type fiche (lignes empilées). Sinon repli sur {@link flightHoursFr} / {@link flightHoursEn}.
   */
  flightRouteBanner?: FlightRouteBannerData
}

/**
 * Lieux souvent demandés (La Réunion) — affichés à la place de la colonne « Application »
 * quand la recherche destination est ouverte.
 */
export const POPULAR_DESTINATIONS: PopularDestination[] = [
  {
    id: 'rgl',
    titleFr: 'Aéroport Roland-Garros',
    titleEn: 'Roland Garros Airport',
    geocodeQuery: 'Aéroport Roland-Garros, Sainte-Marie, La Réunion',
    imageSrc: `${WM}/6/61/RUN_airport.jpg`,
    flightHoursFr: 'Paris CDG / Orly → RUN · 10 h 45 – 11 h en direct (indicatif). Marseille → RUN · ~11 h 30.',
    flightHoursEn: 'Paris CDG / Orly → RUN · 10 h 45 – 11 h nonstop (indicative). Marseille → RUN · ~11 h 30.',
    flightRouteBanner: {
      legIndex: '2.',
      airlineCode: 'AF',
      primaryFlight: 'AF652',
      aircraft: 'A350',
      originCity: 'Paris',
      originIata: 'CDG',
      destCity: 'Saint-Denis',
      destIata: 'RUN',
      footerFr:
        'Durée indicative en direct ~10 h 45–11 h. Hub alternatif : Orly (ORY). Marseille (MRS) → RUN ~11 h 30.',
      footerEn:
        'Indicative nonstop ~10 h 45–11 h. Alternate hub: Orly (ORY). Marseille (MRS) → RUN ~11 h 30.',
    },
  },
  {
    id: 'chu-bellepierre',
    titleFr: 'CHU Bellepierre',
    titleEn: 'Bellepierre University Hospital (CHU)',
    geocodeQuery: 'CHU Bellepierre, Saint-Denis, La Réunion',
    imageSrc: `${WM}/9/92/SaintDenisReunion001.jpg`,
    flightHoursFr: 'Paris → La Réunion · ~11 h (vol direct) · puis ~15 min vers Bellepierre.',
    flightHoursEn: 'Paris → Réunion · ~11 h (direct) · then ~15 min to Bellepierre.',
  },
  {
    id: 'saint-denis-centre',
    titleFr: 'Centre-ville Saint-Denis',
    titleEn: 'Saint-Denis city centre',
    geocodeQuery: 'Préfecture, Saint-Denis, La Réunion',
    imageSrc: `${WM}/c/c7/Saint-Denis%2C_La_R%C3%A9union.jpg`,
    flightHoursFr: 'Paris → La Réunion · ~11 h (vol direct) · puis ~10 min centre-ville.',
    flightHoursEn: 'Paris → Réunion · ~11 h (direct) · then ~10 min to downtown.',
  },
  {
    id: 'saint-pierre',
    titleFr: 'Saint-Pierre — Terre-Sainte',
    titleEn: 'Saint-Pierre — Terre-Sainte',
    geocodeQuery: 'Terre-Sainte, Saint-Pierre, La Réunion',
    imageSrc: `${WM}/9/9b/ReU_StPierre_Hafen.jpg`,
    flightHoursFr: 'Paris → La Réunion · ~11 h (vol direct) · puis ~1 h vers le sud.',
    flightHoursEn: 'Paris → Réunion · ~11 h (direct) · then ~1 h to the south.',
  },
  {
    id: 'saint-gilles',
    titleFr: 'Saint-Gilles-les-Bains',
    titleEn: 'Saint-Gilles-les-Bains',
    geocodeQuery: 'Saint-Gilles-les-Bains, La Réunion',
    imageSrc: `${WM}/6/62/Saint-Gilles-les-Bains.jpg`,
    flightHoursFr: 'Paris → La Réunion · ~11 h (vol direct) · puis ~45 min côte ouest.',
    flightHoursEn: 'Paris → Réunion · ~11 h (direct) · then ~45 min to the west coast.',
  },
  {
    id: 'le-port',
    titleFr: 'Le Port — centre',
    titleEn: 'Le Port — downtown',
    geocodeQuery: 'Mairie du Port, Le Port, La Réunion',
    imageSrc: `${WM}/a/a4/La_Reunion_Le_Port_Combat_Coq_-_panoramio.jpg`,
    flightHoursFr: 'Paris → La Réunion · ~11 h (vol direct) · puis ~25 min vers Le Port.',
    flightHoursEn: 'Paris → Réunion · ~11 h (direct) · then ~25 min to Le Port.',
  },
  {
    id: 'saint-paul',
    titleFr: 'Saint-Paul — Cap La Houssaye',
    titleEn: 'Saint-Paul — Cap La Houssaye',
    geocodeQuery: 'Cap La Houssaye, Saint-Paul, La Réunion',
    imageSrc: `${WM}/a/a5/French_National_Day_Saint_Paul_Bay_Reunion_Island_%28220127003%29.jpeg`,
    flightHoursFr: 'Paris → La Réunion · ~11 h (vol direct) · puis ~35 min vers Saint-Paul.',
    flightHoursEn: 'Paris → Réunion · ~11 h (direct) · then ~35 min to Saint-Paul.',
  },
  {
    id: 'etang-sale',
    titleFr: 'Étang-Salé les Bains',
    titleEn: 'Étang-Salé beach',
    geocodeQuery: 'Étang-Salé les Bains, La Réunion',
    imageSrc: `${WM}/6/63/Traces_de_rite_hindou_%C3%A0_la_plage_%283850314185%29.jpg`,
    flightHoursFr: 'Paris → La Réunion · ~11 h (vol direct) · puis ~40 min vers l’Étang-Salé.',
    flightHoursEn: 'Paris → Réunion · ~11 h (direct) · then ~40 min to Étang-Salé.',
  },
]

/** Secteurs géographiques (La Réunion) — remplacent la colonne « Site web » en recherche active. */
export const SECTOR_DESTINATIONS: PopularDestination[] = [
  {
    id: 'secteur-nord',
    titleFr: 'Nord',
    titleEn: 'North',
    geocodeQuery: 'Saint-Denis, La Réunion',
    /** Vide : l’UI affiche une initiale (pas d’URL image). */
    imageSrc: '',
    flightHoursFr: 'Paris → La Réunion · ~11 h (vol direct) · arrivée Roland-Garros puis trajet nord.',
    flightHoursEn: 'Paris → Réunion · ~11 h (direct) · land at Roland Garros then head north.',
  },
  {
    id: 'secteur-est',
    titleFr: 'Est',
    titleEn: 'East',
    geocodeQuery: 'Saint-Benoît, La Réunion',
    imageSrc: '',
    flightHoursFr: 'Paris → La Réunion · ~11 h (vol direct) · arrivée Roland-Garros puis trajet est.',
    flightHoursEn: 'Paris → Réunion · ~11 h (direct) · land at Roland Garros then head east.',
  },
  {
    id: 'secteur-sud',
    titleFr: 'Sud',
    titleEn: 'South',
    geocodeQuery: 'Saint-Pierre, La Réunion',
    imageSrc: '',
    flightHoursFr: 'Paris → La Réunion · ~11 h (vol direct) · arrivée Roland-Garros puis trajet sud.',
    flightHoursEn: 'Paris → Réunion · ~11 h (direct) · land at Roland Garros then head south.',
  },
  {
    id: 'secteur-ouest',
    titleFr: 'Ouest',
    titleEn: 'West',
    geocodeQuery: 'Saint-Paul, La Réunion',
    imageSrc: '',
    flightHoursFr: 'Paris → La Réunion · ~11 h (vol direct) · arrivée Roland-Garros puis trajet ouest.',
    flightHoursEn: 'Paris → Réunion · ~11 h (direct) · land at Roland Garros then head west.',
  },
  {
    id: 'secteur-hauts',
    titleFr: 'Les Hauts',
    titleEn: 'The Highlands (Cirques)',
    geocodeQuery: 'Cilaos, La Réunion',
    imageSrc: '',
    flightHoursFr: 'Paris → La Réunion · ~11 h (vol direct) · arrivée Roland-Garros puis trajet vers les Hauts.',
    flightHoursEn: 'Paris → Réunion · ~11 h (direct) · land at Roland Garros then up to the highlands.',
  },
]

/** Tous les lieux / secteurs exposés en deep link `/lieu/:id` (spotlight). */
export const ALL_SPOTLIGHT_DESTINATIONS: PopularDestination[] = [
  ...POPULAR_DESTINATIONS,
  ...SECTOR_DESTINATIONS,
]

export function getDestinationById(id: string): PopularDestination | undefined {
  return ALL_SPOTLIGHT_DESTINATIONS.find((d) => d.id === id)
}

export function filterPopularDestinations(
  list: PopularDestination[],
  searchTerm: string,
  language: 'fr' | 'en'
): PopularDestination[] {
  const q = searchTerm.trim().toLowerCase()
  if (!q) return list
  return list.filter((d) => {
    const title = (language === 'en' ? d.titleEn : d.titleFr).toLowerCase()
    return title.includes(q) || d.geocodeQuery.toLowerCase().includes(q) || d.id.includes(q)
  })
}
