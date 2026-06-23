import { useLanguage } from '../contexts/LanguageContext'
import { PHONE_COUNTRIES, type SupportedPhoneCountry } from '../services/phoneNumber'
import { AuthFieldLabelText } from './AuthRequiredMark'

type Props = {
  prenom: string
  nom: string
  phoneCountry: SupportedPhoneCountry
  phoneNational: string
  onPrenomChange: (value: string) => void
  onNomChange: (value: string) => void
  onPhoneCountryChange: (value: SupportedPhoneCountry) => void
  onPhoneNationalChange: (value: string) => void
}

/** Champs identité communs à l’inscription client et chauffeur. */
export default function AuthSignupIdentityFields({
  prenom,
  nom,
  phoneCountry,
  phoneNational,
  onPrenomChange,
  onNomChange,
  onPhoneCountryChange,
  onPhoneNationalChange,
}: Props) {
  const { t } = useLanguage()
  const dial = PHONE_COUNTRIES.find((c) => c.code === phoneCountry)?.dialCode ?? '+262'

  return (
    <>
      <label className="auth-page-field-label">
        <AuthFieldLabelText required>{t('clientAccount.firstName')}</AuthFieldLabelText>
        <input
          className="auth-page-input"
          type="text"
          value={prenom}
          onChange={(e) => onPrenomChange(e.target.value)}
          placeholder={t('clientAccount.firstName')}
          autoComplete="given-name"
          required
        />
      </label>
      <label className="auth-page-field-label">
        <AuthFieldLabelText required>{t('clientAccount.lastName')}</AuthFieldLabelText>
        <input
          className="auth-page-input"
          type="text"
          value={nom}
          onChange={(e) => onNomChange(e.target.value)}
          placeholder={t('clientAccount.lastName')}
          autoComplete="family-name"
          required
        />
      </label>
      <label className="auth-page-field-label">
        <AuthFieldLabelText required>{t('clientAccount.phone')}</AuthFieldLabelText>
        <div className="auth-page-phone-row">
          <select
            className="auth-page-select auth-page-select--phone-country"
            value={phoneCountry}
            onChange={(e) => onPhoneCountryChange(e.target.value as SupportedPhoneCountry)}
            aria-label={t('chauffeurAuth.signupPhoneDial')}
            required
          >
            {PHONE_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.dialCode}
              </option>
            ))}
          </select>
          <input
            className="auth-page-input"
            type="tel"
            value={phoneNational}
            onChange={(e) => onPhoneNationalChange(e.target.value)}
            placeholder={phoneCountry === 'FR' ? '6 12 34 56 78' : t('chauffeurAuth.signupPhonePlaceholder')}
            autoComplete="tel-national"
            required
          />
        </div>
      </label>
      <p className="auth-page-field-hint">{t('chauffeurAuth.signupPhoneFormatHint', { dial })}</p>
    </>
  )
}
