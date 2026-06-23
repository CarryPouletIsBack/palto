import type { Dispatch, SetStateAction } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import type { ChauffeurSignupDraft } from '../constants/chauffeurSignup'
import { REUNION_COMMUNES_SORTED } from '../data/reunionCommunes'
import ChauffeurSignupAddressField from './ChauffeurSignupAddressField'
import AuthSignupIdentityFields from './AuthSignupIdentityFields'
import { AuthFieldLabelText } from './AuthRequiredMark'
import type { SupportedPhoneCountry } from '../services/phoneNumber'

type Props = {
  draft: ChauffeurSignupDraft
  setDraft: Dispatch<SetStateAction<ChauffeurSignupDraft>>
  showPassword: boolean
  setShowPassword: (value: boolean) => void
  oauthMode?: boolean
}

export default function ChauffeurSignupStepIdentity({
  draft,
  setDraft,
  showPassword,
  setShowPassword,
  oauthMode = false,
}: Props) {
  const { t, language } = useLanguage()

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
      <ChauffeurSignupAddressField
        adresse={draft.adresse}
        language={language}
        t={t}
        onAdresseChange={(v) => setDraft((d) => ({ ...d, adresse: v }))}
        onCommuneResolved={(ville) => setDraft((d) => ({ ...d, ville }))}
      />
      <label className="auth-page-field-label">
        <AuthFieldLabelText required>{t('chauffeurAuth.cityLabel')}</AuthFieldLabelText>
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
      <label className="auth-page-field-label">
        <AuthFieldLabelText required>{t('chauffeurAuth.email')}</AuthFieldLabelText>
        <input
          className="auth-page-input"
          type="email"
          value={draft.email}
          onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
          placeholder={t('chauffeurAuth.email')}
          autoComplete="email"
          required
          readOnly={oauthMode}
        />
      </label>
      {!oauthMode ? (
        <>
          <label className="auth-page-field-label">
            <AuthFieldLabelText required>{t('chauffeurAuth.password')}</AuthFieldLabelText>
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
          </label>
          <label className="auth-page-field-label">
            <AuthFieldLabelText required>{t('chauffeurAuth.confirmPassword')}</AuthFieldLabelText>
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
          </label>
        </>
      ) : null}
    </div>
  )
}
