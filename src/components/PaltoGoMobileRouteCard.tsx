import type { FC, KeyboardEvent, FocusEvent } from 'react';
import { ArrowUpDown, MapPin, MoreHorizontal } from 'lucide-react';

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
}) => {
  const suggestionsPanelId = 'palto-mobile-suggestions-panel';

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
