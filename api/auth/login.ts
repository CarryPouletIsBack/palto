import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * API Route Vercel pour l'authentification du dashboard
 * POST /api/auth/login
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Email et mot de passe requis' 
      });
    }

    // Récupérer le mot de passe depuis les variables d'environnement
    // Dans Vercel, utilisez DASHBOARD_PASSWORD (sans VITE_)
    const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || process.env.VITE_DASHBOARD_PASSWORD;

    if (!DASHBOARD_PASSWORD) {
      console.error('[Auth API] ❌ DASHBOARD_PASSWORD non configuré');
      return res.status(500).json({ 
        success: false,
        error: 'Configuration serveur manquante' 
      });
    }

    // Vérifier le mot de passe
    if (password === DASHBOARD_PASSWORD) {
      // Générer un token simple (en production, utilisez JWT)
      const token = Buffer.from(`${email}:${Date.now()}`).toString('base64');
      
      return res.status(200).json({
        success: true,
        user: {
          email,
          displayName: email.split('@')[0],
        },
        token,
      });
    } else {
      return res.status(401).json({
        success: false,
        error: 'Mot de passe incorrect',
      });
    }
  } catch (error) {
    console.error('[Auth API] ❌ Erreur:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur',
    });
  }
}
