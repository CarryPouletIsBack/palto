import type { ChangeEvent, Dispatch, FormEvent, SetStateAction } from 'react'
import type { Language } from '../contexts/LanguageContext'
import type { ChauffeurRideSettingsSnapshot } from '../constants/chauffeurRideSettingsStorage'
import { readFormControlValue } from '../utils/readFormControlValue'

type Props = {
  language: Language
  rideSettingsDraft: ChauffeurRideSettingsSnapshot
  setRideSettingsDraft: Dispatch<SetStateAction<ChauffeurRideSettingsSnapshot>>
  showServiceOptions?: boolean
}

type FareTextField = keyof Pick<
  ChauffeurRideSettingsSnapshot,
  'baseFareEur' | 'pricePerKmEur' | 'nightSurchargePercent' | 'elevationSurchargeEurPer100m'
>

function patchFareField(
  setRideSettingsDraft: Dispatch<SetStateAction<ChauffeurRideSettingsSnapshot>>,
  field: FareTextField,
  e: ChangeEvent<HTMLInputElement> | FormEvent<HTMLInputElement>
) {
  const value = readFormControlValue(e)
  setRideSettingsDraft((prev) => ({ ...prev, [field]: value }))
}

export default function ChauffeurRideSettingsForm({
  language,
  rideSettingsDraft,
  setRideSettingsDraft,
  showServiceOptions = true,
}: Props) {
  const isEn = language === 'en'

  const fareInputProps = (field: FareTextField) => ({
    type: 'text' as const,
    inputMode: 'text' as const,
    autoComplete: 'off',
    spellCheck: false,
    value: rideSettingsDraft[field] ?? '',
    onChange: (e: ChangeEvent<HTMLInputElement>) => patchFareField(setRideSettingsDraft, field, e),
    onInput: (e: FormEvent<HTMLInputElement>) => patchFareField(setRideSettingsDraft, field, e),
  })

  return (
    <>
      <article className="dashboard-panel chauffeur-instant-ride-fares-panel">
        <div className="dashboard-section-title dashboard-section-title-inline">
          <h3>{isEn ? 'Instant ride' : 'Course à l’instant'}</h3>
          <span>{isEn ? 'Your fares' : 'Vos tarifs'}</span>
        </div>
        <p className="dashboard-field-hint" style={{ margin: '0 0 12px' }}>
          {isEn
            ? 'Rates for on-demand trips on Palto Go. Configure your full service offer below.'
            : 'Tarifs appliqués aux courses immédiates sur Palto Go. Votre grille complète pour les autres prestations se configure ci-dessous.'}
        </p>
        <div className="dashboard-payment-edit-grid">
          <label>
            {isEn ? 'Pickup fee (EUR)' : 'Prise en charge (EUR)'}
            <input
              {...fareInputProps('baseFareEur')}
              name="chauffeur-base-fare"
              placeholder="2,20"
              required
            />
          </label>
          <label>
            {isEn ? 'Price per km (EUR)' : 'Prix au km (EUR)'}
            <input
              {...fareInputProps('pricePerKmEur')}
              name="chauffeur-price-per-km"
              placeholder="1,40"
              required
            />
          </label>
          <label>
            {isEn ? 'Night surcharge (%)' : 'Bonus nuit (%)'}
            <input
              {...fareInputProps('nightSurchargePercent')}
              name="chauffeur-night-surcharge"
              placeholder="18"
              required
            />
            <small className="dashboard-field-hint">
              {isEn ? 'Applied roughly 20:00–06:00.' : 'Appliqué environ 20h–6h.'}
            </small>
          </label>
          <label>
            {isEn ? 'Elevation surcharge (EUR / 100 m)' : 'Bonus dénivelé (EUR / 100 m)'}
            <input
              {...fareInputProps('elevationSurchargeEurPer100m')}
              name="chauffeur-elevation-surcharge"
              placeholder="1,50"
              required
            />
            <small className="dashboard-field-hint">
              {isEn
                ? 'Coast and mountain routes (Réunion). Applied on Go from route vs. straight-line distance.'
                : 'Côte et reliefs (La Réunion). Appliqué sur Go à partir de l’écart route / ligne droite.'}
            </small>
          </label>
        </div>
        <div className="dashboard-metric-list" style={{ marginTop: 14 }}>
          <div className="dashboard-metric-row">
            <span>{isEn ? 'Pickup shown to passengers' : 'Prise en charge affichée'}</span>
            <strong>{rideSettingsDraft.baseFareEur} EUR</strong>
          </div>
          <div className="dashboard-metric-row">
            <span>{isEn ? 'Price/km shown' : 'Prix/km affiché'}</span>
            <strong>{rideSettingsDraft.pricePerKmEur} EUR / km</strong>
          </div>
          <div className="dashboard-metric-row">
            <span>{isEn ? 'Night bonus' : 'Bonus nuit'}</span>
            <strong>+{rideSettingsDraft.nightSurchargePercent} %</strong>
          </div>
          <div className="dashboard-metric-row">
            <span>{isEn ? 'Elevation bonus' : 'Bonus dénivelé'}</span>
            <strong>+{rideSettingsDraft.elevationSurchargeEurPer100m} EUR / 100 m</strong>
          </div>
        </div>
      </article>

      <article className="dashboard-panel">
        <div className="dashboard-section-title dashboard-section-title-inline">
          <h3>{isEn ? 'Operations' : 'Exploitation'}</h3>
          <span>{isEn ? 'Area & service' : 'Zone et service'}</span>
        </div>
        <div className="dashboard-payment-edit-grid dashboard-ride-settings-ops-grid">
          <label>
            {isEn ? 'Pickup radius (km)' : 'Rayon prise en charge (km)'}
            <input
              type="number"
              min="1"
              value={rideSettingsDraft.maxPickupKm}
              onChange={(e) =>
                setRideSettingsDraft((prev) => ({ ...prev, maxPickupKm: readFormControlValue(e) }))
              }
              required
            />
          </label>
        </div>
        {showServiceOptions ? (
          <div className="dashboard-ride-settings-toggles" role="group" aria-label={isEn ? 'Service options' : 'Options de service'}>
            <label className="dashboard-ride-setting-toggle-row">
              <span>{isEn ? 'Pets allowed' : 'Animaux acceptés'}</span>
              <input
                className="dashboard-ride-setting-switch"
                type="checkbox"
                checked={rideSettingsDraft.petFriendly}
                onChange={(e) =>
                  setRideSettingsDraft((prev) => ({ ...prev, petFriendly: e.target.checked }))
                }
              />
            </label>
            <label className="dashboard-ride-setting-toggle-row">
              <span>{isEn ? 'Luggage help' : 'Aide bagages disponible'}</span>
              <input
                className="dashboard-ride-setting-switch"
                type="checkbox"
                checked={rideSettingsDraft.luggageAssistance}
                onChange={(e) =>
                  setRideSettingsDraft((prev) => ({ ...prev, luggageAssistance: e.target.checked }))
                }
              />
            </label>
            <label className="dashboard-ride-setting-toggle-row">
              <span>{isEn ? 'Insulated bag' : 'Sac isotherme'}</span>
              <input
                className="dashboard-ride-setting-switch"
                type="checkbox"
                checked={rideSettingsDraft.insulatedBag}
                onChange={(e) =>
                  setRideSettingsDraft((prev) => ({ ...prev, insulatedBag: e.target.checked }))
                }
              />
            </label>
          </div>
        ) : null}
      </article>
    </>
  )
}
