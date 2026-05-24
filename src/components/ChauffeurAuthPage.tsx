import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Eye, EyeOff, X } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import AuthSignupIdentityFields from './AuthSignupIdentityFields'
import {
  getCurrentClientUser,
  isClientAuthenticated,
  loginChauffeurOnly,
  registerChauffeur,
  type AccountRole,
} from '../services/authService'
import {
  buildInternationalPhone,
  isValidNationalPhone,
  normalizeNationalPhone,
  type SupportedPhoneCountry,
} from '../services/phoneNumber'
import './AuthPage.css'

type Props = {
  onAuthSuccess: (role: AccountRole) => void
  onClose?: () => void
}

export default function ChauffeurAuthPage({ onAuthSuccess, onClose }: Props) {
  const { t } = useLanguage()
  const signupDefault = useMemo(
    () => new URLSearchParams(window.location.search).get('chauffeurSignup') === '1',
    []
  )
  const [mode, setMode] = useState<'login' | 'signup'>(signupDefault ? 'signup' : 'login')
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [phoneCountry, setPhoneCountry] = useState<SupportedPhoneCountry>('RE')
  const [phoneNational, setPhoneNational] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [vehicleType, setVehicleType] = useState<'berline' | 'utilitaire' | 'moto' | 'scooter'>('berline')
  const [deliveryEquipped, setDeliveryEquipped] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [helpMessage, setHelpMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const clientAlreadyLogged = isClientAuthenticated()

  useEffect(() => {
    if (email.trim()) return
    const clientUser = getCurrentClientUser()
    if (clientUser?.email?.trim()) setEmail(clientUser.email.trim())
  }, [email])

  const submitSignup = async () => {
    const prenomTrim = prenom.trim()
    const nomTrim = nom.trim()
    if (!prenomTrim || !nomTrim) {
      setError(t('chauffeurAuth.errorNameRequired'))
      return
    }
    const normalizedNational = normalizeNationalPhone(phoneCountry, phoneNational)
    if (!isValidNationalPhone(phoneCountry, normalizedNational)) {
      setError(t('chauffeurAuth.errorPhoneInvalid'))
      return
    }
    const phone = buildInternationalPhone(phoneCountry, normalizedNational)

    setLoading(true)
    setError(null)
    const reg = await registerChauffeur({
      email: email.trim(),
      password,
      prenom: prenomTrim,
      nom: nomTrim,
      phone,
      vehicleType,
      deliveryEquipped,
    })
    setLoading(false)
    if (!reg.success) {
      setError(reg.error ?? 'Erreur de connexion')
      return
    }
    onAuthSuccess('chauffeur')
  }

  const submitLogin = async () => {
    setLoading(true)
    setError(null)
    const result = await loginChauffeurOnly({ email, password })
    setLoading(false)
    if (!result.success || result.role !== 'chauffeur') {
      setError(result.error ?? 'Erreur de connexion')
      return
    }
    onAuthSuccess('chauffeur')
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setHelpMessage(null)
    if (mode === 'signup') {
      void submitSignup()
    } else {
      void submitLogin()
    }
  }

  return (
    <section className="auth-page-shell">
      <div className="auth-page-card">
        {onClose ? (
          <button type="button" className="auth-page-close" onClick={onClose} aria-label="Fermer">
            <X size={18} aria-hidden />
          </button>
        ) : null}
        <h1 className="auth-page-title">
          {mode === 'signup' ? t('chauffeurAuth.titleSignup') : t('chauffeurAuth.titleLogin')}
        </h1>
        <p className="auth-page-subtitle">
          {clientAlreadyLogged
            ? t('chauffeurAuth.subtitleClientParallel')
            : mode === 'signup'
              ? t('chauffeurAuth.subtitleSignup')
              : t('chauffeurAuth.subtitleLogin')}
        </p>
        <form className="auth-page-grid" onSubmit={handleSubmit}>
          {mode === 'signup' ? (
            <>
              <AuthSignupIdentityFields
                prenom={prenom}
                nom={nom}
                phoneCountry={phoneCountry}
                phoneNational={phoneNational}
                onPrenomChange={setPrenom}
                onNomChange={setNom}
                onPhoneCountryChange={setPhoneCountry}
                onPhoneNationalChange={setPhoneNational}
              />
              <label className="auth-page-field-label">
                {t('chauffeurAuth.vehicleTypeLabel')}
                <select
                  className="auth-page-select"
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value as typeof vehicleType)}
                >
                  <option value="berline">{t('chauffeurAuth.vehicleBerline')}</option>
                  <option value="utilitaire">{t('chauffeurAuth.vehicleUtilitaire')}</option>
                  <option value="moto">{t('chauffeurAuth.vehicleMoto')}</option>
                  <option value="scooter">{t('chauffeurAuth.vehicleScooter')}</option>
                </select>
              </label>
              <label className="auth-page-checkbox-row">
                <input type="checkbox" checked={deliveryEquipped} onChange={(e) => setDeliveryEquipped(e.target.checked)} />
                {t('chauffeurAuth.deliveryEquippedLabel')}
              </label>
            </>
          ) : null}
          <input
            className="auth-page-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('chauffeurAuth.email')}
            autoComplete="email"
            required
          />
          <div className="auth-page-password-row">
            <input
              className="auth-page-input"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('chauffeurAuth.password')}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              required
              minLength={mode === 'signup' ? 6 : undefined}
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
          {mode === 'login' ? (
            <button
              className="auth-page-forgot"
              type="button"
              onClick={() =>
                setHelpMessage("Lien de reinitialisation bientot disponible. Contacte le support pour le moment.")
              }
            >
              Mot de passe oublie ?
            </button>
          ) : null}
          {error ? <p className="auth-page-error">{error}</p> : null}
          {helpMessage ? <p className="auth-page-help">{helpMessage}</p> : null}
          <div className="auth-page-actions">
            <button className="auth-page-btn" type="submit" disabled={loading}>
              {loading
                ? mode === 'signup'
                  ? t('chauffeurAuth.submittingSignup')
                  : t('chauffeurAuth.submittingLogin')
                : mode === 'signup'
                  ? t('chauffeurAuth.submitSignup')
                  : t('chauffeurAuth.submitLogin')}
            </button>
            <button
              className="auth-page-btn auth-page-btn--ghost"
              type="button"
              onClick={() => {
                setMode((m) => (m === 'signup' ? 'login' : 'signup'))
                setError(null)
              }}
            >
              {mode === 'signup' ? t('chauffeurAuth.switchToLogin') : t('chauffeurAuth.switchToSignup')}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
