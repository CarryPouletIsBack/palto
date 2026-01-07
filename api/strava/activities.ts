import type { VercelRequest, VercelResponse } from '@vercel/node';
import { stravaRequest } from './utils';

/**
 * API Route Vercel pour récupérer les activités Strava
 * GET /api/strava/activities?page=1&per_page=10
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Log détaillé pour diagnostic
    const envVars = {
      STRAVA_ACCESS_TOKEN: !!process.env.STRAVA_ACCESS_TOKEN,
      VITE_STRAVA_ACCESS_TOKEN: !!process.env.VITE_STRAVA_ACCESS_TOKEN,
      STRAVA_REFRESH_TOKEN: !!process.env.STRAVA_REFRESH_TOKEN,
      VITE_STRAVA_REFRESH_TOKEN: !!process.env.VITE_STRAVA_REFRESH_TOKEN,
      STRAVA_CLIENT_ID: !!process.env.STRAVA_CLIENT_ID,
      VITE_STRAVA_CLIENT_ID: !!process.env.VITE_STRAVA_CLIENT_ID,
      STRAVA_CLIENT_SECRET: !!process.env.STRAVA_CLIENT_SECRET,
      VITE_STRAVA_CLIENT_SECRET: !!process.env.VITE_STRAVA_CLIENT_SECRET,
    };
    
    console.log('[Strava API] 🔍 Diagnostic des variables d\'environnement:', envVars);

    // Vérification explicite des variables REQUISES
    const hasClientId = !!process.env.STRAVA_CLIENT_ID || !!process.env.VITE_STRAVA_CLIENT_ID;
    const hasClientSecret = !!process.env.STRAVA_CLIENT_SECRET || !!process.env.VITE_STRAVA_CLIENT_SECRET;
    const hasRefreshToken = !!process.env.STRAVA_REFRESH_TOKEN || !!process.env.VITE_STRAVA_REFRESH_TOKEN;

    if (!hasClientId || !hasClientSecret || !hasRefreshToken) {
      const missing = [];
      if (!hasClientId) missing.push('STRAVA_CLIENT_ID');
      if (!hasClientSecret) missing.push('STRAVA_CLIENT_SECRET');
      if (!hasRefreshToken) missing.push('STRAVA_REFRESH_TOKEN');
      
      console.error('[Strava API] ❌ Variables manquantes:', missing);
      return res.status(500).json({ 
        error: 'Variables d\'environnement manquantes sur Vercel',
        missing: missing,
        hint: 'Configurez ces variables dans Vercel → Settings → Environment Variables (sans préfixe VITE_ pour les API routes)',
        envVars: envVars
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.per_page as string) || 10;
    const after = req.query.after as string;
    const before = req.query.before as string;

    let endpoint = `/athlete/activities?page=${page}&per_page=${perPage}`;
    if (after) endpoint += `&after=${after}`;
    if (before) endpoint += `&before=${before}`;

    console.log('[Strava API] ✅ Variables OK, appel Strava:', endpoint);
    const response = await stravaRequest(endpoint);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[Strava API] ❌ Erreur Strava API:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      
      // Gestion spéciale du Rate Limit
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        return res.status(429).json({ 
          error: 'Rate Limit Exceeded - Trop de requêtes Strava',
          message: errorData.message || 'Limite de taux dépassée',
          retryAfter: retryAfter ? parseInt(retryAfter) : null,
          hint: 'Attendez 15 minutes avant de réessayer. Vérifiez vos limites sur https://www.strava.com/settings/api'
        });
      }
      
      res.status(response.status).json({ error: errorData });
      return;
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('[Strava API] Erreur lors de la récupération des activités:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur serveur';
    console.error('[Strava API] Détails de l\'erreur:', {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      envVars: {
        hasClientId: !!process.env.STRAVA_CLIENT_ID || !!process.env.VITE_STRAVA_CLIENT_ID,
        hasClientSecret: !!process.env.STRAVA_CLIENT_SECRET || !!process.env.VITE_STRAVA_CLIENT_SECRET,
        hasRefreshToken: !!process.env.STRAVA_REFRESH_TOKEN || !!process.env.VITE_STRAVA_REFRESH_TOKEN,
      }
    });
    return res.status(500).json({ 
      error: errorMessage,
      hint: 'Vérifiez que les variables d\'environnement Strava sont configurées dans Vercel et que vercel dev a téléchargé les variables (fichier .vercel/.env.local)'
    });
  }
}

