/**
 * Utilitaires pour gérer les tokens Strava côté serveur
 */

// Fonction helper pour nettoyer les valeurs (retirer les guillemets)
function getEnvVar(key: string): string {
  const value = process.env[key] || '';
  // Retirer les guillemets si présents (Vercel peut les inclure depuis .env.local)
  if ((value.startsWith('"') && value.endsWith('"')) || 
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

// Charger les variables d'environnement
const STRAVA_CLIENT_ID = getEnvVar('VITE_STRAVA_CLIENT_ID') || getEnvVar('STRAVA_CLIENT_ID') || '';
const STRAVA_CLIENT_SECRET = getEnvVar('VITE_STRAVA_CLIENT_SECRET') || getEnvVar('STRAVA_CLIENT_SECRET') || '';
const STRAVA_REFRESH_TOKEN = getEnvVar('VITE_STRAVA_REFRESH_TOKEN') || getEnvVar('STRAVA_REFRESH_TOKEN') || '';
const STRAVA_ACCESS_TOKEN = getEnvVar('VITE_STRAVA_ACCESS_TOKEN') || getEnvVar('STRAVA_ACCESS_TOKEN') || '';
const STRAVA_TOKEN_EXPIRES_AT = parseInt(
  getEnvVar('VITE_STRAVA_TOKEN_EXPIRES_AT') || 
  getEnvVar('STRAVA_TOKEN_EXPIRES_AT') || 
  getEnvVar('STRAVA_EXPIRES_AT') || 
  '0'
);

// Log des variables au chargement (pour debug) - seulement si on est dans un contexte Node.js
if (typeof process !== 'undefined' && process.env) {
  try {
    console.log('[Strava API] Variables chargées:', {
      hasClientId: !!STRAVA_CLIENT_ID,
      hasClientSecret: !!STRAVA_CLIENT_SECRET,
      hasRefreshToken: !!STRAVA_REFRESH_TOKEN,
      hasAccessToken: !!STRAVA_ACCESS_TOKEN,
      expiresAt: STRAVA_TOKEN_EXPIRES_AT,
      clientIdLength: STRAVA_CLIENT_ID.length,
      envKeys: Object.keys(process.env).filter(k => k.includes('STRAVA')).join(', ')
    });
  } catch (e) {
    // Ignorer les erreurs de log
  }
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
  token_type: string;
}

/**
 * Récupère un token valide (rafraîchit si nécessaire)
 */
export async function getValidToken(): Promise<string> {
  // Vérifier que les variables d'environnement sont configurées
  if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET) {
    throw new Error('STRAVA_CLIENT_ID ou STRAVA_CLIENT_SECRET non configuré. Vérifiez vos variables d\'environnement Vercel.');
  }
  
  const now = Math.floor(Date.now() / 1000);
  
  // Vérifier si le token est encore valide (avec une marge de 60 secondes)
  if (STRAVA_TOKEN_EXPIRES_AT && now < STRAVA_TOKEN_EXPIRES_AT - 60 && STRAVA_ACCESS_TOKEN) {
    return STRAVA_ACCESS_TOKEN;
  }

  // Token expiré → refresh
  console.log('[Strava API] Token expiré, rafraîchissement en cours...');
  
  if (!STRAVA_REFRESH_TOKEN) {
    throw new Error('STRAVA_REFRESH_TOKEN non configuré. Vérifiez vos variables d\'environnement Vercel.');
  }

  try {
    // Utiliser fetch global (disponible dans Node.js 18+ et Vercel)
    // Vercel utilise Node.js 18+ donc fetch devrait être disponible
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: STRAVA_REFRESH_TOKEN
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData.message || 'Erreur inconnue';
      throw new Error(`Erreur lors du rafraîchissement: ${errorMessage}`);
    }

    const data: TokenResponse = await response.json();
    
    console.log('[Strava API] ✅ Token rafraîchi avec succès');
    console.log(`[Strava API] Expire dans ${data.expires_at - now} secondes`);
    
    // ⚠️ Note: En production, vous devriez stocker les nouveaux tokens dans Vercel Environment Variables
    // ou utiliser un service de stockage externe (comme Vercel KV ou une base de données)
    
    return data.access_token;
  } catch (error) {
    console.error('[Strava API] ❌ Erreur lors du rafraîchissement:', error);
    throw error;
  }
}

/**
 * Fait une requête vers l'API Strava avec gestion automatique du token
 */
export async function stravaRequest(endpoint: string): Promise<Response> {
  const token = await getValidToken();
  const url = `https://www.strava.com/api/v3${endpoint}`;
  
  // Utiliser fetch global (disponible dans Node.js 18+ et Vercel)
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  return response;
}

