import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Eye, EyeOff, X } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import ChauffeurSignupWizard from './ChauffeurSignupWizard'
import {
  consumePostPasswordResetLoginHint,
  getCurrentClientUser,
  isClientAuthenticated,
  loginChauffeurOnly,
  requestPasswordReset,
  type AccountRole,
} from '../services/authService'
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
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [helpMessage, setHelpMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)
  const clientAlreadyLogged = isClientAuthenticated()

  useEffect(() => {
    if (consumePostPasswordResetLoginHint() !== 'chauffeur') return
    setMode('login')
    setHelpMessage(t('chauffeurAuth.passwordResetDone'))
  }, [t])

  useEffect(() => {
    if (email.trim()) return
    const clientUser = getCurrentClientUser()
    if (clientUser?.email?.trim()) setEmail(clientUser.email.trim())
  }, [email])

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
    void submitLogin()
  }

  const handleForgotPassword = async () => {
    setError(null)
    setHelpMessage(null)
    const emailTrim = email.trim()
    if (!emailTrim) {
      setError(t('chauffeurAuth.forgotPasswordEmailRequired'))
      return
    }
    setForgotLoading(true)
    const result = await requestPasswordReset('chauffeur', emailTrim)
    setForgotLoading(false)
    if (!result.success) {
      setError(result.error ?? t('chauffeurAuth.errorGeneric'))
      return
    }
    setHelpMessage(t('chauffeurAuth.forgotPasswordSuccess'))
  }

  return (
    <section className={`auth-page-shell${onClose ? ' auth-page-shell--overlay' : ''}`}>
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

        {mode === 'signup' ? (
          <ChauffeurSignupWizard
            initialEmail={email}
            onSuccess={() => onAuthSuccess('chauffeur')}
          />
        ) : (
          <form className="auth-page-grid" onSubmit={handleSubmit}>
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
                autoComplete="current-password"
                required
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
            <button
              className="auth-page-forgot"
              type="button"
              disabled={forgotLoading || loading}
              onClick={() => void handleForgotPassword()}
            >
              {forgotLoading ? t('chauffeurAuth.forgotPasswordSending') : t('chauffeurAuth.forgotPassword')}
            </button>
            {error ? <p className="auth-page-error">{error}</p> : null}
            {helpMessage ? <p className="auth-page-help">{helpMessage}</p> : null}
            <div className="auth-page-actions">
              <button className="auth-page-btn" type="submit" disabled={loading}>
                {loading ? t('chauffeurAuth.submittingLogin') : t('chauffeurAuth.submitLogin')}
              </button>
              <button
                className="auth-page-btn auth-page-btn--ghost"
                type="button"
                onClick={() => {
                  setMode('signup')
                  setError(null)
                }}
              >
                {t('chauffeurAuth.switchToSignup')}
              </button>
            </div>
          </form>
        )}

        {mode === 'signup' ? (
          <div className="auth-page-actions" style={{ marginTop: 12 }}>
            <button
              className="auth-page-btn auth-page-btn--ghost"
              type="button"
              onClick={() => {
                setMode('login')
                setError(null)
              }}
            >
              {t('chauffeurAuth.switchToLogin')}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  )
}
