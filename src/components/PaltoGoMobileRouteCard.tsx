import type { FC, KeyboardEvent, FocusEvent } from 'react';
import { ArrowUpDown, MapPin, MoreHorizontal } from 'lucide-react';
import type { GeocodeSuggestion } from '../services/addressGeocoding';

export type PaltoGoStaticSuggestion = {
  id: string;
  label: string;
  action: () => void;
};

export type PaltoGoMobileRouteCardProps = {
  pickupValue: string;
  destinationValue: string;
  destinationPlaceholder: string;
  onPickupChange: (value: string) => void;
  onDestinationChange: (value: string) => void;
  onPickupKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  onDestinationKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  onPickupFocus: (e: FocusEvent<HTMLInputElement>) => void;
  onPickupBlur: (e: FocusEvent<HTMLInputElement>) => void;
  onDestinationFocus: (e: FocusEvent<HTMLInputElement>) => void;
  onDestinationBlur: (e: FocusEvent<HTMLInputElement>) => void;
  onSwapEndpoints: () => void;
  onPickupMenuClick: () => void;
  pickupGeocodeLoading: boolean;
  destinationSuggestionLoading: boolean;
  destinationSnapLoading: boolean;
  pickupSuggestionOpen: boolean;
  destinationSuggestionOpen: boolean;
  pickupQueryLength: number;
  destinationQueryLength: number;
  pickupAddressSuggestions: GeocodeSuggestion[];
  destinationAddressSuggestions: GeocodeSuggestion[];
  pickupStaticSuggestions: PaltoGoStaticSuggestion[];
  destinationStaticSuggestions: PaltoGoStaticSuggestion[];
  pickupSuggestionLoading: boolean;
  destinationSuggestionLoadingFlag: boolean;
  onApplyPickupSuggestion: (s: GeocodeSuggestion) => void;
  onApplyDestinationSuggestion: (s: GeocodeSuggestion) => void;
  simplifyAddress: (label: string) => string;
};

const PaltoGoMobileRouteCard: FC<PaltoGoMobileRouteCardProps> = ({
  pickupValue,
  destinationValue,
  destinationPlaceholder,
  onPickupChange,
  onDestinationChange,
  onPickupKeyDown,
  onDestinationKeyDown,
  onPickupFocus,
  onPickupBlur,
  onDestinationFocus,
  onDestinationBlur,
  onSwapEndpoints,
  onPickupMenuClick,
  pickupGeocodeLoading,
  destinationSuggestionLoading,
  destinationSnapLoading,
  pickupSuggestionOpen,
  destinationSuggestionOpen,
  pickupQueryLength,
  destinationQueryLength,
  pickupAddressSuggestions,
  destinationAddressSuggestions,
  pickupStaticSuggestions,
  destinationStaticSuggestions,
  pickupSuggestionLoading,
  destinationSuggestionLoadingFlag,
  onApplyPickupSuggestion,
  onApplyDestinationSuggestion,
  simplifyAddress,
}) => {
  return (
    <div className="palto-ride-route-card" role="group" aria-label="Départ et destination">
      <div className="palto-ride-route-card__rail" aria-hidden>
        <span className="palto-ride-route-card__origin-dot" />
        <span className="palto-ride-route-card__rail-line" />
        <MapPin className="palto-ride-route-card__pin-icon" size={18} strokeWidth={2.25} aria-hidden />
      </div>
      <div className="palto-ride-route-card__body">
        <div className="palto-ride-route-card__row">
          <div className="palto-ride-route-card__field palto-ride-input-row">
            <input
              type="text"
              className="palto-ride-route-card__input palto-ride-route-card__input--pickup"
              value={pickupValue}
              placeholder="Votre position"
              onChange={(e) => onPickupChange(e.target.value)}
              onKeyDown={onPickupKeyDown}
              onFocus={onPickupFocus}
              onBlur={onPickupBlur}
              aria-busy={pickupGeocodeLoading}
              aria-label="Départ"
            />
            {pickupSuggestionOpen ? (
              <div
                className="palto-pickup-suggestions palto-pickup-suggestions--route-card"
                role="listbox"
                aria-label="Suggestions départ"
              >
                {pickupQueryLength >= 2 ? (
                  <>
                    <p className="palto-pickup-suggestions__title">Suggestions d’adresse</p>
                    {pickupAddressSuggestions.length > 0 ? (
                      <div className="palto-pickup-suggestions__list">
                        {pickupAddressSuggestions.map((s) => (
                          <button
                            key={`${s.longitude}-${s.latitude}-${s.label}`}
                            type="button"
                            className="palto-pickup-suggestions__item"
                            data-pickup-suggestion="true"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              void onApplyPickupSuggestion(s);
                            }}
                          >
                            {simplifyAddress(s.label)}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="palto-pickup-suggestions__hint">
                        {pickupSuggestionLoading ? 'Recherche en cours…' : 'Aucune adresse trouvée.'}
                      </p>
                    )}
                    {pickupSuggestionLoading && pickupAddressSuggestions.length > 0 ? (
                      <p className="palto-pickup-suggestions__hint">Affinage des suggestions…</p>
                    ) : null}
                  </>
                ) : (
                  <>
                    <p className="palto-pickup-suggestions__title">Pré-sélection</p>
                    <div className="palto-pickup-suggestions__list">
                      {pickupStaticSuggestions.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="palto-pickup-suggestions__item"
                          data-pickup-suggestion="true"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={item.action}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="palto-ride-route-card__action"
            aria-label="Options de départ"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onPickupMenuClick}
          >
            <MoreHorizontal size={22} strokeWidth={2} aria-hidden />
          </button>
        </div>
        <div className="palto-ride-route-card__row">
          <div className="palto-ride-route-card__field palto-ride-input-row">
            <input
              type="text"
              className="palto-ride-route-card__input palto-ride-route-card__input--destination"
              placeholder={destinationPlaceholder}
              value={destinationValue}
              onChange={(e) => onDestinationChange(e.target.value)}
              onKeyDown={onDestinationKeyDown}
              onFocus={onDestinationFocus}
              onBlur={onDestinationBlur}
              aria-busy={destinationSuggestionLoading || destinationSnapLoading}
              aria-label="Destination"
            />
            {destinationSuggestionOpen ? (
              <div
                className="palto-pickup-suggestions palto-pickup-suggestions--route-card"
                role="listbox"
                aria-label="Suggestions destination"
              >
                {destinationQueryLength >= 2 ? (
                  <>
                    <p className="palto-pickup-suggestions__title">Suggestions d’adresse</p>
                    {destinationAddressSuggestions.length > 0 ? (
                      <div className="palto-pickup-suggestions__list">
                        {destinationAddressSuggestions.map((s) => (
                          <button
                            key={`dest-${s.longitude}-${s.latitude}-${s.label}`}
                            type="button"
                            className="palto-pickup-suggestions__item"
                            data-destination-suggestion="true"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              void onApplyDestinationSuggestion(s);
                            }}
                          >
                            {simplifyAddress(s.label)}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="palto-pickup-suggestions__hint">
                        {destinationSuggestionLoadingFlag ? 'Recherche en cours…' : 'Aucune adresse trouvée.'}
                      </p>
                    )}
                    {destinationSuggestionLoadingFlag && destinationAddressSuggestions.length > 0 ? (
                      <p className="palto-pickup-suggestions__hint">Affinage des suggestions…</p>
                    ) : null}
                  </>
                ) : (
                  <>
                    <p className="palto-pickup-suggestions__title">Pré-sélection</p>
                    <div className="palto-pickup-suggestions__list">
                      {destinationStaticSuggestions.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="palto-pickup-suggestions__item"
                          data-destination-suggestion="true"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={item.action}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="palto-ride-route-card__action"
            aria-label="Inverser départ et destination"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onSwapEndpoints}
          >
            <ArrowUpDown size={20} strokeWidth={2.25} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaltoGoMobileRouteCard;
