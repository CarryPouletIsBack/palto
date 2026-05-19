import type { FC } from 'react';
import { Bookmark, Briefcase, Home, LocateFixed, MapPin } from 'lucide-react';
import type { PopularDestination } from '../data/popularDestinations';
import type { GeocodeSuggestion } from '../services/addressGeocoding';
import type { PaltoGoStaticSuggestion } from './PaltoGoMobileRouteCard';

export type PaltoGoMobileHistoryItem = {
  id: string;
  label: string;
  onSelect: () => void;
};

export type PaltoGoMobileSuggestionsPanelProps = {
  sectionTitle?: string;
  ariaLabel: string;
  queryLength: number;
  addressSuggestions: GeocodeSuggestion[];
  staticSuggestions: PaltoGoStaticSuggestion[];
  historyItems: PaltoGoMobileHistoryItem[];
  popularDestinations: PopularDestination[];
  popularSectionTitle: string;
  popularDestTitle: (d: PopularDestination) => string;
  onSelectPopular: (d: PopularDestination) => void;
  suggestionLoading: boolean;
  onApplyAddress: (s: GeocodeSuggestion) => void;
  simplifyAddress: (label: string) => string;
  dataAttr: 'data-pickup-suggestion' | 'data-destination-suggestion';
};

const SUGGESTION_ROW_ICON_PROPS = {
  size: 18,
  strokeWidth: 2.25,
  className: 'palto-pickup-suggestions__item-icon',
  'aria-hidden': true as const,
};

function SuggestionRowIcon({ suggestionId }: { suggestionId: string }) {
  if (suggestionId === 'ask-geolocation') {
    return <LocateFixed {...SUGGESTION_ROW_ICON_PROPS} />;
  }
  if (suggestionId === 'shared-saved-empty') {
    return <Bookmark {...SUGGESTION_ROW_ICON_PROPS} />;
  }
  if (suggestionId === 'shared-saved-home') {
    return <Home {...SUGGESTION_ROW_ICON_PROPS} />;
  }
  if (suggestionId === 'shared-saved-work') {
    return <Briefcase {...SUGGESTION_ROW_ICON_PROPS} />;
  }
  if (suggestionId.startsWith('shared-saved-')) {
    return <Bookmark {...SUGGESTION_ROW_ICON_PROPS} />;
  }
  return <MapPin {...SUGGESTION_ROW_ICON_PROPS} />;
}

const PaltoGoMobileSuggestionsPanel: FC<PaltoGoMobileSuggestionsPanelProps> = ({
  sectionTitle,
  ariaLabel,
  queryLength,
  addressSuggestions,
  staticSuggestions,
  historyItems,
  popularDestinations,
  popularSectionTitle,
  popularDestTitle,
  onSelectPopular,
  suggestionLoading,
  onApplyAddress,
  simplifyAddress,
  dataAttr,
}) => {
  const showAutocomplete = queryLength >= 2;
  const showHistory = queryLength === 0 && historyItems.length > 0;
  const showPopular = queryLength === 0 && historyItems.length === 0 && popularDestinations.length > 0;

  return (
    <div className="palto-ride-mobile-suggestions-block" role="group" aria-label={ariaLabel}>
      {sectionTitle ? <p className="palto-ride-mobile-suggestions-block__heading">{sectionTitle}</p> : null}
      <div
        className="palto-pickup-suggestions palto-pickup-suggestions--route-below"
        role="listbox"
        aria-label={ariaLabel}
      >
        {showPopular ? (
          <div className="palto-ride-mobile-suggestions-block__above palto-ride-mobile-suggestions-block__above--popular">
            <div className="palto-go-mobile-popular__row" role="group" aria-label={popularSectionTitle}>
              {popularDestinations.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className="palto-go-mobile-popular-card"
                  {...{ [dataAttr]: 'true' }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onSelectPopular(d)}
                >
                  <span className="palto-go-mobile-popular-card__img">
                    {d.imageSrc ? (
                      <img src={d.imageSrc} alt="" loading="lazy" decoding="async" />
                    ) : null}
                  </span>
                  <span className="palto-go-mobile-popular-card__title">{popularDestTitle(d)}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {showAutocomplete ? (
          <div className="palto-ride-mobile-suggestions-block__above palto-ride-mobile-suggestions-block__above--autocomplete">
            {addressSuggestions.length > 0 ? (
              <div className="palto-pickup-suggestions__list palto-pickup-suggestions__list--rows">
                {addressSuggestions.map((s) => (
                  <button
                    key={`${s.longitude}-${s.latitude}-${s.label}`}
                    type="button"
                    className="palto-pickup-suggestions__item palto-pickup-suggestions__item--row"
                    {...{ [dataAttr]: 'true' }}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      void onApplyAddress(s);
                    }}
                  >
                    <SuggestionRowIcon suggestionId="address" />
                    <span className="palto-pickup-suggestions__item-label">
                      {simplifyAddress(s.label)}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="palto-pickup-suggestions__hint">
                {suggestionLoading ? 'Recherche en cours…' : 'Aucune adresse trouvée.'}
              </p>
            )}
            {suggestionLoading && addressSuggestions.length > 0 ? (
              <p className="palto-pickup-suggestions__hint">Affinage des suggestions…</p>
            ) : null}
          </div>
        ) : null}

        <div className="palto-ride-mobile-suggestions-block__preselect">
          <div className="palto-pickup-suggestions__list palto-pickup-suggestions__list--rows">
            {staticSuggestions.map((item) => {
              const isDisabled = item.id === 'shared-saved-empty';
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`palto-pickup-suggestions__item palto-pickup-suggestions__item--row${isDisabled ? ' palto-pickup-suggestions__item--row-muted' : ''}`}
                  disabled={isDisabled}
                  {...{ [dataAttr]: 'true' }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={item.action}
                >
                  <SuggestionRowIcon suggestionId={item.id} />
                  <span className="palto-pickup-suggestions__item-label">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {showHistory ? (
          <div className="palto-ride-mobile-suggestions-block__below">
            <div className="palto-pickup-suggestions__list">
              {historyItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="palto-pickup-suggestions__item"
                  {...{ [dataAttr]: 'true' }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={item.onSelect}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default PaltoGoMobileSuggestionsPanel;
