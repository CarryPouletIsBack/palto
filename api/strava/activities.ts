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
    // Log pour diagnostic
    console.log('[Strava API] Token utilisé:', !!process.env.STRAVA_ACCESS_TOKEN || !!process.env.VITE_STRAVA_ACCESS_TOKEN);
    
    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.per_page as string) || 10;
    const after = req.query.after as string;
    const before = req.query.before as string;

    let endpoint = `/athlete/activities?page=${page}&per_page=${perPage}`;
    if (after) endpoint += `&after=${after}`;
    if (before) endpoint += `&before=${before}`;

    const response = await stravaRequest(endpoint);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[Strava API] Erreur:', errorData);
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

