import type { Dispatch, SetStateAction } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import {
  CHAUFFEUR_SIGNUP_MOTORISATIONS,
  type ChauffeurSignupDraft,
} from '../constants/chauffeurSignup'
import type { ChauffeurVehicleType } from '../constants/chauffeurRegistrationStorage'
import { formatFrenchPlateInput } from '../services/vehiclePlate'
import { AuthFieldLabelText } from './AuthRequiredMark'

type Props = {
  draft: ChauffeurSignupDraft
  setDraft: Dispatch<SetStateAction<ChauffeurSignupDraft>>
}

export default function ChauffeurSignupStepVehicle({ draft, setDraft }: Props) {
  const { t } = useLanguage()

  return (
    <div className="auth-signup-step">
      <h2 className="auth-signup-step__title">{t('chauffeurAuth.stepVehicleTitle')}</h2>
      <label className="auth-page-field-label">
        <AuthFieldLabelText required>{t('chauffeurAuth.vehicleTypeLabel')}</AuthFieldLabelText>
        <select
          className="auth-page-select"
          value={draft.vehicleType}
          onChange={(e) =>
            setDraft((d) => ({ ...d, vehicleType: e.target.value as ChauffeurVehicleType }))
          }
          required
        >
          <option value="berline">{t('chauffeurAuth.vehicleBerline')}</option>
          <option value="utilitaire">{t('chauffeurAuth.vehicleUtilitaire')}</option>
          <option value="moto">{t('chauffeurAuth.vehicleMoto')}</option>
          <option value="scooter">{t('chauffeurAuth.vehicleScooter')}</option>
        </select>
      </label>
      <label className="auth-page-field-label">
        <AuthFieldLabelText required>{t('chauffeurAuth.motorisationLabel')}</AuthFieldLabelText>
        <select
          className="auth-page-select"
          value={draft.motorisation}
          onChange={(e) =>
            setDraft((d) => ({
              ...d,
              motorisation: e.target.value as ChauffeurSignupDraft['motorisation'],
            }))
          }
          required
        >
          {CHAUFFEUR_SIGNUP_MOTORISATIONS.map((m) => (
            <option key={m} value={m}>
              {m === 'electrique_100'
                ? t('chauffeurAuth.motorisationElectric')
                : t('chauffeurAuth.motorisationThermique')}
            </option>
          ))}
        </select>
      </label>
      <label className="auth-page-field-label">
        <AuthFieldLabelText required>{t('chauffeurAuth.plateLabel')}</AuthFieldLabelText>
        <input
          className="auth-page-input"
          type="text"
          value={draft.plaque}
          onChange={(e) => setDraft((d) => ({ ...d, plaque: formatFrenchPlateInput(e.target.value) }))}
          placeholder={t('chauffeurAuth.platePlaceholder')}
          autoComplete="off"
          required
        />
      </label>
      <label className="auth-page-field-label">
        <AuthFieldLabelText required>{t('chauffeurAuth.licenseYearLabel')}</AuthFieldLabelText>
        <input
          className="auth-page-input"
          type="text"
          inputMode="numeric"
          maxLength={4}
          value={draft.licenseYear}
          onChange={(e) =>
            setDraft((d) => ({ ...d, licenseYear: e.target.value.replace(/\D/g, '').slice(0, 4) }))
          }
          placeholder={t('chauffeurAuth.licenseYearPlaceholder')}
          required
        />
      </label>
      <label className="auth-page-checkbox-row">
        <input
          type="checkbox"
          checked={draft.isVtc}
          onChange={(e) => setDraft((d) => ({ ...d, isVtc: e.target.checked }))}
        />
        {t('chauffeurAuth.isVtcLabel')}
      </label>
      <label className="auth-page-checkbox-row">
        <input
          type="checkbox"
          checked={draft.deliveryEquipped}
          onChange={(e) => setDraft((d) => ({ ...d, deliveryEquipped: e.target.checked }))}
        />
        {t('chauffeurAuth.deliveryEquippedLabel')}
      </label>
      <p className="auth-page-field-hint">{t('chauffeurAuth.deliveryEquippedHint')}</p>
    </div>
  )
}
