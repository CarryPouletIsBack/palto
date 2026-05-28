import { useMemo, useState, type FormEvent } from 'react'
import { resetPasswordWithToken, type AccountRole } from '../services/authService'
import './AuthPage.css'

type Props = {
  onDone: (role: AccountRole) => void
}

export default function ResetPasswordPage({ onDone }: Props) {
  const params = useMemo(() => new URLSearchParams(window.location.search), [])
  const roleParam = (params.get('role') || '').trim().toLowerCase()
  const role: AccountRole = roleParam === 'chauffeur' ? 'chauffeur' : 'client'
  const token = (params.get('token') || '').trim()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (!token) {
      setError('Lien invalide: token manquant.')
      return
    }
    if (password.trim().length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    setLoading(true)
    const result = await resetPasswordWithToken(role, token, password)
    setLoading(false)
    if (!result.success) {
      setError(result.error ?? 'Reinitialisation impossible')
      return
    }
    setSuccess('Mot de passe reinitialise. Vous pouvez maintenant vous connecter.')
  }

  return (
    <section className="auth-page-shell">
      <div className="auth-page-card">
        <h1 className="auth-page-title">Reinitialiser le mot de passe</h1>
        <p className="auth-page-subtitle">
          {role === 'chauffeur' ? 'Compte chauffeur' : 'Compte client'} — choisissez un nouveau mot de passe.
        </p>
        <form className="auth-page-grid" onSubmit={handleSubmit}>
          <input
            className="auth-page-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nouveau mot de passe"
            autoComplete="new-password"
            minLength={6}
            required
          />
          <input
            className="auth-page-input"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirmer le mot de passe"
            autoComplete="new-password"
            minLength={6}
            required
          />
          {error ? <p className="auth-page-error">{error}</p> : null}
          {success ? <p className="auth-page-help">{success}</p> : null}
          <div className="auth-page-actions">
            <button className="auth-page-btn" type="submit" disabled={loading}>
              {loading ? 'Validation...' : 'Valider'}
            </button>
            <button
              className="auth-page-btn auth-page-btn--ghost"
              type="button"
              onClick={() => onDone(role)}
            >
              Aller a la connexion
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
