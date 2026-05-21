import type { ChangeEvent, Dispatch, SetStateAction } from 'react'
import type { Language } from '../contexts/LanguageContext'
import type { ChauffeurRideSettingsSnapshot } from '../constants/chauffeurRideSettingsStorage'

type Props = {
  language: Language
  rideSettingsDraft: ChauffeurRideSettingsSnapshot
  setRideSettingsDraft: Dispatch<SetStateAction<ChauffeurRideSettingsSnapshot>>
  computeAppliedPrice: (raw: string, multiplierPercent: number) => string
}

function readFormControlValue(
  e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
): string {
  return e.currentTarget?.value ?? ''
}

export default function ChauffeurRideSettingsForm({
  language,
  rideSettingsDraft,
  setRideSettingsDraft,
  computeAppliedPrice,
}: Props) {
  const isEn = language === 'en'
  const mult = rideSettingsDraft.pricingMultiplierPercent

  return (
    <>
      <article className="dashboard-panel">
        <div className="dashboard-section-title dashboard-section-title-inline">
          <h3>{isEn ? 'My fares' : 'Mes tarifs'}</h3>
          <span>{isEn ? 'You set your prices' : 'Vous fixez vos prix'}</span>
        </div>
        <p className="dashboard-field-hint" style={{ margin: '0 0 12px' }}>
          {isEn
            ? 'Palto does not impose an Uber-style grid. These amounts are yours; passengers see them on Go (with the flexibility gauge below).'
            : 'Palto n’impose pas de grille type Uber. Ce sont vos tarifs ; les passagers les voient sur Go (avec la jauge de flexibilité ci-dessous).'}
        </p>
        <div className="dashboard-payment-edit-grid">
          <label>
            {isEn ? 'Pickup fee (EUR)' : 'Prise en charge (EUR)'}
            <input
              type="text"
              inputMode="decimal"
              value={rideSettingsDraft.baseFareEur}
              onChange={(e) =>
                setRideSettingsDraft((prev) => ({ ...prev, baseFareEur: readFormControlValue(e) }))
              }
              placeholder="2,20"
              required
            />
          </label>
          <label>
            {isEn ? 'Price per km (EUR)' : 'Prix au km (EUR)'}
            <input
              type="text"
              inputMode="decimal"
              value={rideSettingsDraft.pricePerKmEur}
              onChange={(e) =>
                setRideSettingsDraft((prev) => ({ ...prev, pricePerKmEur: readFormControlValue(e) }))
              }
              placeholder="1,40"
              required
            />
          </label>
          <label>
            {isEn ? 'Night surcharge (%)' : 'Bonus nuit (%)'}
            <input
              type="text"
              inputMode="decimal"
              value={rideSettingsDraft.nightSurchargePercent}
              onChange={(e) =>
                setRideSettingsDraft((prev) => ({ ...prev, nightSurchargePercent: readFormControlValue(e) }))
              }
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
              type="text"
              inputMode="decimal"
              value={rideSettingsDraft.elevationSurchargeEurPer100m}
              onChange={(e) =>
                setRideSettingsDraft((prev) => ({
                  ...prev,
                  elevationSurchargeEurPer100m: readFormControlValue(e),
                }))
              }
              placeholder="1,50"
              required
            />
            <small className="dashboard-field-hint">
              {isEn
                ? 'Coast and mountain routes (Réunion). Estimated from the route vs. straight line on Go.'
                : 'Côte et reliefs (La Réunion). Estimé sur Go à partir de l’écart route / ligne droite.'}
            </small>
          </label>
        </div>
        <div className="dashboard-metric-list" style={{ marginTop: 14 }}>
          <div className="dashboard-metric-row">
            <span>{isEn ? 'Pickup shown to passengers' : 'Prise en charge affichée'}</span>
            <strong>
              {computeAppliedPrice(rideSettingsDraft.baseFareEur, mult)} EUR
            </strong>
          </div>
          <div className="dashboard-metric-row">
            <span>{isEn ? 'Price/km shown' : 'Prix/km affiché'}</span>
            <strong>
              {computeAppliedPrice(rideSettingsDraft.pricePerKmEur, mult)} EUR / km
            </strong>
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
          <h3>{isEn ? 'Flexibility gauge' : 'Jauge de flexibilité'}</h3>
          <span>90% – 110%</span>
        </div>
        <p className="dashboard-field-hint" style={{ margin: '0 0 10px' }}>
          {isEn
            ? 'Fine-tune how your fares appear on Go without changing your base amounts above.'
            : 'Ajustez l’affichage sur Go sans modifier vos montants de base ci-dessus.'}
        </p>
        <div className="dashboard-payment-edit-grid">
          <label>
            {isEn ? 'Global multiplier' : 'Multiplicateur global'}
            <input
              type="number"
              min="90"
              max="110"
              step="1"
              value={rideSettingsDraft.pricingMultiplierPercent}
              onChange={(e) =>
                setRideSettingsDraft((prev) => ({
                  ...prev,
                  pricingMultiplierPercent: Number(readFormControlValue(e)),
                }))
              }
              required
            />
          </label>
          <label className="dashboard-ride-slider-field">
            {isEn ? 'Fare adjustment' : 'Ajustement de tarif'}
            <input
              className="dashboard-ride-setting-range"
              type="range"
              min="90"
              max="110"
              step="1"
              value={rideSettingsDraft.pricingMultiplierPercent}
              onChange={(e) =>
                setRideSettingsDraft((prev) => ({
                  ...prev,
                  pricingMultiplierPercent: Number(readFormControlValue(e)),
                }))
              }
            />
            <span className="dashboard-field-hint">
              {isEn
                ? '90%: more competitive · 100%: your fare · 110%: premium'
                : '90 % : plus compétitif · 100 % : votre tarif · 110 % : premium'}
            </span>
          </label>
        </div>
      </article>

      <article className="dashboard-panel">
        <div className="dashboard-section-title dashboard-section-title-inline">
          <h3>{isEn ? 'Operations' : 'Exploitation'}</h3>
          <span>{isEn ? 'Area & service' : 'Zone et service'}</span>
        </div>
        <div className="dashboard-payment-edit-grid">
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
      </article>
    </>
  )
}
