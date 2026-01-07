import type { VercelRequest, VercelResponse } from '@vercel/node';
import { stravaRequest } from '../utils.js';

/**
 * API Route Vercel pour récupérer les statistiques de l'athlète Strava
 * GET /api/strava/athlete/stats?athlete_id=123456
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
    // Vérification des variables d'environnement
    const hasClientId = !!process.env.STRAVA_CLIENT_ID || !!process.env.VITE_STRAVA_CLIENT_ID;
    const hasClientSecret = !!process.env.STRAVA_CLIENT_SECRET || !!process.env.VITE_STRAVA_CLIENT_SECRET;
    const hasRefreshToken = !!process.env.STRAVA_REFRESH_TOKEN || !!process.env.VITE_STRAVA_REFRESH_TOKEN;

    if (!hasClientId || !hasClientSecret || !hasRefreshToken) {
      const missing = [];
      if (!hasClientId) missing.push('STRAVA_CLIENT_ID');
      if (!hasClientSecret) missing.push('STRAVA_CLIENT_SECRET');
      if (!hasRefreshToken) missing.push('STRAVA_REFRESH_TOKEN');
      
      return res.status(500).json({ 
        error: 'Variables d\'environnement manquantes sur Vercel',
        missing: missing,
        hint: 'Configurez ces variables dans Vercel → Settings → Environment Variables'
      });
    }

    const athleteId = req.query.athlete_id as string;

    if (!athleteId) {
      res.status(400).json({ error: 'ID d\'athlète requis (athlete_id)' });
      return;
    }

    const response = await stravaRequest(`/athletes/${athleteId}/stats`);

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
          hint: 'Attendez 15 minutes avant de réessayer'
        });
      }
      
      res.status(response.status).json({ error: errorData });
      return;
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('[Strava API] Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Erreur serveur' 
    });
  }
}

