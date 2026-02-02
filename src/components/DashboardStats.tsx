import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Eye, MousePointerClick, Loader2, LogIn, LogOut } from 'lucide-react';
import './DashboardStats.css';
import { 
  getBasicStats, 
  getRealtimeStats, 
  formatPropertyId,
  type GoogleAnalyticsConfig 
} from '../services/googleAnalyticsService';
import { 
  getAuthUrl, 
  isAuthenticated, 
  saveToken, 
  logout as authLogout,
  getAccessToken 
} from '../services/googleAuthService';

interface DashboardStatsProps {
  googleAnalyticsId?: string;
}

const DashboardStats = ({ googleAnalyticsId }: DashboardStatsProps) => {
  const [selectedView, setSelectedView] = useState<'overview' | 'realtime'>('overview');
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking');
  const [statsData, setStatsData] = useState({
    visitors: { value: '0', change: '0%' },
    pageViews: { value: '0', change: '0%' },
    bounceRate: { value: '0%', change: '0%' },
    avgSession: { value: '0s', change: '0%' },
  });
  const [realtimeData, setRealtimeData] = useState({
    activeUsers: 0,
  });

  useEffect(() => {
    // Vérifier l'état d'authentification
    const authenticated = isAuthenticated();
    setAuthStatus(authenticated ? 'authenticated' : 'unauthenticated');
    
    // Vérifier si Google Analytics est configuré
    // ⚠️ IMPORTANT : L'API nécessite un Property ID NUMÉRIQUE (ex: "123456789")
    // Pas un Measurement ID (ex: "G-MS120551E9")
    const savedPropertyId = localStorage.getItem('google_analytics_property_id');
    const oldGAId = localStorage.getItem('google_analytics_id');
    
    // Nettoyer l'ancien Measurement ID si présent
    if (oldGAId && (oldGAId.startsWith('G-') || !/^\d+$/.test(oldGAId))) {
      localStorage.removeItem('google_analytics_id');
    }
    
    // Property ID numérique configuré
    const defaultGAId = '383170814'; // Property ID numérique
    const defaultGTId = 'GT-KDDTXMS'; // ID Google Tag/Measurement (pour le tracking, pas pour l'API)
    
    // Utiliser l'ID sauvegardé (uniquement Property ID numérique), celui passé en prop, ou l'ID par défaut
    // Vérifier que savedPropertyId est bien numérique
    const validSavedId = savedPropertyId && /^\d+$/.test(savedPropertyId) ? savedPropertyId : null;
    const gaId = validSavedId || (googleAnalyticsId && /^\d+$/.test(googleAnalyticsId) ? googleAnalyticsId : null) || defaultGAId;
    
    if (gaId) {
      // Sauvegarder l'ID par défaut s'il n'y en a pas d'autre
      if (!validSavedId && !googleAnalyticsId) {
        localStorage.setItem('google_analytics_property_id', defaultGAId);
      }
      // Sauvegarder aussi l'ID GT si fourni
      if (defaultGTId) {
        localStorage.setItem('google_tag_id', defaultGTId);
      }
      setIsConfigured(true);
      
      // Charger les données si authentifié
      if (authenticated) {
        loadGoogleAnalytics(gaId);
      }
    }
    
    // Vérifier si on revient de l'authentification OAuth
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('access_token');
    const expiresIn = urlParams.get('expires_in');
    const refreshToken = urlParams.get('refresh_token');
    
    if (accessToken && expiresIn) {
      // Décoder le refresh_token si présent (URLSearchParams le décode automatiquement)
      const decodedRefreshToken = refreshToken ? decodeURIComponent(refreshToken) : undefined;
      
      saveToken({
        access_token: accessToken,
        expires_in: parseInt(expiresIn, 10),
        refresh_token: decodedRefreshToken,
        scope: '',
        token_type: 'Bearer',
      });
      
      // Nettoyer l'URL immédiatement (garder seulement ?page=dashboard si présent)
      const currentPath = window.location.pathname;
      const hasPageParam = window.location.search.includes('page=dashboard');
      const cleanUrl = hasPageParam ? `${currentPath}?page=dashboard` : currentPath;
      window.history.replaceState({}, document.title, cleanUrl);
      
      // Recharger les données
      setAuthStatus('authenticated');
      if (gaId) {
        loadGoogleAnalytics(gaId);
      }
    }
  }, [googleAnalyticsId]);

  const handleLogin = () => {
    try {
      const authUrl = getAuthUrl();
      window.location.href = authUrl;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la génération de l\'URL d\'authentification';
      setError(errorMessage);
      console.error('Erreur OAuth2:', err);
    }
  };

  const handleLogout = () => {
    authLogout();
    setAuthStatus('unauthenticated');
    setStatsData({
      visitors: { value: '0', change: '0%' },
      pageViews: { value: '0', change: '0%' },
      bounceRate: { value: '0%', change: '0%' },
      avgSession: { value: '0s', change: '0%' },
    });
  };

  const loadGoogleAnalytics = async (gaId: string) => {
    // Vérifier si un token d'accès est disponible
    const accessToken = getAccessToken();
    
    if (!accessToken) {
      setAuthStatus('unauthenticated');
      return;
    }

    // Charger les données réelles depuis l'API
    setIsLoading(true);
    setError(null);

    try {
      const config: GoogleAnalyticsConfig = {
        propertyId: gaId,
        accessToken: accessToken,
      };

      if (selectedView === 'overview') {
        const basicStats = await getBasicStats(config, 30);
        const formattedStats = {
          visitors: { 
            value: basicStats.activeUsers.toLocaleString('fr-FR'), 
            change: '+0%' // TODO: Calculer le changement par rapport à la période précédente
          },
          pageViews: { 
            value: basicStats.screenPageViews.toLocaleString('fr-FR'), 
            change: '+0%' 
          },
          bounceRate: { 
            value: `${(basicStats.bounceRate * 100).toFixed(1)}%`, 
            change: '0%' 
          },
          avgSession: { 
            value: formatDuration(basicStats.averageSessionDuration), 
            change: '0%' 
          },
        };
        setStatsData(formattedStats);
      } else {
        const realtimeStats = await getRealtimeStats(config);
        setRealtimeData({
          activeUsers: realtimeStats.activeUsers,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement des données';
      setError(errorMessage);
      console.error('Erreur Google Analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Formater la durée en secondes en format lisible
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Charger les données quand la vue change
  useEffect(() => {
    const savedPropertyId = localStorage.getItem('google_analytics_property_id');
    const defaultGAId = '383170814'; // Property ID numérique
    
    // Vérifier que googleAnalyticsId est numérique si fourni
    const validPropId = googleAnalyticsId && /^\d+$/.test(googleAnalyticsId) ? googleAnalyticsId : null;
    const gaId = validPropId || (savedPropertyId && /^\d+$/.test(savedPropertyId) ? savedPropertyId : defaultGAId);
    
    if (isConfigured && gaId) {
      loadGoogleAnalytics(gaId);
    }
  }, [selectedView, isConfigured, googleAnalyticsId]);

  if (!isConfigured) {
    return (
      <div className="dashboard-stats-container">
        <div className="stats-config-prompt">
          <BarChart3 size={48} className="stats-icon" />
          <h2>Configurer Google Analytics</h2>
          <div className="stats-info-box">
            <p><strong>IDs configurés :</strong></p>
            <ul className="stats-ids-list">
              <li><strong>Google Tag Manager :</strong> GTM-MJ9VW6G4</li>
              <li><strong>Google Analytics Property ID :</strong> 383170814</li>
              <li><strong>Google Analytics Measurement ID :</strong> G-MS120551E9 (pour le tracking)</li>
              <li><strong>Google Tag/Measurement :</strong> GT-KDDTXMS</li>
            </ul>
            <p>Vos identifiants sont configurés. Les statistiques seront disponibles une fois l'intégration API complète.</p>
          </div>
          <div className="stats-config-form">
            <input
              type="text"
              placeholder="123456789 (Property ID numérique uniquement)"
              className="stats-ga-input"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  const input = e.target as HTMLInputElement;
                  if (input.value) {
                    // Vérifier que c'est un Property ID numérique
                    if (!/^\d+$/.test(input.value)) {
                      setError('Le Property ID doit être uniquement des chiffres (ex: 123456789). Voir le guide ci-dessous.');
                      return;
                    }
                    localStorage.setItem('google_analytics_property_id', input.value);
                    setIsConfigured(true);
                    loadGoogleAnalytics(input.value);
                  }
                }
              }}
            />
            <button
              onClick={(e) => {
                const input = (e.target as HTMLElement).parentElement?.querySelector('input') as HTMLInputElement;
                if (input?.value) {
                  // Vérifier que c'est un Property ID numérique
                  if (!/^\d+$/.test(input.value)) {
                    setError('Le Property ID doit être uniquement des chiffres (ex: 123456789). Voir le guide ci-dessous.');
                    return;
                  }
                  localStorage.setItem('google_analytics_property_id', input.value);
                  setIsConfigured(true);
                  loadGoogleAnalytics(input.value);
                }
              }}
              className="stats-config-button"
            >
              Configurer
            </button>
          </div>
          <div className="stats-help-section">
            <p className="stats-help-title">⚠️ IMPORTANT : Property ID numérique requis</p>
            <p className="stats-help-text" style={{ marginBottom: '16px' }}>
              L'API Google Analytics Data nécessite un <strong>Property ID NUMÉRIQUE</strong> (ex: <code>123456789</code>), 
              <strong>PAS</strong> un Measurement ID (ex: <code>G-MS120551E9</code>).
            </p>
            <p className="stats-help-title">Comment trouver votre Property ID numérique :</p>
            <ol className="stats-help-list">
              <li>Connectez-vous à <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer">Google Analytics</a></li>
              <li>Allez dans <strong>Administration</strong> (icône d'engrenage) → <strong>Propriété</strong></li>
              <li>Dans <strong>Informations sur la propriété</strong>, cherchez <strong>ID de propriété</strong></li>
              <li>C'est un nombre uniquement (ex: <code>123456789</code>)</li>
              <li>⚠️ <strong>Ne confondez pas</strong> avec l'<strong>ID de mesure</strong> (G-XXXXX) qui est pour le tracking</li>
            </ol>
            <p className="stats-help-text" style={{ marginTop: '16px' }}>
              Voir <a href="https://github.com/CarryPouletIsBack/portfolio-react-anthony/blob/main/GOOGLE_ANALYTICS_PROPERTY_ID.md" target="_blank" rel="noopener noreferrer">le guide complet</a> pour plus d'aide.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-stats-container">
      <div className="stats-header">
        <h2 className="stats-title">Statistiques du site</h2>
        <div className="stats-header-actions">
          {authStatus === 'authenticated' ? (
            <button onClick={handleLogout} className="stats-auth-button logout">
              <LogOut size={16} /> Déconnexion
            </button>
          ) : (
            <button onClick={handleLogin} className="stats-auth-button login">
              <LogIn size={16} /> Se connecter à Google Analytics
            </button>
          )}
          <div className="stats-view-toggle">
            <button
              className={selectedView === 'overview' ? 'active' : ''}
              onClick={() => setSelectedView('overview')}
            >
              Vue d'ensemble
            </button>
            <button
              className={selectedView === 'realtime' ? 'active' : ''}
              onClick={() => setSelectedView('realtime')}
            >
              Temps réel
            </button>
          </div>
        </div>
      </div>

      {authStatus === 'unauthenticated' && (
        <div className="stats-auth-prompt">
          <LogIn size={48} className="stats-auth-icon" />
          <h3>Authentification requise</h3>
          <p>Pour afficher vos statistiques Google Analytics, vous devez vous connecter avec votre compte Google.</p>
          
          {!import.meta.env.VITE_GOOGLE_CLIENT_ID && (
            <div className="stats-config-warning">
              <p><strong>⚠️ Configuration manquante</strong></p>
              <p>La variable d'environnement <code>VITE_GOOGLE_CLIENT_ID</code> n'est pas définie.</p>
              
              {window.location.hostname.includes('vercel.app') || window.location.hostname.includes('vercel') ? (
                <>
                  <p><strong>Configuration Vercel (Production) :</strong></p>
                  <p>Allez dans votre projet Vercel → <strong>Settings</strong> → <strong>Environment Variables</strong> et ajoutez :</p>
                  <pre className="stats-code-block">
{`VITE_GOOGLE_CLIENT_ID=votre_client_id_ici
VITE_GOOGLE_REDIRECT_URI=${window.location.origin}/api/google-auth/callback`}
                  </pre>
                  <p>⚠️ <strong>Important</strong> : Utilisez le préfixe <code>VITE_</code> car cette variable est utilisée côté client.</p>
                </>
              ) : (
                <>
                  <p><strong>Configuration locale (Développement) :</strong></p>
                  <p>Créez un fichier <code>.env.local</code> à la racine du projet avec :</p>
                  <pre className="stats-code-block">
{`VITE_GOOGLE_CLIENT_ID=votre_client_id_ici
VITE_GOOGLE_REDIRECT_URI=${window.location.origin}/api/google-auth/callback`}
                  </pre>
                </>
              )}
              
              <p>Consultez <code>GOOGLE_ANALYTICS_SETUP.md</code> pour plus d'informations.</p>
            </div>
          )}
          
          <button 
            onClick={handleLogin} 
            className="stats-auth-button-large"
            disabled={!import.meta.env.VITE_GOOGLE_CLIENT_ID}
          >
            <LogIn size={20} /> Se connecter à Google Analytics
          </button>
          <p className="stats-auth-help">
            Vous serez redirigé vers Google pour autoriser l'accès à vos données Analytics.
          </p>
        </div>
      )}

      {error && (
        <div className="stats-error">
          <p>⚠️ {error}</p>
          {error.includes('API Google Analytics Data API n\'est pas activée') && (
            <div className="stats-error-actions">
              <a 
                href="https://console.developers.google.com/apis/api/analyticsdata.googleapis.com/overview?project=416597900962" 
                target="_blank" 
                rel="noopener noreferrer"
                className="stats-error-link"
              >
                Activer l'API dans Google Cloud Console →
              </a>
              <p className="stats-error-help">
                Voir <a href="https://github.com/CarryPouletIsBack/portfolio-react-anthony/blob/main/GOOGLE_ANALYTICS_API_ACTIVATION.md" target="_blank" rel="noopener noreferrer">le guide d'activation</a> pour plus d'aide.
              </p>
            </div>
          )}
          {error.includes('authentification OAuth2') && (
            <div className="stats-error-actions">
              <button onClick={handleLogin} className="stats-auth-button login">
                <LogIn size={16} /> Se connecter à Google Analytics
              </button>
            </div>
          )}
          {!error.includes('API Google Analytics Data API n\'est pas activée') && !error.includes('authentification OAuth2') && (
            <p className="stats-error-help">
              Pour utiliser l'API Google Analytics, vous devez configurer l'authentification OAuth2.
              Le token d'accès doit être stocké dans <code>localStorage</code> avec la clé <code>google_analytics_access_token</code>.
            </p>
          )}
        </div>
      )}

      {selectedView === 'realtime' ? (
        <div className="stats-realtime">
          <div className="stats-card">
            <div className="stats-card-icon visitors">
              <Users size={24} />
            </div>
            <div className="stats-card-content">
              <p className="stats-card-label">Utilisateurs actifs</p>
              <p className="stats-card-value">
                {isLoading ? <Loader2 className="animate-spin" size={24} /> : realtimeData.activeUsers.toLocaleString('fr-FR')}
              </p>
              <p className="stats-card-change">En temps réel</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="stats-cards-grid">
          <div className="stats-card">
            <div className="stats-card-icon visitors">
              <Users size={24} />
            </div>
            <div className="stats-card-content">
              <p className="stats-card-label">Visiteurs</p>
              <p className="stats-card-value">
                {isLoading ? <Loader2 className="animate-spin" size={24} /> : statsData.visitors.value}
              </p>
              <p className="stats-card-change positive">{statsData.visitors.change}</p>
            </div>
          </div>

          <div className="stats-card">
            <div className="stats-card-icon views">
              <Eye size={24} />
            </div>
            <div className="stats-card-content">
              <p className="stats-card-label">Pages vues</p>
              <p className="stats-card-value">
                {isLoading ? <Loader2 className="animate-spin" size={24} /> : statsData.pageViews.value}
              </p>
              <p className="stats-card-change positive">{statsData.pageViews.change}</p>
            </div>
          </div>

          <div className="stats-card">
            <div className="stats-card-icon bounce">
              <TrendingUp size={24} />
            </div>
            <div className="stats-card-content">
              <p className="stats-card-label">Taux de rebond</p>
              <p className="stats-card-value">
                {isLoading ? <Loader2 className="animate-spin" size={24} /> : statsData.bounceRate.value}
              </p>
              <p className="stats-card-change negative">{statsData.bounceRate.change}</p>
            </div>
          </div>

          <div className="stats-card">
            <div className="stats-card-icon session">
              <MousePointerClick size={24} />
            </div>
            <div className="stats-card-content">
              <p className="stats-card-label">Durée moyenne</p>
              <p className="stats-card-value">
                {isLoading ? <Loader2 className="animate-spin" size={24} /> : statsData.avgSession.value}
              </p>
              <p className="stats-card-change positive">{statsData.avgSession.change}</p>
            </div>
          </div>
        </div>
      )}

      {/* Graphique des statistiques - Afficher seulement si pas de données ou erreur */}
      {(!isLoading && statsData.visitors.value === '0' && authStatus === 'authenticated') ? (
        <div className="stats-chart-container">
          <div className="stats-chart-placeholder">
            <BarChart3 size={48} />
            <p>Graphique des statistiques</p>
            <p className="stats-note">
              Aucune donnée disponible pour les 30 derniers jours. Les statistiques apparaîtront ici une fois que vous aurez du trafic.
            </p>
          </div>
        </div>
      ) : authStatus !== 'authenticated' ? (
        <div className="stats-chart-container">
          <div className="stats-chart-placeholder">
            <BarChart3 size={48} />
            <p>Graphique des statistiques</p>
            <p className="stats-note">
              Pour afficher les données réelles, configurez l'authentification Google Analytics API.
            </p>
          </div>
        </div>
      ) : null}

      {/* Informations de configuration - Afficher seulement si pas authentifié */}
      {authStatus !== 'authenticated' && (
        <div className="stats-iframe-container">
          <div className="stats-iframe-placeholder">
            <BarChart3 size={48} />
            <p>Intégration Google Analytics</p>
            <p className="stats-note">
              <strong>Authentification requise :</strong> Pour afficher les données réelles, vous devez configurer l'authentification OAuth2 avec Google Analytics.
              <br />
              <br />
              <strong>IDs configurés :</strong>
              <br />
              • Google Analytics Property ID: {localStorage.getItem('google_analytics_property_id') || '383170814'}
              <br />
              • Google Tag: {localStorage.getItem('google_tag_id') || 'GT-KDDTXMS'}
              <br />
              <br />
              <strong>Documentation API :</strong> <a href="https://developers.google.com/analytics/devguides/reporting/data/v1" target="_blank" rel="noopener noreferrer">Google Analytics Data API</a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardStats;
