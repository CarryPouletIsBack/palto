import { useMemo, useState } from 'react'
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
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setLoading(true)
    setError(null)
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
          <input
            className="auth-page-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe"
          />
          {error ? <p className="auth-page-error">{error}</p> : null}
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
