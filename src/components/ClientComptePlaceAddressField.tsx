import { useCallback, useEffect, useMemo, useRef, useState, type FocusEvent } from 'react';
import type { SavedPlaceCoords } from '../constants/clientSavedPlacesStorage';
import {
  POPULAR_DESTINATIONS,
  SECTOR_DESTINATIONS,
  filterPopularDestinations,
  type PopularDestination,
} from '../data/popularDestinations';
import {
  geocodeForward,
  geocodeForwardSuggestions,
  geocodeReverse,
  reverseGeocodeDisplayFallback,
  type GeocodeSuggestion,
} from '../services/addressGeocoding';
import { resolvePickOnRoad } from '../services/osrmRouting';
import { REUNION_ISLAND_BBOX_GEOCODE } from '../constants/reunionIsland';

const AUTOCOMPLETE_DEBOUNCE_MS = 220;
const MIN_QUERY_LEN = 3;

const PROXIMITY_REU: [number, number] = [55.45, -21.15];

export type ClientComptePlaceAddressFieldProps = {
  inputId: string;
  value: string;
  coords: SavedPlaceCoords | null;
  language: 'fr' | 'en';
  t: (key: string) => string;
  onUserInput: (next: string) => void;
  onResolvedPlace: (address: string, coords: SavedPlaceCoords) => void;
  onMarkOnMap: () => void;
};

function allPopular(): PopularDestination[] {
  return [...POPULAR_DESTINATIONS, ...SECTOR_DESTINATIONS];
}

export default function ClientComptePlaceAddressField({
  inputId,
  value,
  coords,
  language,
  t,
  onUserInput,
  onResolvedPlace,
  onMarkOnMap,
}: ClientComptePlaceAddressFieldProps) {
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [resolvingPick, setResolvingPick] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filteredPopular = useMemo(
    () => filterPopularDestinations(allPopular(), value, language).slice(0, 8),
    [value, language]
  );

  const resolveFromGeocode = useCallback(
    async (longitude: number, latitude: number, fallbackLabel: string) => {
      setResolvingPick(true);
      try {
        const picked = await resolvePickOnRoad(longitude, latitude, { searchRadiusMeters: 75 });
        const fromReverse = await geocodeReverse(picked.longitude, picked.latitude, undefined, { language });
        const display =
          (fromReverse?.trim() ? fromReverse : null) ??
          (fallbackLabel.trim() ? fallbackLabel : reverseGeocodeDisplayFallback(language, 'mapPoint'));
        onResolvedPlace(display, { lng: picked.longitude, lat: picked.latitude });
        setSuggestionOpen(false);
      } finally {
        setResolvingPick(false);
      }
    },
    [language, onResolvedPlace]
  );

  const applyAddressSuggestion = useCallback(
    async (s: GeocodeSuggestion) => {
      await resolveFromGeocode(s.longitude, s.latitude, s.label);
    },
    [resolveFromGeocode]
  );

  const applyPopular = useCallback(
    async (d: PopularDestination) => {
      const coordsFwd = await geocodeForward(d.geocodeQuery, undefined, {
        language,
        bbox: REUNION_ISLAND_BBOX_GEOCODE,
      });
      if (!coordsFwd) return;
      await resolveFromGeocode(coordsFwd.longitude, coordsFwd.latitude, d.geocodeQuery);
    },
    [language, resolveFromGeocode]
  );

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!suggestionOpen) {
      setAddressSuggestions([]);
      setSuggestionLoading(false);
      return;
    }
    const q = value.trim();
    if (q.length < MIN_QUERY_LEN) {
      setAddressSuggestions([]);
      setSuggestionLoading(false);
      return;
    }
    timerRef.current = setTimeout(async () => {
      timerRef.current = null;
      setSuggestionLoading(true);
      try {
        const list = await geocodeForwardSuggestions(q, undefined, {
          language,
          proximity: PROXIMITY_REU,
          bbox: REUNION_ISLAND_BBOX_GEOCODE,
          limit: 5,
        });
        setAddressSuggestions(list);
      } catch {
        setAddressSuggestions([]);
      } finally {
        setSuggestionLoading(false);
      }
    }, AUTOCOMPLETE_DEBOUNCE_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [suggestionOpen, value, language]);

  const onBlur = useCallback((e: FocusEvent<HTMLInputElement>) => {
    const next = e.relatedTarget as HTMLElement | null;
    if (next?.dataset?.clientPlaceSuggest === 'true') return;
    setSuggestionOpen(false);
  }, []);

  return (
    <div className="client-compte-place-field-wrap">
      <label className="client-compte-place-field" htmlFor={inputId}>
        <span>{t('clientAccount.placesAddressLabel')}</span>
        <input
          id={inputId}
          type="text"
          value={value}
          onChange={(e) => onUserInput(e.target.value)}
          onFocus={() => setSuggestionOpen(true)}
          onBlur={onBlur}
          placeholder={t('clientAccount.placesAddressPlaceholder')}
          autoComplete="street-address"
          disabled={resolvingPick}
        />
      </label>

      {suggestionOpen ? (
        <div className="client-compte-place-suggestions" role="listbox" aria-label={t('clientAccount.placesSuggestionsAria')}>
          {filteredPopular.length > 0 ? (
            <>
              <p className="client-compte-place-suggestions__title">{t('clientAccount.placesSuggestionsPopular')}</p>
              <div className="client-compte-place-suggestions__list">
                {filteredPopular.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    data-client-place-suggest="true"
                    className="client-compte-place-suggestions__item"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => void applyPopular(d)}
                  >
                    {language === 'en' ? d.titleEn : d.titleFr}
                  </button>
                ))}
              </div>
            </>
          ) : null}

          <p className="client-compte-place-suggestions__title">{t('clientAccount.placesSuggestionsAddresses')}</p>
          {suggestionLoading ? (
            <p className="client-compte-place-suggestions__hint">{t('clientAccount.placesSuggestionsLoading')}</p>
          ) : value.trim().length < MIN_QUERY_LEN ? (
            <p className="client-compte-place-suggestions__hint">{t('clientAccount.placesSuggestionsMinChars')}</p>
          ) : addressSuggestions.length > 0 ? (
            <div className="client-compte-place-suggestions__list">
              {addressSuggestions.map((s, i) => (
                <button
                  key={`${s.label}-${i}`}
                  type="button"
                  data-client-place-suggest="true"
                  className="client-compte-place-suggestions__item"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => void applyAddressSuggestion(s)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          ) : (
            <p className="client-compte-place-suggestions__hint">{t('clientAccount.placesSuggestionsEmpty')}</p>
          )}
        </div>
      ) : null}

      <div className="client-compte-place-actions">
        <button
          type="button"
          className="dashboard-user-edit-btn"
          onClick={onMarkOnMap}
          disabled={resolvingPick}
        >
          {t('clientAccount.placesMarkOnMap')}
        </button>
        {coords ? (
          <span className="dashboard-field-hint client-compte-place-coords-hint">{t('clientAccount.placesCoordsSaved')}</span>
        ) : null}
      </div>
    </div>
  );
}
