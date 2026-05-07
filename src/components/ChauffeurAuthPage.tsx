import { useMemo, useState } from 'react'
import { login, registerChauffeur } from '../services/authService'

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
  const [phone, setPhone] = useState('')
  const [vehicleType, setVehicleType] = useState<'berline' | 'utilitaire' | 'moto' | 'scooter'>('berline')
  const [deliveryEquipped, setDeliveryEquipped] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setLoading(true)
    setError(null)
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

  return (
    <section className="dashboard-main" style={{ maxWidth: 560, margin: '40px auto', padding: 24 }}>
      <h1 style={{ marginBottom: 8 }}>{mode === 'signup' ? 'Creer un compte chauffeur' : 'Connexion chauffeur'}</h1>
      <p style={{ opacity: 0.75, marginBottom: 16 }}>Compte chauffeur connecte a la base de donnees.</p>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        style={{ width: '100%', marginBottom: 10, padding: 10 }}
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Mot de passe"
        style={{ width: '100%', marginBottom: 10, padding: 10 }}
      />
      {mode === 'signup' ? (
        <>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Telephone international (+262...)"
            style={{ width: '100%', marginBottom: 10, padding: 10 }}
          />
          <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value as typeof vehicleType)} style={{ width: '100%', marginBottom: 10, padding: 10 }}>
            <option value="berline">Berline</option>
            <option value="utilitaire">Utilitaire</option>
            <option value="moto">Moto</option>
            <option value="scooter">Scooter</option>
          </select>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
            <input type="checkbox" checked={deliveryEquipped} onChange={(e) => setDeliveryEquipped(e.target.checked)} />
            Equipe livraison
          </label>
        </>
      ) : null}
      {error ? <p style={{ color: '#b3261e', marginBottom: 10 }}>{error}</p> : null}
      <button type="button" onClick={submit} disabled={loading} style={{ padding: '10px 14px' }}>
        {loading ? 'Chargement...' : mode === 'signup' ? "S'inscrire" : 'Se connecter'}
      </button>
      <button
        type="button"
        onClick={() => setMode((m) => (m === 'signup' ? 'login' : 'signup'))}
        style={{ marginLeft: 12, padding: '10px 14px' }}
      >
        {mode === 'signup' ? 'J ai deja un compte' : 'Creer un compte'}
      </button>
    </section>
  )
}
