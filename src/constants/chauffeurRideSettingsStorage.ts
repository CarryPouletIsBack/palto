import {
  areChauffeurServiceCatalogsEqual,
  DEFAULT_CHAUFFEUR_SERVICE_CATALOG,
  normalizeChauffeurServiceCatalog,
  type ChauffeurServiceCatalogSnapshot,
} from './chauffeurServiceCatalog'

export interface ChauffeurRideSettingsSnapshot {
  baseFareEur: string;
  pricePerKmEur: string;
  nightSurchargePercent: string;
  /** Majoration linéaire pour le dénivelé estimé (EUR pour 100 m de dénivelé). */
  elevationSurchargeEurPer100m: string;
  pricingMultiplierPercent: number;
  maxPickupKm: string;
  petFriendly: boolean;
  luggageAssistance: boolean;
  insulatedBag: boolean;
  /** Grille d’offres (courses, MAD, SAM, aéroport, mariages). */
  serviceCatalog: ChauffeurServiceCatalogSnapshot;
}

export const CHAUFFEUR_RIDE_SETTINGS_KEY = 'palto.chauffeur.ride-settings.v1';

export const DEFAULT_CHAUFFEUR_RIDE_SETTINGS: ChauffeurRideSettingsSnapshot = {
  baseFareEur: '2,20',
  pricePerKmEur: '1,40',
  nightSurchargePercent: '18',
  elevationSurchargeEurPer100m: '1,50',
  pricingMultiplierPercent: 100,
  maxPickupKm: '15',
  petFriendly: true,
  luggageAssistance: true,
  insulatedBag: true,
  serviceCatalog: DEFAULT_CHAUFFEUR_SERVICE_CATALOG,
};

export function loadChauffeurRideSettingsSnapshot(): ChauffeurRideSettingsSnapshot {
  if (typeof window === 'undefined') return DEFAULT_CHAUFFEUR_RIDE_SETTINGS;
  try {
    const raw = window.localStorage.getItem(CHAUFFEUR_RIDE_SETTINGS_KEY);
    if (!raw) return DEFAULT_CHAUFFEUR_RIDE_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<ChauffeurRideSettingsSnapshot>;
    return {
      baseFareEur: typeof parsed.baseFareEur === 'string' ? parsed.baseFareEur : DEFAULT_CHAUFFEUR_RIDE_SETTINGS.baseFareEur,
      pricePerKmEur: typeof parsed.pricePerKmEur === 'string' ? parsed.pricePerKmEur : DEFAULT_CHAUFFEUR_RIDE_SETTINGS.pricePerKmEur,
      nightSurchargePercent:
        typeof parsed.nightSurchargePercent === 'string'
          ? parsed.nightSurchargePercent
          : DEFAULT_CHAUFFEUR_RIDE_SETTINGS.nightSurchargePercent,
      elevationSurchargeEurPer100m:
        typeof parsed.elevationSurchargeEurPer100m === 'string'
          ? parsed.elevationSurchargeEurPer100m
          : DEFAULT_CHAUFFEUR_RIDE_SETTINGS.elevationSurchargeEurPer100m,
      pricingMultiplierPercent:
        typeof parsed.pricingMultiplierPercent === 'number'
          ? parsed.pricingMultiplierPercent
          : DEFAULT_CHAUFFEUR_RIDE_SETTINGS.pricingMultiplierPercent,
      maxPickupKm: typeof parsed.maxPickupKm === 'string' ? parsed.maxPickupKm : DEFAULT_CHAUFFEUR_RIDE_SETTINGS.maxPickupKm,
      petFriendly:
        typeof parsed.petFriendly === 'boolean' ? parsed.petFriendly : DEFAULT_CHAUFFEUR_RIDE_SETTINGS.petFriendly,
      luggageAssistance:
        typeof parsed.luggageAssistance === 'boolean'
          ? parsed.luggageAssistance
          : DEFAULT_CHAUFFEUR_RIDE_SETTINGS.luggageAssistance,
      insulatedBag:
        typeof parsed.insulatedBag === 'boolean' ? parsed.insulatedBag : DEFAULT_CHAUFFEUR_RIDE_SETTINGS.insulatedBag,
      serviceCatalog: normalizeChauffeurServiceCatalog(parsed.serviceCatalog),
    };
  } catch {
    return DEFAULT_CHAUFFEUR_RIDE_SETTINGS;
  }
}

export function areChauffeurRideSettingsEqual(
  a: ChauffeurRideSettingsSnapshot,
  b: ChauffeurRideSettingsSnapshot
): boolean {
  return (
    a.baseFareEur === b.baseFareEur &&
    a.pricePerKmEur === b.pricePerKmEur &&
    a.nightSurchargePercent === b.nightSurchargePercent &&
    a.elevationSurchargeEurPer100m === b.elevationSurchargeEurPer100m &&
    a.pricingMultiplierPercent === b.pricingMultiplierPercent &&
    a.maxPickupKm === b.maxPickupKm &&
    a.petFriendly === b.petFriendly &&
    a.luggageAssistance === b.luggageAssistance &&
    a.insulatedBag === b.insulatedBag &&
    areChauffeurServiceCatalogsEqual(a.serviceCatalog, b.serviceCatalog)
  );
}

export function saveChauffeurRideSettingsSnapshot(snapshot: ChauffeurRideSettingsSnapshot): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CHAUFFEUR_RIDE_SETTINGS_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore quota/private mode errors.
  }
}
