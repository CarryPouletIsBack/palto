import { useMemo, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { loginClient, registerClient } from '../services/authService'
import './AuthPage.css'

type Props = {
  onAuthSuccess: () => void
}

export default function ClientAuthPage({ onAuthSuccess }: Props) {
  const signupDefault = useMemo(() => new URLSearchParams(window.location.search).get('clientSignup') === '1', [])
  const [mode, setMode] = useState<'login' | 'signup'>(signupDefault ? 'signup' : 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [helpMessage, setHelpMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setLoading(true)
    setError(null)
    setHelpMessage(null)
    const result = mode === 'signup' ? await registerClient({ email, password }) : await loginClient({ email, password })
    setLoading(false)
    if (!result.success) {
      setError(result.error ?? 'Erreur de connexion')
      return
    }
    onAuthSuccess()
  }

  return (
    <section className="auth-page-shell">
      <div className="auth-page-card">
        <h1 className="auth-page-title">{mode === 'signup' ? 'Creer un compte client' : 'Connexion client'}</h1>
        <p className="auth-page-subtitle">Compte client connecte a la base de donnees.</p>
        <div className="auth-page-grid">
          <input
            className="auth-page-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
          />
          <div className="auth-page-password-row">
            <input
              className="auth-page-input"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe"
            />
            <button
              className="auth-page-toggle-visibility"
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
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
            <button className="auth-page-btn" type="button" onClick={submit} disabled={loading}>
              {loading ? 'Chargement...' : mode === 'signup' ? "S'inscrire" : 'Se connecter'}
            </button>
            <button
              className="auth-page-btn auth-page-btn--ghost"
              type="button"
              onClick={() => setMode((m) => (m === 'signup' ? 'login' : 'signup'))}
            >
              {mode === 'signup' ? 'J ai deja un compte' : 'Creer un compte'}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
