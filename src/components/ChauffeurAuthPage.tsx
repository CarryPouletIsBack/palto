import { useMemo, useState, type FormEvent } from 'react'
import { login, registerChauffeur } from '../services/authService'
import './AuthPage.css'

type Props = {
  onAuthSuccess: () => void
}

export default function ChauffeurAuthPage({ onAuthSuccess }: Props) {
  const signupDefault = useMemo(
    () => new URLSearchParams(window.location.search).get('chauffeurSignup') === '1',
    []
  )
  const [mode, setMode] = useState<'login' | 'signup'>(signupDefault ? 'signup' : 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [phone, setPhone] = useState('')
  const [vehicleType, setVehicleType] = useState<'berline' | 'utilitaire' | 'moto' | 'scooter'>('berline')
  const [deliveryEquipped, setDeliveryEquipped] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [helpMessage, setHelpMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setLoading(true)
    setError(null)
    setHelpMessage(null)
    const result =
      mode === 'signup'
        ? await registerChauffeur({
            email,
            password,
            phoneInternational: phone,
            vehicleType,
            deliveryEquipped,
          })
        : await login({ email, password })
    setLoading(false)
    if (!result.success) {
      setError(result.error ?? 'Erreur de connexion')
      return
    }
    onAuthSuccess()
  }

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    void submit()
  }

  return (
    <section className="auth-page-shell">
      <div className="auth-page-card">
        <h1 className="auth-page-title">{mode === 'signup' ? 'Creer un compte chauffeur' : 'Connexion chauffeur'}</h1>
        <p className="auth-page-subtitle">Compte chauffeur connecte a la base de donnees.</p>
        <form className="auth-page-grid" onSubmit={handleSubmit}>
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
              {showPassword ? 'Masquer' : 'Afficher'}
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
          {mode === 'signup' ? (
            <>
              <input
                className="auth-page-input"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Telephone international (+262...)"
              />
              <select
                className="auth-page-select"
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value as typeof vehicleType)}
              >
                <option value="berline">Berline</option>
                <option value="utilitaire">Utilitaire</option>
                <option value="moto">Moto</option>
                <option value="scooter">Scooter</option>
              </select>
              <label className="auth-page-checkbox-row">
                <input type="checkbox" checked={deliveryEquipped} onChange={(e) => setDeliveryEquipped(e.target.checked)} />
                Equipe livraison
              </label>
            </>
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
              onClick={() => setMode((m) => (m === 'signup' ? 'login' : 'signup'))}
            >
              {mode === 'signup' ? 'J ai deja un compte' : 'Creer un compte'}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
