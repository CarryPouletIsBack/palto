/**
 * Endpoint Vercel pour gérer le callback OAuth2 de Google
 * 
 * Ce fichier doit être déployé sur Vercel pour fonctionner.
 * Il échange le code d'autorisation contre un token d'accès.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code } = req.query;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Code d\'autorisation manquant' });
  }

  try {
    // Échanger le code contre un token d'accès
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      console.error('Erreur lors de l\'échange du token:', error);
      return res.status(500).json({ error: 'Erreur lors de l\'authentification' });
    }

    const tokens = await tokenResponse.json();

    // Rediriger vers le dashboard avec les tokens dans l'URL (à sécuriser en production)
    // ⚠️ En production, utilisez plutôt une session ou un cookie sécurisé
    
    // Construire l'URL de redirection correctement
    // Utiliser REDIRECT_URI comme base et remplacer le chemin
    let baseUrl: string;
    
    if (REDIRECT_URI) {
      // Extraire l'origine depuis REDIRECT_URI (ex: https://domain.com/api/...)
      const redirectUriObj = new URL(REDIRECT_URI);
      baseUrl = `${redirectUriObj.protocol}//${redirectUriObj.host}`;
    } else {
      // Fallback : construire depuis les headers
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers.host || process.env.VERCEL_URL || 'localhost:3000';
      baseUrl = host.startsWith('http://') || host.startsWith('https://') 
        ? host 
        : `${protocol}://${host}`;
    }
    
    const redirectUrl = new URL('/dashboard', baseUrl);
    redirectUrl.searchParams.set('access_token', tokens.access_token);
    redirectUrl.searchParams.set('expires_in', tokens.expires_in.toString());
    if (tokens.refresh_token) {
      redirectUrl.searchParams.set('refresh_token', tokens.refresh_token);
    }

    return res.redirect(redirectUrl.toString());
  } catch (error) {
    console.error('Erreur lors du callback OAuth:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
