import { useState } from 'react';
import { login } from '../services/authService';
import './Login.css';

interface LoginProps {
  onLoginSuccess: () => void;
}

const Login = ({ onLoginSuccess }: LoginProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await login({ email, password });
      if (result.success) {
        onLoginSuccess();
      } else {
        setError(result.error || 'Erreur de connexion');
      }
    } catch (err) {
      setError('Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Background avec image */}
      <div className="login-background">
        <div className="login-background-overlay"></div>
      </div>

      {/* Contenu principal */}
      <div className="login-main">
        {/* Header avec logo */}
        <div className="login-header">
          <div className="login-logo">
            <img src="/images/logo.svg" alt="Logo" />
          </div>
        </div>

        {/* Formulaire centré */}
        <div className="login-container">
          <div className="login-modal">
            <h2 className="login-title">Se connecter</h2>

            <form onSubmit={handleSubmit} className="login-form">
              {error && (
                <div className="login-error">
                  {error}
                </div>
              )}

              <div className="login-input-group">
                <label htmlFor="email">E-mail*</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="votre@email.com"
                  className="login-input"
                />
              </div>

              <div className="login-input-group">
                <label htmlFor="password">Mot de passe*</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="login-input"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="login-button"
              >
                {isLoading ? 'Connexion...' : 'Se connecter'}
              </button>
            </form>

            <p className="login-footer-text">
              En vous connectant, vous acceptez les{' '}
              <a href="#" className="login-link">Conditions d'Utilisation</a>
              {' '}de Playdago et la{' '}
              <a href="#" className="login-link">Politique de Confidentialité</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
