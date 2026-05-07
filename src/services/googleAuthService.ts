/**
 * Service d'authentification OAuth2 pour Google Analytics
 * 
 * Pour utiliser ce service, vous devez :
 * 1. Créer un projet dans Google Cloud Console
 * 2. Activer l'API Google Analytics Data API
 * 3. Créer des identifiants OAuth 2.0
 * 4. Configurer l'URI de redirection autorisée
 */

// ⚠️ IMPORTANT : Remplacez ces valeurs par vos propres identifiants depuis Google Cloud Console
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const REDIRECT_URI = import.meta.env.VITE_GOOGLE_REDIRECT_URI || window.location.origin + '/api/google-auth/callback';

// Scopes nécessaires pour Google Analytics
const SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/analytics',
].join(' ');

// URL d'autorisation Google OAuth2
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

export interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
}

/**
 * Génère l'URL d'autorisation OAuth2
 */
export function getAuthUrl(): string {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error(
      'GOOGLE_CLIENT_ID n\'est pas configuré. ' +
      'Veuillez définir la variable d\'environnement VITE_GOOGLE_CLIENT_ID dans votre fichier .env.local'
    );
  }

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline', // Pour obtenir un refresh token
    prompt: 'consent', // Force la demande de consentement pour obtenir le refresh token
  });

  return `${AUTH_URL}?${params.toString()}`;
}

/**
 * Échange le code d'autorisation contre un token d'accès
 * ⚠️ Cette fonction doit être appelée côté serveur pour des raisons de sécurité
 */
export async function exchangeCodeForToken(code: string): Promise<TokenResponse> {
  // ⚠️ ATTENTION : Cette fonction ne devrait PAS être appelée côté client
  // car elle nécessite le CLIENT_SECRET qui ne doit jamais être exposé.
  // Utilisez plutôt un endpoint backend pour cette opération.
  
  const response = await fetch('/api/google-auth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code, redirect_uri: REDIRECT_URI }),
  });

  if (!response.ok) {
    throw new Error('Erreur lors de l\'échange du code contre un token');
  }

  return response.json();
}

/**
 * Rafraîchit un token d'accès expiré
 * ⚠️ Cette fonction doit être appelée côté serveur
 */
export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  // ⚠️ ATTENTION : Cette fonction ne devrait PAS être appelée côté client
  // Utilisez plutôt un endpoint backend pour cette opération.
  
  const response = await fetch('/api/google-auth/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    throw new Error('Erreur lors du rafraîchissement du token');
  }

  return response.json();
}

/**
 * Vérifie si un token est valide
 */
export function isTokenValid(): boolean {
  const token = localStorage.getItem('google_analytics_access_token');
  const tokenExpiry = localStorage.getItem('google_analytics_token_expiry');
  
  if (!token || !tokenExpiry) {
    return false;
  }

  const expiryTime = parseInt(tokenExpiry, 10);
  const now = Date.now();
  
  // Vérifier si le token expire dans moins de 5 minutes
  return expiryTime > now + 5 * 60 * 1000;
}

/**
 * Sauvegarde le token dans le localStorage
 */
export function saveToken(tokenResponse: TokenResponse): void {
  localStorage.setItem('google_analytics_access_token', tokenResponse.access_token);
  
  // Calculer la date d'expiration
  const expiryTime = Date.now() + (tokenResponse.expires_in * 1000);
  localStorage.setItem('google_analytics_token_expiry', expiryTime.toString());
  
  if (tokenResponse.refresh_token) {
    localStorage.setItem('google_analytics_refresh_token', tokenResponse.refresh_token);
  }
}

/**
 * Récupère le token d'accès depuis le localStorage
 */
export function getAccessToken(): string | null {
  if (isTokenValid()) {
    return localStorage.getItem('google_analytics_access_token');
  }
  
  // Si le token est expiré, essayer de le rafraîchir
  const refreshToken = localStorage.getItem('google_analytics_refresh_token');
  if (refreshToken) {
    // ⚠️ Cette opération doit être faite côté serveur
    // Pour l'instant, on retourne null et on demandera une nouvelle authentification
    return null;
  }
  
  return null;
}

/**
 * Déconnecte l'utilisateur (supprime les tokens)
 */
export function logout(): void {
  localStorage.removeItem('google_analytics_access_token');
  localStorage.removeItem('google_analytics_token_expiry');
  localStorage.removeItem('google_analytics_refresh_token');
}

/**
 * Vérifie si l'utilisateur est authentifié
 */
export function isAuthenticated(): boolean {
  return isTokenValid() || !!localStorage.getItem('google_analytics_refresh_token');
}

/**
 * Gère la redirection après l'authentification OAuth2
 * À appeler depuis la page de redirection
 */
export function handleAuthCallback(): void {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const error = urlParams.get('error');

  if (error) {
    console.error('Erreur d\'authentification:', error);
    return;
  }

  if (code) {
    // Le code doit être échangé contre un token côté serveur
    // Rediriger vers une page qui gère cet échange
    window.location.href = `/api/google-auth/callback?code=${code}`;
  }
}
