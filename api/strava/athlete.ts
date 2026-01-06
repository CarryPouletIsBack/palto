import type { VercelRequest, VercelResponse } from '@vercel/node';
import { stravaRequest } from './utils';

/**
 * API Route Vercel pour récupérer les informations de l'athlète Strava
 * GET /api/strava/athlete
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers pour permettre les requêtes depuis le frontend
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
    // Log pour diagnostic
    console.log('[Strava API] Token utilisé:', !!process.env.STRAVA_ACCESS_TOKEN || !!process.env.VITE_STRAVA_ACCESS_TOKEN);
    console.log('[Strava API] Variables disponibles:', {
      hasAccessToken: !!process.env.STRAVA_ACCESS_TOKEN || !!process.env.VITE_STRAVA_ACCESS_TOKEN,
      hasRefreshToken: !!process.env.STRAVA_REFRESH_TOKEN || !!process.env.VITE_STRAVA_REFRESH_TOKEN,
      hasClientId: !!process.env.STRAVA_CLIENT_ID || !!process.env.VITE_STRAVA_CLIENT_ID,
      hasClientSecret: !!process.env.STRAVA_CLIENT_SECRET || !!process.env.VITE_STRAVA_CLIENT_SECRET,
    });

    const response = await stravaRequest('/athlete');

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[Strava API] Erreur:', errorData);
      res.status(response.status).json({ error: errorData });
      return;
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('[Strava API] Erreur lors de la récupération de l\'athlète:', error);
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

