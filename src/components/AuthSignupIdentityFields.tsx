import { PHONE_COUNTRIES, type SupportedPhoneCountry } from '../services/phoneNumber'

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
  const dial = PHONE_COUNTRIES.find((c) => c.code === phoneCountry)?.dialCode ?? '+262'

  return (
    <>
      <input
        className="auth-page-input"
        type="text"
        value={prenom}
        onChange={(e) => onPrenomChange(e.target.value)}
        placeholder="Prénom"
        autoComplete="given-name"
        required
      />
      <input
        className="auth-page-input"
        type="text"
        value={nom}
        onChange={(e) => onNomChange(e.target.value)}
        placeholder="Nom"
        autoComplete="family-name"
        required
      />
      <div className="auth-page-phone-row">
        <select
          className="auth-page-select auth-page-select--phone-country"
          value={phoneCountry}
          onChange={(e) => onPhoneCountryChange(e.target.value as SupportedPhoneCountry)}
          aria-label="Indicatif pays"
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
          placeholder={phoneCountry === 'FR' ? '6 12 34 56 78' : '692 12 34 56'}
          autoComplete="tel-national"
          required
        />
      </div>
      <p className="auth-page-field-hint">Format attendu : {dial} …</p>
    </>
  )
}
