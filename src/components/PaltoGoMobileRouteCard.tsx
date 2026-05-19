import type { FC, KeyboardEvent, FocusEvent } from 'react';
import { MapPin, X } from 'lucide-react';

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
  onClearPickup: () => void;
  onClearDestination: () => void;
  clearPickupAriaLabel: string;
  clearDestinationAriaLabel: string;
  pickupGeocodeLoading: boolean;
  destinationSuggestionLoading: boolean;
  destinationSnapLoading: boolean;
  pickupSuggestionOpen: boolean;
  destinationSuggestionOpen: boolean;
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
  onClearPickup,
  onClearDestination,
  clearPickupAriaLabel,
  clearDestinationAriaLabel,
  pickupGeocodeLoading,
  destinationSuggestionLoading,
  destinationSnapLoading,
  pickupSuggestionOpen,
  destinationSuggestionOpen,
}) => {
  const suggestionsPanelId = 'palto-mobile-suggestions-panel';
  const showPickupClear = pickupValue.trim().length > 0;
  const showDestinationClear = destinationValue.trim().length > 0;

  return (
    <div className="palto-ride-route-card" role="group" aria-label="Départ et destination">
      <div className="palto-ride-route-card__rail" aria-hidden>
        <span className="palto-ride-route-card__origin-dot" />
        <span className="palto-ride-route-card__rail-line" />
        <MapPin className="palto-ride-route-card__pin-icon" size={18} strokeWidth={2.25} aria-hidden />
      </div>
      <div className="palto-ride-route-card__body">
        <div className="palto-ride-route-card__row">
          <div className="palto-ride-route-card__field">
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
              aria-expanded={pickupSuggestionOpen}
              aria-controls={pickupSuggestionOpen ? suggestionsPanelId : undefined}
            />
          </div>
          {showPickupClear ? (
            <button
              type="button"
              className="palto-ride-route-card__action palto-ride-route-card__action--clear"
              aria-label={clearPickupAriaLabel}
              onMouseDown={(e) => e.preventDefault()}
              onClick={onClearPickup}
            >
              <X size={20} strokeWidth={2.25} aria-hidden />
            </button>
          ) : null}
        </div>
        <div className="palto-ride-route-card__row">
          <div className="palto-ride-route-card__field">
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
              aria-expanded={destinationSuggestionOpen}
              aria-controls={destinationSuggestionOpen ? suggestionsPanelId : undefined}
            />
          </div>
          {showDestinationClear ? (
            <button
              type="button"
              className="palto-ride-route-card__action palto-ride-route-card__action--clear"
              aria-label={clearDestinationAriaLabel}
              onMouseDown={(e) => e.preventDefault()}
              onClick={onClearDestination}
            >
              <X size={20} strokeWidth={2.25} aria-hidden />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default PaltoGoMobileRouteCard;
