import type { VercelRequest, VercelResponse } from '@vercel/node';
import { stravaRequest } from '../utils';

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
    const athleteId = req.query.athlete_id as string;

    if (!athleteId) {
      res.status(400).json({ error: 'ID d\'athlète requis (athlete_id)' });
      return;
    }

    const response = await stravaRequest(`/athletes/${athleteId}/stats`);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[Strava API] Erreur:', errorData);
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

