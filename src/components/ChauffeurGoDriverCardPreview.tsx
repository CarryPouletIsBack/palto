import { useMemo } from 'react';
import type { ChauffeurProfileRidePricingFields } from '../constants/chauffeurProfileStorage';
import type { Language } from '../contexts/LanguageContext';
import { PLACEHOLDER_VEHICLE } from '../constants/imagePlaceholders';
import type { NearbyDriver } from '../data/nearbyDrivers';
import { estimateChauffeurFareTtc, formatFareEurDisplay } from '../lib/chauffeurFareEstimate';
import { formatDriverMetaLine } from '../lib/formatDriverMetaLine';
import './ChauffeurGoDriverCardPreview.css';

const PREVIEW_ROUTE_KM = 5;
const PREVIEW_SAMPLE_DISTANCE = '3,2 km · ~9 min';

type Props = {
  language: Language;
  prenom: string;
  nom: string;
  vehicleLabel: string;
  petFriendly: boolean;
  luggageAssistance: boolean;
  insulatedBag: boolean;
  ridePricing?: ChauffeurProfileRidePricingFields | null;
};

export default function ChauffeurGoDriverCardPreview({
  language,
  prenom,
  nom,
  vehicleLabel,
  petFriendly,
  luggageAssistance,
  insulatedBag,
  ridePricing,
}: Props) {
  const isEn = language === 'en';

  const driverFirstName = useMemo(() => {
    const full = `${prenom} ${nom}`.trim();
    if (!full) return isEn ? 'Driver' : 'Chauffeur';
    return full.split(/\s+/)[0] ?? full;
  }, [isEn, nom, prenom]);

  const previewDriver: NearbyDriver = useMemo(
    () => ({
      id: 'preview',
      name: `${prenom} ${nom}`.trim() || (isEn ? 'Driver' : 'Chauffeur'),
      moto: vehicleLabel,
      distance: PREVIEW_SAMPLE_DISTANCE,
      price: '',
      longitude: 55.45,
      latitude: -21.12,
      petFriendly,
      luggageAssistance,
      insulatedBag,
      ridePricing: ridePricing ?? undefined,
    }),
    [insulatedBag, isEn, luggageAssistance, nom, petFriendly, prenom, ridePricing, vehicleLabel]
  );

  const meta = formatDriverMetaLine(previewDriver, null);
  const priceTtc = estimateChauffeurFareTtc({
    ridePricing,
    routeKm: PREVIEW_ROUTE_KM,
    vehicleLabel,
  });

  return (
    <div className="chauffeur-go-driver-card-preview">
      <p className="chauffeur-go-driver-card-preview__lead">
        {isEn ? 'Preview on Go page' : 'Aperçu sur la page Go'}
      </p>
      <div
        className="chauffeur-go-driver-card-preview__card"
        role="img"
        aria-label={
          isEn
            ? `Driver card preview: ${driverFirstName}, ${meta}`
            : `Aperçu carte chauffeur : ${driverFirstName}, ${meta}`
        }
      >
        <div className="chauffeur-go-driver-card-preview__item">
          <div className="chauffeur-go-driver-card-preview__vehicle" aria-hidden>
            <img
              className="chauffeur-go-driver-card-preview__vehicle-img"
              src={PLACEHOLDER_VEHICLE}
              alt=""
              decoding="async"
            />
          </div>
          <span className="chauffeur-go-driver-card-preview__body">
            <span className="chauffeur-go-driver-card-preview__name">{driverFirstName}</span>
            <span className="chauffeur-go-driver-card-preview__meta">{meta}</span>
          </span>
          <span className="chauffeur-go-driver-card-preview__price">
            {priceTtc != null ? formatFareEurDisplay(priceTtc) : '—'}
          </span>
        </div>
      </div>
      <p className="chauffeur-go-driver-card-preview__hint">
        {isEn
          ? 'Sample distance and indicative price for a ~5 km ride.'
          : 'Distance et prix indicatifs pour une course d’environ 5 km.'}
      </p>
    </div>
  );
}
