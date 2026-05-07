import type { VercelRequest, VercelResponse } from '@vercel/node';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.status(500).json({ error: 'Configuration Google OAuth manquante' });
  }

  const { code, redirect_uri } = (req.body ?? {}) as {
    code?: unknown;
    redirect_uri?: unknown;
  };

  if (typeof code !== 'string' || !code.trim()) {
    return res.status(400).json({ error: "Code d'autorisation manquant" });
  }

  const effectiveRedirectUri =
    typeof redirect_uri === 'string' && redirect_uri.trim()
      ? redirect_uri.trim()
      : GOOGLE_REDIRECT_URI;

  if (!effectiveRedirectUri) {
    return res.status(400).json({ error: 'redirect_uri manquant' });
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: code.trim(),
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: effectiveRedirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const body = (await tokenResponse.json().catch(() => ({}))) as {
      access_token?: string;
      expires_in?: number;
      refresh_token?: string;
      scope?: string;
      token_type?: string;
      error?: string;
      error_description?: string;
    };

    if (!tokenResponse.ok) {
      const details = body.error_description || body.error || 'google_token_exchange_failed';
      return res.status(502).json({ error: details });
    }

    return res.status(200).json(body);
  } catch (error) {
    console.error('OAuth token exchange error:', error);
    return res.status(500).json({ error: 'Erreur serveur lors de l’échange OAuth' });
  }
}
