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

    // Identifiants autorisés
    const AUTHORIZED_EMAIL = 'merault.anthony@gmail.com';
    const AUTHORIZED_PASSWORD = 'Kylian03?';

    // Vérifier l'email et le mot de passe
    // Si DASHBOARD_PASSWORD est configuré, l'utiliser, sinon utiliser les identifiants par défaut
    const validPassword = DASHBOARD_PASSWORD ? password === DASHBOARD_PASSWORD : password === AUTHORIZED_PASSWORD;
    const validEmail = email === AUTHORIZED_EMAIL;

    if (validEmail && validPassword) {
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
    } else if (!validEmail) {
      return res.status(401).json({
        success: false,
        error: 'Email incorrect',
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
