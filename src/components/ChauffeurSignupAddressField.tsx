import { useCallback, useEffect, useRef, useState, type FocusEvent } from 'react'
import { geocodeForwardSuggestions, type GeocodeSuggestion } from '../services/addressGeocoding'
import { REUNION_ISLAND_BBOX_GEOCODE } from '../constants/reunionIsland'
import { extractReunionCommuneFromAddressLabel } from '../data/reunionCommunes'
import type { Language } from '../contexts/LanguageContext'
import { AuthFieldLabelText } from './AuthRequiredMark'

const AUTOCOMPLETE_DEBOUNCE_MS = 220
const MIN_QUERY_LEN = 3
const PROXIMITY_REU: [number, number] = [55.45, -21.15]

type Props = {
  adresse: string
  language: Language
  t: (key: string) => string
  onAdresseChange: (value: string) => void
  onCommuneResolved: (commune: string) => void
}

export default function ChauffeurSignupAddressField({
  adresse,
  language,
  t,
  onAdresseChange,
  onCommuneResolved,
}: Props) {
  const [suggestionOpen, setSuggestionOpen] = useState(false)
  const [addressSuggestions, setAddressSuggestions] = useState<GeocodeSuggestion[]>([])
  const [suggestionLoading, setSuggestionLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const applySuggestion = useCallback(
    (suggestion: GeocodeSuggestion) => {
      onAdresseChange(suggestion.label)
      const commune = extractReunionCommuneFromAddressLabel(suggestion.label)
      if (commune) onCommuneResolved(commune)
      setSuggestionOpen(false)
    },
    [onAdresseChange, onCommuneResolved]
  )

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (!suggestionOpen) {
      setAddressSuggestions([])
      setSuggestionLoading(false)
      return
    }
    const q = adresse.trim()
    if (q.length < MIN_QUERY_LEN) {
      setAddressSuggestions([])
      setSuggestionLoading(false)
      return
    }
    timerRef.current = setTimeout(async () => {
      timerRef.current = null
      setSuggestionLoading(true)
      try {
        const list = await geocodeForwardSuggestions(q, undefined, {
          language,
          proximity: PROXIMITY_REU,
          bbox: REUNION_ISLAND_BBOX_GEOCODE,
          limit: 6,
        })
        setAddressSuggestions(list)
      } catch {
        setAddressSuggestions([])
      } finally {
        setSuggestionLoading(false)
      }
    }, AUTOCOMPLETE_DEBOUNCE_MS)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [adresse, language, suggestionOpen])

  const onBlur = useCallback((e: FocusEvent<HTMLInputElement>) => {
    const next = e.relatedTarget as HTMLElement | null
    if (next?.dataset?.chauffeurSignupAddressSuggest === 'true') return
    setSuggestionOpen(false)
  }, [])

  return (
    <label className="auth-page-field-label auth-page-address-field">
      <AuthFieldLabelText required>{t('chauffeurAuth.addressLabel')}</AuthFieldLabelText>
      <div className="auth-page-address-field__wrap">
        <input
          className="auth-page-input"
          type="text"
          value={adresse}
          onChange={(e) => onAdresseChange(e.target.value)}
          onFocus={() => setSuggestionOpen(true)}
          onBlur={onBlur}
          placeholder={t('chauffeurAuth.addressPlaceholder')}
          autoComplete="street-address"
          required
        />
        {suggestionOpen ? (
          <div
            className="auth-page-address-suggestions"
            role="listbox"
            aria-label={t('chauffeurAuth.addressSuggestionsAria')}
          >
            {suggestionLoading ? (
              <p className="auth-page-address-suggestions__hint">{t('chauffeurAuth.addressSuggestionsLoading')}</p>
            ) : adresse.trim().length < MIN_QUERY_LEN ? (
              <p className="auth-page-address-suggestions__hint">{t('chauffeurAuth.addressSuggestionsMinChars')}</p>
            ) : addressSuggestions.length > 0 ? (
              <div className="auth-page-address-suggestions__list">
                {addressSuggestions.map((suggestion, index) => (
                  <button
                    key={`${suggestion.label}-${index}`}
                    type="button"
                    data-chauffeur-signup-address-suggest="true"
                    className="auth-page-address-suggestions__item"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applySuggestion(suggestion)}
                  >
                    {suggestion.label}
                  </button>
                ))}
              </div>
            ) : (
              <p className="auth-page-address-suggestions__hint">{t('chauffeurAuth.addressSuggestionsEmpty')}</p>
            )}
          </div>
        ) : null}
      </div>
    </label>
  )
}
