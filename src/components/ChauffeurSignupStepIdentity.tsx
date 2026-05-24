import type { Dispatch, SetStateAction } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import type { ChauffeurSignupDraft } from '../constants/chauffeurSignup'
import { REUNION_COMMUNES_SORTED } from '../data/reunionCommunes'
import AuthSignupIdentityFields from './AuthSignupIdentityFields'
import type { SupportedPhoneCountry } from '../services/phoneNumber'

type Props = {
  draft: ChauffeurSignupDraft
  setDraft: Dispatch<SetStateAction<ChauffeurSignupDraft>>
  showPassword: boolean
  setShowPassword: (value: boolean) => void
}

export default function ChauffeurSignupStepIdentity({ draft, setDraft, showPassword, setShowPassword }: Props) {
  const { t } = useLanguage()

  return (
    <div className="auth-signup-step">
      <h2 className="auth-signup-step__title">{t('chauffeurAuth.stepIdentityTitle')}</h2>
      <AuthSignupIdentityFields
        prenom={draft.prenom}
        nom={draft.nom}
        phoneCountry={draft.phoneCountry}
        phoneNational={draft.phoneNational}
        onPrenomChange={(v) => setDraft((d) => ({ ...d, prenom: v }))}
        onNomChange={(v) => setDraft((d) => ({ ...d, nom: v }))}
        onPhoneCountryChange={(v) => setDraft((d) => ({ ...d, phoneCountry: v as SupportedPhoneCountry }))}
        onPhoneNationalChange={(v) => setDraft((d) => ({ ...d, phoneNational: v }))}
      />
      <label className="auth-page-field-label">
        {t('chauffeurAuth.addressLabel')}
        <input
          className="auth-page-input"
          type="text"
          value={draft.adresse}
          onChange={(e) => setDraft((d) => ({ ...d, adresse: e.target.value }))}
          placeholder={t('chauffeurAuth.addressPlaceholder')}
          autoComplete="street-address"
          required
        />
      </label>
      <label className="auth-page-field-label">
        {t('chauffeurAuth.cityLabel')}
        <select
          className="auth-page-select"
          value={draft.ville}
          onChange={(e) => setDraft((d) => ({ ...d, ville: e.target.value }))}
          required
        >
          <option value="">{t('chauffeurAuth.cityPlaceholder')}</option>
          {REUNION_COMMUNES_SORTED.map((commune) => (
            <option key={commune} value={commune}>
              {commune}
            </option>
          ))}
        </select>
      </label>
      <input
        className="auth-page-input"
        type="email"
        value={draft.email}
        onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
        placeholder={t('chauffeurAuth.email')}
        autoComplete="email"
        required
      />
      <div className="auth-page-password-row">
        <input
          className="auth-page-input"
          type={showPassword ? 'text' : 'password'}
          value={draft.password}
          onChange={(e) => setDraft((d) => ({ ...d, password: e.target.value }))}
          placeholder={t('chauffeurAuth.password')}
          autoComplete="new-password"
          required
          minLength={6}
        />
        <button
          className="auth-page-toggle-visibility"
          type="button"
          onMouseDown={() => setShowPassword(true)}
          onMouseUp={() => setShowPassword(false)}
          onMouseLeave={() => setShowPassword(false)}
          onTouchStart={() => setShowPassword(true)}
          onTouchEnd={() => setShowPassword(false)}
          onBlur={() => setShowPassword(false)}
          aria-label="Maintenir pour afficher le mot de passe"
        >
          {showPassword ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
        </button>
      </div>
      <input
        className="auth-page-input"
        type={showPassword ? 'text' : 'password'}
        value={draft.passwordConfirm}
        onChange={(e) => setDraft((d) => ({ ...d, passwordConfirm: e.target.value }))}
        placeholder={t('chauffeurAuth.confirmPassword')}
        autoComplete="new-password"
        required
        minLength={6}
      />
    </div>
  )
}
