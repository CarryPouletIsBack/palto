/**
 * Google OAuth : callback (GET), échange code (POST), refresh (POST).
 * Une seule fonction Vercel pour respecter la limite Hobby (12 fonctions).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || ''

function actionFromReq(req: VercelRequest): string {
  const q = req.query.action
  const v = Array.isArray(q) ? q[0] : q
  return typeof v === 'string' ? v.trim() : ''
}

async function handleCallback(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { code } = req.query
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: "Code d'autorisation manquant" })
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json()
      console.error('Erreur lors de l échange du token:', error)
      return res.status(500).json({ error: 'Erreur lors de l authentification' })
    }

    const tokens = await tokenResponse.json()

    let baseUrl: string
    if (REDIRECT_URI) {
      try {
        const redirectUriObj = new URL(REDIRECT_URI)
        baseUrl = `${redirectUriObj.protocol}//${redirectUriObj.host}`
      } catch {
        const protocol = req.headers['x-forwarded-proto'] || 'https'
        const host = req.headers.host || process.env.VERCEL_URL || 'localhost:3000'
        baseUrl =
          host.startsWith('http://') || host.startsWith('https://') ? host : `${protocol}://${host}`
      }
    } else {
      const protocol = req.headers['x-forwarded-proto'] || 'https'
      const host = req.headers.host || process.env.VERCEL_URL || 'localhost:3000'
      baseUrl =
        host.startsWith('http://') || host.startsWith('https://') ? host : `${protocol}://${host}`
    }

    const redirectUrl = new URL('/dashboard', baseUrl)
    redirectUrl.searchParams.set('access_token', tokens.access_token)
    redirectUrl.searchParams.set('expires_in', tokens.expires_in.toString())
    if (tokens.refresh_token) {
      redirectUrl.searchParams.set('refresh_token', tokens.refresh_token)
    }
    return res.redirect(redirectUrl.toString())
  } catch (error) {
    console.error('Erreur lors du callback OAuth:', error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
}

async function handleToken(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.status(500).json({ error: 'Configuration Google OAuth manquante' })
  }

  const { code, redirect_uri } = (req.body ?? {}) as {
    code?: unknown
    redirect_uri?: unknown
  }

  if (typeof code !== 'string' || !code.trim()) {
    return res.status(400).json({ error: "Code d'autorisation manquant" })
  }

  const effectiveRedirectUri =
    typeof redirect_uri === 'string' && redirect_uri.trim() ? redirect_uri.trim() : REDIRECT_URI

  if (!effectiveRedirectUri) {
    return res.status(400).json({ error: 'redirect_uri manquant' })
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code.trim(),
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: effectiveRedirectUri,
        grant_type: 'authorization_code',
      }),
    })

    const body = (await tokenResponse.json().catch(() => ({}))) as {
      access_token?: string
      expires_in?: number
      refresh_token?: string
      scope?: string
      token_type?: string
      error?: string
      error_description?: string
    }

    if (!tokenResponse.ok) {
      const details = body.error_description || body.error || 'google_token_exchange_failed'
      return res.status(502).json({ error: details })
    }

    return res.status(200).json(body)
  } catch (error) {
    console.error('OAuth token exchange error:', error)
    return res.status(500).json({ error: 'Erreur serveur lors de l échange OAuth' })
  }
}

async function handleRefresh(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { refresh_token } = req.body as { refresh_token?: string }
  if (!refresh_token) {
    return res.status(400).json({ error: 'Refresh token manquant' })
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        grant_type: 'refresh_token',
      }),
    })

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json()
      console.error('Erreur lors du rafraîchissement du token:', error)
      return res.status(500).json({ error: 'Erreur lors du rafraîchissement' })
    }

    const tokens = await tokenResponse.json()
    return res.status(200).json(tokens)
  } catch (error) {
    console.error('Erreur lors du refresh:', error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = actionFromReq(req)
  switch (action) {
    case 'callback':
      return handleCallback(req, res)
    case 'token':
      return handleToken(req, res)
    case 'refresh':
      return handleRefresh(req, res)
    default:
      return res.status(404).json({ error: 'Not found' })
  }
}
