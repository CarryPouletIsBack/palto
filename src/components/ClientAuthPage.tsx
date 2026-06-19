import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import AuthSignupIdentityFields from './AuthSignupIdentityFields'
import { useLanguage } from '../contexts/LanguageContext'
import {
  consumePostPasswordResetLoginHint,
  loginClient,
  registerClient,
  requestPasswordReset,
  type AccountRole,
} from '../services/authService'
import {
  buildInternationalPhone,
  isValidNationalPhone,
  normalizeNationalPhone,
  type SupportedPhoneCountry,
} from '../services/phoneNumber'
import './AuthPage.css'
import { AuthPagePhotoBackground } from './AuthPagePhotoBackground'
import { AuthPageRoleTabs } from './AuthPageRoleTabs'
import { AuthPageCloseButton } from './AuthPageCloseButton'
import { AuthOAuthButtons } from './AuthOAuthButtons'

type Props = {
  onAuthSuccess: (role: AccountRole) => void
  onClose?: () => void
  onSwitchToChauffeur?: () => void
}

export default function ClientAuthPage({ onAuthSuccess, onClose, onSwitchToChauffeur }: Props) {
  const { t } = useLanguage()
  const signupDefault = useMemo(() => new URLSearchParams(window.location.search).get('clientSignup') === '1', [])
  const [mode, setMode] = useState<'login' | 'signup'>(signupDefault ? 'signup' : 'login')
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [phoneCountry, setPhoneCountry] = useState<SupportedPhoneCountry>('RE')
  const [phoneNational, setPhoneNational] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [helpMessage, setHelpMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)

  useEffect(() => {
    if (consumePostPasswordResetLoginHint() !== 'client') return
    setMode('login')
    setHelpMessage(t('clientAuth.passwordResetDone'))
  }, [t])

  const submitSignup = async () => {
    const prenomTrim = prenom.trim()
    const nomTrim = nom.trim()
    if (!prenomTrim || !nomTrim) {
      setError('Prénom et nom sont requis.')
      return
    }
    const normalizedNational = normalizeNationalPhone(phoneCountry, phoneNational)
    if (!isValidNationalPhone(phoneCountry, normalizedNational)) {
      setError(
        phoneCountry === 'FR'
          ? 'Numéro invalide (France) : 9 chiffres attendus après +33.'
          : 'Numéro invalide (Réunion) : format attendu type 692… ou 262… après +262.'
      )
      return
    }
    const phone = buildInternationalPhone(phoneCountry, normalizedNational)

    setLoading(true)
    setError(null)
    const reg = await registerClient({
      email: email.trim(),
      password,
      prenom: prenomTrim,
      nom: nomTrim,
      phone,
    })
    setLoading(false)
    if (!reg.success) {
      setError(reg.error ?? 'Erreur de connexion')
      return
    }
    onAuthSuccess('client')
  }

  const submitLogin = async () => {
    setLoading(true)
    setError(null)
    const result = await loginClient({ email, password })
    setLoading(false)
    if (!result.success || !result.role) {
      setError(
        result.error === 'OAUTH_ACCOUNT_USE_SOCIAL'
          ? t('authOAuth.errorUseSocial')
          : (result.error ?? 'Erreur de connexion')
      )
      return
    }
    onAuthSuccess(result.role)
  }

  const handleForgotPassword = async () => {
    setError(null)
    setHelpMessage(null)
    const emailTrim = email.trim()
    if (!emailTrim) {
      setError(t('clientAuth.forgotPasswordEmailRequired'))
      return
    }
    setForgotLoading(true)
    const result = await requestPasswordReset('client', emailTrim)
    setForgotLoading(false)
    if (!result.success) {
      setError(result.error ?? t('clientAuth.errorGeneric'))
      return
    }
    setHelpMessage(t('clientAuth.forgotPasswordSuccess'))
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
    <section
      className={`auth-page-shell auth-page-shell--client auth-page-shell--photo-bg${
        onClose ? ' auth-page-shell--overlay' : ''
      }`}
    >
      <AuthPagePhotoBackground />
      {onClose ? (
        <AuthPageCloseButton
          onClose={onClose}
          ariaLabel={t('clientAuth.closeAria')}
          overlayFixed={Boolean(onClose)}
        />
      ) : null}
      <div className="auth-page-stack">
        <AuthPageRoleTabs
          activeRole="client"
          clientLabel={t('clientAuth.roleClient')}
          chauffeurLabel={t('clientAuth.roleChauffeur')}
          onSelectChauffeur={onSwitchToChauffeur}
        />
        <div className="auth-page-card">
        <h1 className="auth-page-title">{mode === 'signup' ? 'Creer un compte client' : 'Connexion client'}</h1>
        <p className="auth-page-subtitle">
          Compte client Palto uniquement. Le compte chauffeur est séparé (autre mot de passe) : espace chauffeur via
          le menu Palto Chauffeur.
        </p>
        <form className="auth-page-grid" onSubmit={handleSubmit}>
          <AuthOAuthButtons role="client" mode={mode} />
          {mode === 'signup' ? (
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
          ) : null}
          <input
            className="auth-page-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            autoComplete="email"
            required
          />
          <div className="auth-page-password-row">
            <input
              className="auth-page-input"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe"
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
              disabled={forgotLoading || loading}
              onClick={() => void handleForgotPassword()}
            >
              {forgotLoading ? t('clientAuth.forgotPasswordSending') : t('clientAuth.forgotPassword')}
            </button>
          ) : null}
          {error ? <p className="auth-page-error">{error}</p> : null}
          {helpMessage ? <p className="auth-page-help">{helpMessage}</p> : null}
          <div className="auth-page-actions">
            <button className="auth-page-btn" type="submit" disabled={loading}>
              {loading ? 'Chargement...' : mode === 'signup' ? "S'inscrire" : 'Se connecter'}
            </button>
            <button
              className="auth-page-btn auth-page-btn--ghost"
              type="button"
              onClick={() => {
                setMode((m) => (m === 'signup' ? 'login' : 'signup'))
                setError(null)
              }}
            >
              {mode === 'signup' ? "J'ai deja un compte" : 'Creer un compte'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </section>
  )
}
