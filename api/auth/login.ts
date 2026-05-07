import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * API Route Vercel pour l'authentification du dashboard
 * POST /api/auth/login
 *
 * Variables requises : DASHBOARD_EMAIL, DASHBOARD_PASSWORD (sans préfixe VITE_).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email et mot de passe requis',
      })
    }

    const DASHBOARD_EMAIL = process.env.DASHBOARD_EMAIL?.trim()
    const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD?.trim()

    if (!DASHBOARD_EMAIL || !DASHBOARD_PASSWORD) {
      console.error('[Auth API] DASHBOARD_EMAIL ou DASHBOARD_PASSWORD manquant')
      return res.status(500).json({
        success: false,
        error: 'Configuration serveur incomplète',
      })
    }

    const validEmail = email === DASHBOARD_EMAIL
    const validPassword = password === DASHBOARD_PASSWORD

    if (validEmail && validPassword) {
      const token = Buffer.from(`${email}:${Date.now()}`).toString('base64')

      return res.status(200).json({
        success: true,
        user: {
          email,
          displayName: email.split('@')[0],
        },
        token,
      })
    }
    if (!validEmail) {
      return res.status(401).json({
        success: false,
        error: 'Email incorrect',
      })
    }
    return res.status(401).json({
      success: false,
      error: 'Mot de passe incorrect',
    })
  } catch (error) {
    console.error('[Auth API] Erreur:', error)
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur',
    })
  }
}
